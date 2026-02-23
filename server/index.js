const http = require('http');
const { randomUUID } = require('crypto');
const {
  sendJson,
  notFound,
  parseJsonBody,
  getTokenFromAuthHeader,
  getCorrelationId,
  parseQuery,
  getCorsHeaders,
} = require('./utils');
const {
  signIn,
  registerLocal,
  loginLocal,
  getAuthProviders,
  createGoogleAuthUrl,
  handleGoogleCallback,
  buildGoogleCallbackRedirect,
  getSession,
  signOut,
} = require('./auth');
const { withDb, loadDb, nowIso } = require('./store');
const { processRecording, hydrateContact } = require('./pipeline');
const {
  SUPPORTED_PROVIDERS,
  listIntegrations,
  connectIntegration,
  disconnectIntegration,
  syncIntegration,
  markIntegrationSyncError,
  listContactMessages,
  listPendingMatches,
  resolvePendingMatch,
} = require('./integrations');
const logger = require('./logger');

const port = Number(process.env.API_PORT || 4000);

function unauthorized(res, correlationId) {
  sendJson(res, 401, { error: 'Unauthorized' }, correlationId);
}

function getAuthedUser(req) {
  const token = getTokenFromAuthHeader(req);
  const auth = getSession(token);
  if (!auth) {
    return null;
  }
  return { token, ...auth };
}

function runQueuedProcessing(recordingId, correlationId) {
  setTimeout(() => {
    try {
      processRecording(recordingId, correlationId);
    } catch (error) {
      logger.error('Unexpected queue failure', {
        correlationId,
        recordingId,
        error: error.message,
      });
    }
  }, 250);
}

function getTranscriptsById(db) {
  return db.transcripts.reduce((acc, transcript) => {
    acc[transcript.id] = transcript;
    return acc;
  }, {});
}

const server = http.createServer(async (req, res) => {
  const correlationId = getCorrelationId(req);
  const urlObj = new URL(req.url, `http://localhost:${port}`);
  const pathname = urlObj.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...getCorsHeaders(),
      'X-Correlation-Id': correlationId,
    });
    res.end();
    return;
  }

  logger.info('request', {
    correlationId,
    method: req.method,
    pathname,
  });

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok', service: 'vertex-api', now: nowIso() }, correlationId);
      return;
    }

    if (pathname === '/api/auth/signin' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = signIn(body);
      sendJson(
        res,
        200,
        {
          token: result.token,
          user: result.user,
        },
        correlationId,
      );
      return;
    }

    if (pathname === '/api/auth/providers' && req.method === 'GET') {
      sendJson(res, 200, { providers: getAuthProviders() }, correlationId);
      return;
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const result = registerLocal(body);
        sendJson(res, 201, result, correlationId);
      } catch (error) {
        sendJson(res, error.statusCode || 500, { error: error.message }, correlationId);
      }
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const result = loginLocal(body);
        sendJson(res, 200, result, correlationId);
      } catch (error) {
        sendJson(res, error.statusCode || 500, { error: error.message }, correlationId);
      }
      return;
    }

    if (pathname === '/api/auth/google/start' && req.method === 'GET') {
      try {
        const { url } = createGoogleAuthUrl();
        res.writeHead(302, {
          Location: url,
          'X-Correlation-Id': correlationId,
        });
        res.end();
      } catch (error) {
        sendJson(res, error.statusCode || 500, { error: error.message }, correlationId);
      }
      return;
    }

    if (pathname === '/api/auth/google/callback' && req.method === 'GET') {
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const oauthError = urlObj.searchParams.get('error');

      if (oauthError) {
        const redirectUrl = buildGoogleCallbackRedirect({ error: oauthError });
        res.writeHead(302, {
          Location: redirectUrl,
          'X-Correlation-Id': correlationId,
        });
        res.end();
        return;
      }

      try {
        const result = await handleGoogleCallback({ code, state });
        const redirectUrl = buildGoogleCallbackRedirect({
          token: result.token,
          user: result.user,
        });
        res.writeHead(302, {
          Location: redirectUrl,
          'X-Correlation-Id': correlationId,
        });
        res.end();
      } catch (error) {
        const redirectUrl = buildGoogleCallbackRedirect({ error: error.message || 'google_auth_failed' });
        res.writeHead(302, {
          Location: redirectUrl,
          'X-Correlation-Id': correlationId,
        });
        res.end();
      }
      return;
    }

    if (pathname === '/api/auth/signout' && req.method === 'POST') {
      const token = getTokenFromAuthHeader(req);
      signOut(token);
      sendJson(res, 200, { success: true }, correlationId);
      return;
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const auth = getAuthedUser(req);
      if (!auth) {
        unauthorized(res, correlationId);
        return;
      }
      sendJson(res, 200, { user: auth.user }, correlationId);
      return;
    }

    const auth = getAuthedUser(req);
    if (!auth) {
      unauthorized(res, correlationId);
      return;
    }

    if (pathname === '/api/integrations' && req.method === 'GET') {
      const integrations = listIntegrations(auth.user.id);
      sendJson(
        res,
        200,
        {
          providers: SUPPORTED_PROVIDERS,
          integrations,
        },
        correlationId,
      );
      return;
    }

    if (pathname === '/api/integrations/pending-matches' && req.method === 'GET') {
      const pendingMatches = listPendingMatches(auth.user.id);
      sendJson(res, 200, { pendingMatches }, correlationId);
      return;
    }

    const connectMatch = pathname.match(/^\/api\/integrations\/([^/]+)\/connect$/);
    if (connectMatch && req.method === 'POST') {
      const provider = connectMatch[1];
      try {
        const payload = await parseJsonBody(req);
        const integration = connectIntegration(auth.user.id, provider, payload);
        sendJson(res, 200, { integration }, correlationId);
      } catch (error) {
        sendJson(res, error.statusCode || 500, { error: error.message }, correlationId);
      }
      return;
    }

    const disconnectMatch = pathname.match(/^\/api\/integrations\/([^/]+)\/disconnect$/);
    if (disconnectMatch && req.method === 'POST') {
      const provider = disconnectMatch[1];
      try {
        const integration = disconnectIntegration(auth.user.id, provider);
        if (!integration) {
          notFound(res, correlationId);
          return;
        }
        sendJson(res, 200, { integration }, correlationId);
      } catch (error) {
        sendJson(res, error.statusCode || 500, { error: error.message }, correlationId);
      }
      return;
    }

    const syncMatch = pathname.match(/^\/api\/integrations\/([^/]+)\/sync$/);
    if (syncMatch && req.method === 'POST') {
      const provider = syncMatch[1];
      try {
        const payload = await parseJsonBody(req);
        const result = await syncIntegration(auth.user.id, provider, {
          promptOnUncertainMatch:
            payload.promptOnUncertainMatch === undefined
              ? undefined
              : Boolean(payload.promptOnUncertainMatch),
        });
        sendJson(res, 200, result, correlationId);
      } catch (error) {
        markIntegrationSyncError(auth.user.id, provider, error.message);
        const statusCode = error.statusCode || 500;
        sendJson(
          res,
          statusCode,
          {
            error: error.message,
            providerError: error.providerResponse || undefined,
          },
          correlationId,
        );
      }
      return;
    }

    const pendingResolutionMatch = pathname.match(/^\/api\/integrations\/pending-matches\/([^/]+)\/resolve$/);
    if (pendingResolutionMatch && req.method === 'POST') {
      const pendingMatchId = pendingResolutionMatch[1];
      try {
        const payload = await parseJsonBody(req);
        const result = resolvePendingMatch(auth.user.id, pendingMatchId, payload);
        sendJson(res, 200, result, correlationId);
      } catch (error) {
        sendJson(res, error.statusCode || 500, { error: error.message }, correlationId);
      }
      return;
    }

    if (pathname === '/api/contacts' && req.method === 'GET') {
      const query = parseQuery(urlObj);
      const search = (query.q || '').toLowerCase();

      const db = loadDb();
      const transcriptsById = getTranscriptsById(db);

      let contacts = db.contacts.filter((contact) => contact.userId === auth.user.id);
      if (search) {
        contacts = contacts.filter((contact) => {
          return (
            contact.name.toLowerCase().includes(search) ||
            contact.title.toLowerCase().includes(search) ||
            contact.company.toLowerCase().includes(search)
          );
        });
      }

      sendJson(
        res,
        200,
        {
          contacts: contacts.map((contact) => hydrateContact(contact, transcriptsById)),
        },
        correlationId,
      );
      return;
    }

    if (pathname === '/api/contacts' && req.method === 'POST') {
      const body = await parseJsonBody(req);

      const requiredString = (value) => String(value || '').trim();
      const name = requiredString(body.name);
      const title = requiredString(body.title);
      const company = requiredString(body.company);
      const location = requiredString(body.location);

      if (!name || !title || !company || !location) {
        sendJson(res, 400, { error: 'name, title, company, and location are required' }, correlationId);
        return;
      }

      const contact = withDb((db) => {
        const entry = {
          id: randomUUID(),
          userId: auth.user.id,
          name,
          title,
          company,
          location,
          linkedInUrl: requiredString(body.linkedInUrl),
          profileImage: requiredString(body.profileImage),
          dateAdded: new Date().toISOString().slice(0, 10),
          notes: requiredString(body.notes),
          keyFacts: Array.isArray(body.keyFacts) ? body.keyFacts.map((fact) => ({
            id: randomUUID(),
            text: requiredString(fact.text),
            source: fact.source || 'Conversation',
            category: fact.category || 'Professional',
            createdAt: nowIso(),
          })).filter((fact) => fact.text) : [],
          funFacts: Array.isArray(body.funFacts) ? body.funFacts.map((fact) => ({
            id: randomUUID(),
            text: requiredString(fact.text),
            source: fact.source || 'Conversation',
            category: fact.category || 'Interest',
            createdAt: nowIso(),
          })).filter((fact) => fact.text) : [],
          suggestedActions: Array.isArray(body.suggestedActions) ? body.suggestedActions.map((action) => ({
            id: randomUUID(),
            type: action.type || 'follow-up',
            title: requiredString(action.title),
            description: requiredString(action.description),
            priority: action.priority || 'medium',
            dueDate: action.dueDate || undefined,
            createdAt: nowIso(),
          })).filter((action) => action.title && action.description) : [],
          conversationDuration: requiredString(body.conversationDuration) || '0:00',
          externalProfiles: [],
          emails: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        db.contacts.unshift(entry);

        if (body.recordingId) {
          const recording = db.recordings.find(
            (item) => item.id === body.recordingId && item.userId === auth.user.id,
          );
          if (recording) {
            recording.contactId = entry.id;
            recording.status = 'completed';
            recording.updatedAt = nowIso();
          }
        }

        db.auditEvents.push({
          id: randomUUID(),
          userId: auth.user.id,
          type: 'contact.created.manual',
          entityType: 'contact',
          entityId: entry.id,
          data: { recordingId: body.recordingId || null },
          createdAt: nowIso(),
        });

        return entry;
      });

      const db = loadDb();
      const transcriptsById = getTranscriptsById(db);
      const hydrated = hydrateContact(
        db.contacts.find((item) => item.id === contact.id && item.userId === auth.user.id),
        transcriptsById,
      );

      sendJson(res, 201, { contact: hydrated }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/contacts/') && pathname.endsWith('/notes') && req.method === 'PATCH') {
      const contactId = pathname.split('/')[3];
      const body = await parseJsonBody(req);
      const notes = String(body.notes || '');

      const updated = withDb((db) => {
        const contact = db.contacts.find((item) => item.id === contactId && item.userId === auth.user.id);
        if (!contact) {
          return null;
        }
        contact.notes = notes;
        contact.updatedAt = nowIso();
        db.auditEvents.push({
          id: randomUUID(),
          userId: auth.user.id,
          type: 'contact.notes.updated',
          entityType: 'contact',
          entityId: contact.id,
          data: { notesLength: notes.length },
          createdAt: nowIso(),
        });
        return contact;
      });

      if (!updated) {
        notFound(res, correlationId);
        return;
      }

      const db = loadDb();
      const transcriptsById = getTranscriptsById(db);
      const hydrated = hydrateContact(
        db.contacts.find((item) => item.id === contactId && item.userId === auth.user.id),
        transcriptsById,
      );

      sendJson(res, 200, { contact: hydrated }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/contacts/') && pathname.endsWith('/actions') && req.method === 'GET') {
      const contactId = pathname.split('/')[3];
      const db = loadDb();
      const transcriptsById = getTranscriptsById(db);
      const contact = db.contacts.find((item) => item.id === contactId && item.userId === auth.user.id);

      if (!contact) {
        notFound(res, correlationId);
        return;
      }

      const actions = contact.suggestedActions.map((action) => ({
        ...action,
        transcript: action.transcriptId ? transcriptsById[action.transcriptId] : null,
      }));

      sendJson(res, 200, { actions }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/contacts/') && pathname.endsWith('/messages') && req.method === 'GET') {
      const contactId = pathname.split('/')[3];
      const query = parseQuery(urlObj);
      const limit = Number(query.limit || 200);

      const db = loadDb();
      const contact = db.contacts.find((item) => item.id === contactId && item.userId === auth.user.id);
      if (!contact) {
        notFound(res, correlationId);
        return;
      }

      const messages = listContactMessages(auth.user.id, contactId, limit);
      sendJson(res, 200, { messages }, correlationId);
      return;
    }

    const contactMatch = pathname.match(/^\/api\/contacts\/([^/]+)$/);
    if (contactMatch && req.method === 'GET') {
      const contactId = contactMatch[1];
      const db = loadDb();
      const transcriptsById = getTranscriptsById(db);
      const contact = db.contacts.find((item) => item.id === contactId && item.userId === auth.user.id);

      if (!contact) {
        notFound(res, correlationId);
        return;
      }

      sendJson(res, 200, { contact: hydrateContact(contact, transcriptsById) }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/insights/') && pathname.endsWith('/transcript') && req.method === 'GET') {
      const insightId = pathname.split('/')[3];
      const db = loadDb();

      let transcriptId = null;
      const contact = db.contacts.find((item) => item.userId === auth.user.id && (
        item.keyFacts.some((insight) => insight.id === insightId) ||
        item.funFacts.some((insight) => insight.id === insightId) ||
        item.suggestedActions.some((action) => action.id === insightId)
      ));

      if (!contact) {
        notFound(res, correlationId);
        return;
      }

      const fact = contact.keyFacts.find((insight) => insight.id === insightId)
        || contact.funFacts.find((insight) => insight.id === insightId);
      if (fact && fact.transcriptId) {
        transcriptId = fact.transcriptId;
      }

      const action = contact.suggestedActions.find((item) => item.id === insightId);
      if (action && action.transcriptId) {
        transcriptId = action.transcriptId;
      }

      if (!transcriptId) {
        notFound(res, correlationId);
        return;
      }

      const transcript = db.transcripts.find((item) => item.id === transcriptId);
      if (!transcript) {
        notFound(res, correlationId);
        return;
      }

      sendJson(res, 200, { transcript }, correlationId);
      return;
    }

    if (pathname === '/api/recordings' && req.method === 'POST') {
      const body = await parseJsonBody(req);

      const recording = withDb((db) => {
        const entry = {
          id: randomUUID(),
          userId: auth.user.id,
          durationSeconds: Number(body.durationSeconds || 0),
          status: 'created',
          attempts: 0,
          transcriptText: body.transcriptText || '',
          audioUrl: body.audioUrl || null,
          contactId: null,
          lastError: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        db.recordings.push(entry);
        db.auditEvents.push({
          id: randomUUID(),
          userId: auth.user.id,
          type: 'recording.created',
          entityType: 'recording',
          entityId: entry.id,
          data: { durationSeconds: entry.durationSeconds },
          createdAt: nowIso(),
        });
        return entry;
      });

      sendJson(res, 201, { recording }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/recordings/') && pathname.endsWith('/audio') && req.method === 'PUT') {
      const recordingId = pathname.split('/')[3];
      const body = await parseJsonBody(req);

      const updated = withDb((db) => {
        const recording = db.recordings.find((item) => item.id === recordingId && item.userId === auth.user.id);
        if (!recording) {
          return null;
        }

        recording.audioUrl = body.audioUrl || recording.audioUrl;
        recording.transcriptText = body.transcriptText || recording.transcriptText;
        recording.status = 'uploaded';
        recording.updatedAt = nowIso();

        db.auditEvents.push({
          id: randomUUID(),
          userId: auth.user.id,
          type: 'recording.audio.updated',
          entityType: 'recording',
          entityId: recording.id,
          data: { hasAudioUrl: Boolean(recording.audioUrl) },
          createdAt: nowIso(),
        });

        return recording;
      });

      if (!updated) {
        notFound(res, correlationId);
        return;
      }

      sendJson(res, 200, { recording: updated }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/recordings/') && pathname.endsWith('/process') && req.method === 'POST') {
      const recordingId = pathname.split('/')[3];

      const queued = withDb((db) => {
        const recording = db.recordings.find((item) => item.id === recordingId && item.userId === auth.user.id);
        if (!recording) {
          return null;
        }
        recording.status = 'queued';
        recording.updatedAt = nowIso();
        db.auditEvents.push({
          id: randomUUID(),
          userId: auth.user.id,
          type: 'recording.queued',
          entityType: 'recording',
          entityId: recording.id,
          data: {},
          createdAt: nowIso(),
        });
        return recording;
      });

      if (!queued) {
        notFound(res, correlationId);
        return;
      }

      runQueuedProcessing(recordingId, correlationId);
      sendJson(res, 202, { recording: queued }, correlationId);
      return;
    }

    if (pathname.startsWith('/api/recordings/') && req.method === 'GET') {
      const recordingId = pathname.split('/')[3];
      const db = loadDb();
      const recording = db.recordings.find((item) => item.id === recordingId && item.userId === auth.user.id);
      if (!recording) {
        notFound(res, correlationId);
        return;
      }

      const response = { recording };
      if (recording.contactId) {
        const transcriptsById = getTranscriptsById(db);
        const contact = db.contacts.find((item) => item.id === recording.contactId && item.userId === auth.user.id);
        if (contact) {
          response.contact = hydrateContact(contact, transcriptsById);
        }
      }

      sendJson(res, 200, response, correlationId);
      return;
    }

    notFound(res, correlationId);
  } catch (error) {
    logger.error('request failed', {
      correlationId,
      pathname,
      method: req.method,
      error: error.message,
    });
    sendJson(res, 500, { error: 'Internal server error' }, correlationId);
  }
});

server.listen(port, () => {
  logger.info('server started', { port });
});
