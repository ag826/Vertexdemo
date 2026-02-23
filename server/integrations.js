const { randomUUID } = require('crypto');
const { withDb, loadDb, nowIso } = require('./store');

const SUPPORTED_PROVIDERS = ['slack', 'discord', 'telegram'];

function assertSupportedProvider(provider) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    const error = new Error('Unsupported provider');
    error.statusCode = 400;
    throw error;
  }
}

function sanitizeIntegration(integration) {
  if (!integration) {
    return null;
  }
  const masked = { ...integration };
  masked.credentials = {
    ...integration.credentials,
    token: integration.credentials?.token ? '***' : undefined,
    botToken: integration.credentials?.botToken ? '***' : undefined,
  };
  return masked;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return normalizeText(value);
}

function normalizeUsername(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function createBigrams(value) {
  const input = normalizeText(value).replace(/\s+/g, '');
  if (input.length <= 2) {
    return input ? [input] : [];
  }
  const grams = [];
  for (let i = 0; i < input.length - 1; i += 1) {
    grams.push(input.slice(i, i + 2));
  }
  return grams;
}

function diceSimilarity(a, b) {
  const left = createBigrams(a);
  const right = createBigrams(b);
  if (!left.length || !right.length) {
    return 0;
  }
  const counts = new Map();
  for (const gram of left) {
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  let overlap = 0;
  for (const gram of right) {
    const count = counts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (left.length + right.length);
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Provider request failed: ${response.status}`);
    error.statusCode = 502;
    error.providerResponse = payload;
    throw error;
  }

  return payload;
}

function ensureContactShape(contact) {
  if (!Array.isArray(contact.keyFacts)) {
    contact.keyFacts = [];
  }
  if (!Array.isArray(contact.funFacts)) {
    contact.funFacts = [];
  }
  if (!Array.isArray(contact.suggestedActions)) {
    contact.suggestedActions = [];
  }
  if (!Array.isArray(contact.externalProfiles)) {
    contact.externalProfiles = [];
  }
  if (!Array.isArray(contact.emails)) {
    contact.emails = [];
  }
}

async function pullSlackData(integration) {
  const token = integration.credentials?.token;
  if (!token) {
    const error = new Error('Slack token is required');
    error.statusCode = 400;
    throw error;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const membersPayload = await fetchJson('https://slack.com/api/users.list?limit=200', { headers });
  if (!membersPayload.ok) {
    const error = new Error(`Slack users.list failed: ${membersPayload.error || 'unknown_error'}`);
    error.statusCode = 502;
    throw error;
  }

  const teamPayload = await fetchJson('https://slack.com/api/team.info', { headers }).catch(() => null);

  const company = teamPayload?.team?.name || 'Slack Workspace';
  const location = teamPayload?.team?.domain ? `${teamPayload.team.domain}.slack.com` : 'Slack';

  const members = (membersPayload.members || []).filter((member) => !member.deleted && !member.is_bot && member.id);

  const participants = members.map((member) => {
    const profile = member.profile || {};
    const displayName = profile.real_name || profile.display_name || member.name || 'Unknown';
    return {
      externalId: member.id,
      name: displayName,
      title: profile.title || 'Slack Member',
      company,
      location,
      avatar: profile.image_512 || profile.image_192 || profile.image_72 || '',
      profileUrl: profile.team ? `https://${profile.team}.slack.com/team/${member.id}` : '',
      notes: `Imported from Slack workspace ${company}.`,
      source: 'Slack API',
      username: member.name || profile.display_name || '',
      email: profile.email || '',
    };
  });

  let channels = integration.config?.channelIds;
  if (!Array.isArray(channels) || channels.length === 0) {
    const channelsPayload = await fetchJson(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel,im,mpim&limit=50',
      { headers },
    );
    if (channelsPayload.ok) {
      channels = (channelsPayload.channels || []).map((channel) => channel.id).filter(Boolean);
    } else {
      channels = [];
    }
  }

  const messages = [];

  for (const channelId of channels || []) {
    const historyPayload = await fetchJson(
      `https://slack.com/api/conversations.history?channel=${encodeURIComponent(channelId)}&limit=100`,
      { headers },
    ).catch(() => null);

    if (!historyPayload || !historyPayload.ok) {
      continue;
    }

    const channelName = historyPayload.channel?.name || channelId;

    for (const message of historyPayload.messages || []) {
      if (!message?.user || !message?.ts || !message?.text) {
        continue;
      }
      messages.push({
        externalMessageId: `${channelId}:${message.ts}`,
        externalContactId: message.user,
        channelId,
        channelName,
        text: message.text,
        timestamp: new Date(Number(message.ts.split('.')[0]) * 1000).toISOString(),
        raw: message,
      });
    }
  }

  return { participants, messages, nextCursor: undefined };
}

async function pullDiscordData(integration) {
  const token = integration.credentials?.botToken;
  const guildId = integration.config?.guildId;

  if (!token) {
    const error = new Error('Discord botToken is required');
    error.statusCode = 400;
    throw error;
  }

  if (!guildId) {
    const error = new Error('Discord guildId is required');
    error.statusCode = 400;
    throw error;
  }

  const headers = { Authorization: `Bot ${token}` };
  const guild = await fetchJson(`https://discord.com/api/v10/guilds/${guildId}`, { headers });
  const members = await fetchJson(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, { headers });

  const participants = (members || [])
    .filter((member) => member?.user?.id && !member?.user?.bot)
    .map((member) => {
      const user = member.user;
      const displayName = member.nick || user.global_name || user.username || 'Unknown';
      const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : '';

      return {
        externalId: user.id,
        name: displayName,
        title: 'Discord Member',
        company: guild?.name || 'Discord Server',
        location: 'Discord',
        avatar,
        profileUrl: '',
        notes: `Imported from Discord server ${(guild && guild.name) || guildId}.`,
        source: 'Discord API',
        username: user.username || '',
        email: '',
      };
    });

  let channelIds = integration.config?.channelIds;
  if (!Array.isArray(channelIds) || channelIds.length === 0) {
    const channels = await fetchJson(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers }).catch(() => []);
    channelIds = (channels || [])
      .filter((channel) => channel.type === 0)
      .map((channel) => channel.id)
      .filter(Boolean)
      .slice(0, 25);
  }

  const channelNameMap = {};
  const messages = [];

  for (const channelId of channelIds || []) {
    const channel = await fetchJson(`https://discord.com/api/v10/channels/${channelId}`, { headers }).catch(() => null);
    if (channel) {
      channelNameMap[channelId] = channel.name || channelId;
    }

    const channelMessages = await fetchJson(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=100`,
      { headers },
    ).catch(() => []);

    for (const message of channelMessages || []) {
      if (!message?.id || !message?.author?.id || !message?.content) {
        continue;
      }
      if (message.author.bot) {
        continue;
      }
      messages.push({
        externalMessageId: message.id,
        externalContactId: message.author.id,
        channelId,
        channelName: channelNameMap[channelId] || channelId,
        text: message.content,
        timestamp: message.timestamp || nowIso(),
        raw: message,
      });
    }
  }

  return { participants, messages, nextCursor: undefined };
}

async function pullTelegramData(integration) {
  const token = integration.credentials?.botToken;
  if (!token) {
    const error = new Error('Telegram botToken is required');
    error.statusCode = 400;
    throw error;
  }

  const offset = integration.config?.updateOffset;
  const updatesUrl = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  updatesUrl.searchParams.set('timeout', '1');
  updatesUrl.searchParams.set('limit', '100');
  if (offset) {
    updatesUrl.searchParams.set('offset', String(offset));
  }

  const updatesPayload = await fetchJson(updatesUrl.toString());
  if (!updatesPayload.ok) {
    const error = new Error('Telegram getUpdates failed');
    error.statusCode = 502;
    throw error;
  }

  const participantMap = {};
  const messages = [];
  let maxUpdateId = offset || 0;

  for (const update of updatesPayload.result || []) {
    maxUpdateId = Math.max(maxUpdateId, Number(update.update_id || 0));

    const message = update.message || update.edited_message || update.channel_post;
    if (!message) {
      continue;
    }

    const from = message.from || null;
    const chat = message.chat || null;

    const externalContactId = from?.id ? String(from.id) : chat?.id ? String(chat.id) : null;
    if (!externalContactId) {
      continue;
    }

    if (!participantMap[externalContactId]) {
      const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ');
      const displayName = fullName || chat?.title || from?.username || chat?.username || externalContactId;
      participantMap[externalContactId] = {
        externalId: externalContactId,
        name: displayName,
        title: 'Telegram Contact',
        company: 'Telegram',
        location: 'Telegram',
        avatar: '',
        profileUrl: from?.username ? `https://t.me/${from.username}` : chat?.username ? `https://t.me/${chat.username}` : '',
        notes: 'Imported from Telegram updates feed.',
        source: 'Telegram Bot API',
        username: from?.username || chat?.username || '',
        email: '',
      };
    }

    if (message.text) {
      messages.push({
        externalMessageId: `${message.chat?.id || 'chat'}:${message.message_id}`,
        externalContactId,
        channelId: String(chat?.id || externalContactId),
        channelName: chat?.title || chat?.username || participantMap[externalContactId].name,
        text: message.text,
        timestamp: message.date ? new Date(Number(message.date) * 1000).toISOString() : nowIso(),
        raw: message,
      });
    }
  }

  return {
    participants: Object.values(participantMap),
    messages,
    nextCursor: maxUpdateId ? maxUpdateId + 1 : offset,
  };
}

async function fetchProviderData(integration) {
  switch (integration.provider) {
    case 'slack':
      return pullSlackData(integration);
    case 'discord':
      return pullDiscordData(integration);
    case 'telegram':
      return pullTelegramData(integration);
    default:
      return { participants: [], messages: [] };
  }
}

function scoreContactCandidate(contact, participant) {
  ensureContactShape(contact);

  const participantEmail = normalizeEmail(participant.email);
  const participantUsername = normalizeUsername(participant.username);
  const participantName = normalizeText(participant.name);

  let score = 0;
  const reasons = [];

  const emailMatch = participantEmail
    ? contact.emails.some((email) => normalizeEmail(email) === participantEmail)
    : false;
  if (emailMatch) {
    score = Math.max(score, 1.0);
    reasons.push('email_exact');
  }

  const usernameMatch = participantUsername
    ? contact.externalProfiles.some((profile) => normalizeUsername(profile.username) === participantUsername)
    : false;
  if (usernameMatch) {
    score = Math.max(score, 0.92);
    reasons.push('username_exact');
  }

  const nameScore = diceSimilarity(contact.name, participantName);
  if (nameScore > 0) {
    score = Math.max(score, nameScore * 0.88);
    if (nameScore >= 0.75) {
      reasons.push('name_similar');
    }
  }

  return {
    contactId: contact.id,
    score,
    reasons,
    nameScore,
  };
}

function findExactExternalProfile(db, userId, provider, externalId) {
  return db.contacts.find((contact) => {
    if (contact.userId !== userId) {
      return false;
    }
    ensureContactShape(contact);
    return contact.externalProfiles.some(
      (profile) => profile.provider === provider && profile.externalId === externalId,
    );
  });
}

function findExistingOpenPending(db, userId, provider, participant) {
  return (db.pendingMatches || []).find(
    (match) =>
      match.userId === userId &&
      match.provider === provider &&
      match.externalId === participant.externalId &&
      match.status === 'pending',
  );
}

function createPendingMatch(db, userId, provider, participant, candidates) {
  if (!Array.isArray(db.pendingMatches)) {
    db.pendingMatches = [];
  }

  const existing = findExistingOpenPending(db, userId, provider, participant);
  if (existing) {
    existing.candidates = candidates;
    existing.participant = {
      ...participant,
      normalizedName: normalizeText(participant.name),
      normalizedUsername: normalizeUsername(participant.username),
      normalizedEmail: normalizeEmail(participant.email),
    };
    existing.updatedAt = nowIso();
    return existing;
  }

  const pending = {
    id: randomUUID(),
    userId,
    provider,
    externalId: participant.externalId,
    participant: {
      ...participant,
      normalizedName: normalizeText(participant.name),
      normalizedUsername: normalizeUsername(participant.username),
      normalizedEmail: normalizeEmail(participant.email),
    },
    candidates,
    status: 'pending',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.pendingMatches.push(pending);
  return pending;
}

function attachProfileToContact(contact, provider, participant) {
  ensureContactShape(contact);

  const now = nowIso();
  const existingProfile = contact.externalProfiles.find(
    (profile) => profile.provider === provider && profile.externalId === participant.externalId,
  );

  if (!existingProfile) {
    contact.externalProfiles.push({
      provider,
      externalId: participant.externalId,
      username: participant.username || '',
      lastSyncedAt: now,
    });
  } else {
    existingProfile.username = participant.username || existingProfile.username;
    existingProfile.lastSyncedAt = now;
  }

  if (participant.email) {
    const normalized = normalizeEmail(participant.email);
    if (!contact.emails.some((email) => normalizeEmail(email) === normalized)) {
      contact.emails.push(participant.email);
    }
  }

  contact.name = contact.name || participant.name;
  contact.title = contact.title || participant.title;
  contact.company = contact.company || participant.company;
  contact.location = contact.location || participant.location;
  contact.profileImage = contact.profileImage || participant.avatar;
  contact.updatedAt = now;
}

function createContactFromParticipant(userId, provider, participant) {
  const now = nowIso();
  return {
    id: randomUUID(),
    userId,
    name: participant.name,
    title: participant.title || `${provider} contact`,
    company: participant.company || provider,
    location: participant.location || provider,
    linkedInUrl: participant.profileUrl || '',
    profileImage: participant.avatar || '',
    dateAdded: now.slice(0, 10),
    notes: participant.notes || `Imported from ${provider}.`,
    keyFacts: [
      {
        id: randomUUID(),
        text: `Connected via ${provider}`,
        source: 'Social Media',
        category: 'Background',
        createdAt: now,
      },
    ],
    funFacts: [],
    suggestedActions: [
      {
        id: randomUUID(),
        type: 'follow-up',
        title: `Follow up with ${participant.name}`,
        description: `Send an intro message on ${provider}.`,
        priority: 'medium',
        createdAt: now,
      },
    ],
    conversationDuration: '0:00',
    externalProfiles: [
      {
        provider,
        externalId: participant.externalId,
        username: participant.username || '',
        lastSyncedAt: now,
      },
    ],
    emails: participant.email ? [participant.email] : [],
    createdAt: now,
    updatedAt: now,
  };
}

function resolveParticipantContact(db, userId, provider, participant, promptOnUncertainMatch) {
  const exact = findExactExternalProfile(db, userId, provider, participant.externalId);
  if (exact) {
    attachProfileToContact(exact, provider, participant);
    return { status: 'updated', contactId: exact.id };
  }

  const candidates = db.contacts
    .filter((contact) => contact.userId === userId)
    .map((contact) => ({
      contact,
      score: scoreContactCandidate(contact, participant),
    }))
    .filter((entry) => entry.score.score > 0)
    .sort((a, b) => b.score.score - a.score.score);

  const top = candidates[0];
  const second = candidates[1];

  if (top && (top.score.score >= 0.97 || (top.score.score >= 0.86 && (!second || top.score.score - second.score.score >= 0.1)))) {
    attachProfileToContact(top.contact, provider, participant);
    return { status: 'linked', contactId: top.contact.id, autoLinked: true };
  }

  if (top && promptOnUncertainMatch) {
    const serializedCandidates = candidates.slice(0, 5).map((entry) => ({
      contactId: entry.contact.id,
      contactName: entry.contact.name,
      score: Number(entry.score.score.toFixed(3)),
      reasons: entry.score.reasons,
      title: entry.contact.title,
      company: entry.contact.company,
    }));

    const pending = createPendingMatch(db, userId, provider, participant, serializedCandidates);

    return {
      status: 'pending',
      pendingMatchId: pending.id,
      candidateCount: serializedCandidates.length,
    };
  }

  const created = createContactFromParticipant(userId, provider, participant);
  db.contacts.unshift(created);
  return { status: 'created', contactId: created.id };
}

function resolveParticipants(db, userId, provider, participants, options = {}) {
  const promptOnUncertainMatch = options.promptOnUncertainMatch !== false;

  const summary = {
    created: 0,
    updated: 0,
    linked: 0,
    pending: 0,
    scanned: participants.length,
  };

  for (const participant of participants) {
    const result = resolveParticipantContact(db, userId, provider, participant, promptOnUncertainMatch);
    if (result.status === 'created') {
      summary.created += 1;
    }
    if (result.status === 'updated') {
      summary.updated += 1;
    }
    if (result.status === 'linked') {
      summary.linked += 1;
    }
    if (result.status === 'pending') {
      summary.pending += 1;
    }
  }

  return summary;
}

function buildExternalContactMap(db, userId, provider) {
  const map = {};
  for (const contact of db.contacts) {
    if (contact.userId !== userId) {
      continue;
    }
    ensureContactShape(contact);
    for (const profile of contact.externalProfiles) {
      if (profile.provider === provider && profile.externalId) {
        map[profile.externalId] = contact;
      }
    }
  }
  return map;
}

function upsertMessagesFromProvider(db, userId, provider, messages) {
  if (!Array.isArray(db.messages)) {
    db.messages = [];
  }

  const contactMap = buildExternalContactMap(db, userId, provider);
  const existingByExternalMessageId = new Set(
    db.messages
      .filter((message) => message.userId === userId && message.provider === provider)
      .map((message) => message.externalMessageId),
  );

  let created = 0;
  let skipped = 0;

  for (const message of messages) {
    if (!message.externalMessageId || existingByExternalMessageId.has(message.externalMessageId)) {
      skipped += 1;
      continue;
    }

    const contact = contactMap[message.externalContactId] || null;

    db.messages.push({
      id: randomUUID(),
      userId,
      provider,
      externalMessageId: message.externalMessageId,
      externalContactId: message.externalContactId,
      contactId: contact?.id || null,
      channelId: message.channelId || null,
      channelName: message.channelName || null,
      text: message.text || '',
      timestamp: message.timestamp || nowIso(),
      raw: message.raw || null,
      createdAt: nowIso(),
    });

    created += 1;
  }

  return {
    created,
    skipped,
    scanned: messages.length,
  };
}

function listIntegrations(userId) {
  const db = loadDb();
  return (db.integrations || [])
    .filter((integration) => integration.userId === userId)
    .map((integration) => sanitizeIntegration(integration));
}

function connectIntegration(userId, provider, payload) {
  assertSupportedProvider(provider);

  return withDb((db) => {
    if (!Array.isArray(db.integrations)) {
      db.integrations = [];
    }

    let integration = db.integrations.find((entry) => entry.userId === userId && entry.provider === provider);

    const now = nowIso();
    const credentials = {
      token: payload.token,
      botToken: payload.botToken,
    };

    const config = {
      guildId: payload.guildId,
      chatIds: Array.isArray(payload.chatIds) ? payload.chatIds : integration?.config?.chatIds,
      channelIds: Array.isArray(payload.channelIds) ? payload.channelIds : integration?.config?.channelIds,
      label: payload.label,
      updateOffset: integration?.config?.updateOffset,
      promptOnUncertainMatch: payload.promptOnUncertainMatch !== false,
    };

    if (!integration) {
      integration = {
        id: randomUUID(),
        userId,
        provider,
        status: 'connected',
        credentials,
        config,
        lastSyncAt: null,
        lastSyncStats: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      db.integrations.push(integration);
    } else {
      integration.credentials = {
        ...integration.credentials,
        ...credentials,
      };
      integration.config = {
        ...integration.config,
        ...config,
      };
      integration.status = 'connected';
      integration.updatedAt = now;
      integration.lastError = null;
    }

    db.auditEvents.push({
      id: randomUUID(),
      userId,
      type: 'integration.connected',
      entityType: 'integration',
      entityId: integration.id,
      data: { provider },
      createdAt: now,
    });

    return sanitizeIntegration(integration);
  });
}

function disconnectIntegration(userId, provider) {
  assertSupportedProvider(provider);

  return withDb((db) => {
    if (!Array.isArray(db.integrations)) {
      db.integrations = [];
    }

    const integration = db.integrations.find((entry) => entry.userId === userId && entry.provider === provider);
    if (!integration) {
      return null;
    }

    integration.status = 'disconnected';
    integration.credentials = {};
    integration.updatedAt = nowIso();

    db.auditEvents.push({
      id: randomUUID(),
      userId,
      type: 'integration.disconnected',
      entityType: 'integration',
      entityId: integration.id,
      data: { provider },
      createdAt: nowIso(),
    });

    return sanitizeIntegration(integration);
  });
}

async function syncIntegration(userId, provider, options = {}) {
  assertSupportedProvider(provider);

  const db = loadDb();
  const integration = (db.integrations || []).find((entry) => entry.userId === userId && entry.provider === provider);

  if (!integration || integration.status !== 'connected') {
    const error = new Error('Integration not connected');
    error.statusCode = 404;
    throw error;
  }

  const data = await fetchProviderData(integration);

  return withDb((nextDb) => {
    if (!Array.isArray(nextDb.integrations)) {
      nextDb.integrations = [];
    }

    const current = nextDb.integrations.find((entry) => entry.id === integration.id);
    if (!current) {
      const error = new Error('Integration not found during sync');
      error.statusCode = 404;
      throw error;
    }

    const promptOnUncertainMatch =
      options.promptOnUncertainMatch === undefined
        ? current.config?.promptOnUncertainMatch !== false
        : options.promptOnUncertainMatch;

    const contactStats = resolveParticipants(nextDb, userId, provider, data.participants || [], {
      promptOnUncertainMatch,
    });
    const messageStats = upsertMessagesFromProvider(nextDb, userId, provider, data.messages || []);

    if (typeof data.nextCursor === 'number') {
      current.config = {
        ...current.config,
        updateOffset: data.nextCursor,
      };
    }

    const stats = {
      contacts: contactStats,
      messages: messageStats,
    };

    current.lastSyncAt = nowIso();
    current.lastSyncStats = stats;
    current.lastError = null;
    current.updatedAt = nowIso();

    nextDb.auditEvents.push({
      id: randomUUID(),
      userId,
      type: 'integration.synced',
      entityType: 'integration',
      entityId: current.id,
      data: { provider, stats, promptOnUncertainMatch },
      createdAt: nowIso(),
    });

    return {
      integration: sanitizeIntegration(current),
      stats,
    };
  });
}

function markIntegrationSyncError(userId, provider, message) {
  return withDb((db) => {
    const integration = (db.integrations || []).find(
      (entry) => entry.userId === userId && entry.provider === provider,
    );
    if (!integration) {
      return null;
    }
    integration.lastError = message;
    integration.updatedAt = nowIso();
    return sanitizeIntegration(integration);
  });
}

function listContactMessages(userId, contactId, limit = 200) {
  const db = loadDb();
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 1000)) : 200;
  return (db.messages || [])
    .filter((message) => message.userId === userId && message.contactId === contactId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, normalizedLimit);
}

function listPendingMatches(userId) {
  const db = loadDb();
  return (db.pendingMatches || []).filter((match) => match.userId === userId && match.status === 'pending');
}

function relinkUnassignedMessages(db, userId, provider, externalId, contactId) {
  for (const message of db.messages || []) {
    if (
      message.userId === userId &&
      message.provider === provider &&
      message.externalContactId === externalId &&
      !message.contactId
    ) {
      message.contactId = contactId;
    }
  }
}

function resolvePendingMatch(userId, pendingMatchId, resolution) {
  return withDb((db) => {
    const pending = (db.pendingMatches || []).find(
      (match) => match.id === pendingMatchId && match.userId === userId && match.status === 'pending',
    );

    if (!pending) {
      const error = new Error('Pending match not found');
      error.statusCode = 404;
      throw error;
    }

    const action = resolution.action;
    if (!['link', 'create_new'].includes(action)) {
      const error = new Error('Invalid resolution action');
      error.statusCode = 400;
      throw error;
    }

    let contact;

    if (action === 'link') {
      const target = db.contacts.find(
        (entry) => entry.id === resolution.contactId && entry.userId === userId,
      );
      if (!target) {
        const error = new Error('Target contact not found');
        error.statusCode = 404;
        throw error;
      }
      attachProfileToContact(target, pending.provider, pending.participant);
      contact = target;
    } else {
      contact = createContactFromParticipant(userId, pending.provider, pending.participant);
      db.contacts.unshift(contact);
    }

    relinkUnassignedMessages(db, userId, pending.provider, pending.externalId, contact.id);

    pending.status = 'resolved';
    pending.resolution = {
      action,
      contactId: contact.id,
      resolvedAt: nowIso(),
    };
    pending.updatedAt = nowIso();

    db.auditEvents.push({
      id: randomUUID(),
      userId,
      type: 'integration.pending_match.resolved',
      entityType: 'pending_match',
      entityId: pending.id,
      data: {
        provider: pending.provider,
        action,
        contactId: contact.id,
      },
      createdAt: nowIso(),
    });

    return {
      pendingMatch: pending,
      contact,
    };
  });
}

module.exports = {
  SUPPORTED_PROVIDERS,
  listIntegrations,
  connectIntegration,
  disconnectIntegration,
  syncIntegration,
  markIntegrationSyncError,
  listContactMessages,
  listPendingMatches,
  resolvePendingMatch,
};
