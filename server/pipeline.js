const { randomUUID } = require('crypto');
const { withDb, nowIso } = require('./store');
const logger = require('./logger');
const { InsightSources, InsightCategories, ActionTypes, ActionPriority } = require('./types');

function estimateDuration(durationSeconds) {
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function fallbackPersonaFromTranscript(text) {
  const baseTranscript = text ||
    'Met at a networking event. We discussed product strategy and next steps.';

  return {
    name: 'Alex Thompson',
    title: 'Senior Software Engineer',
    company: 'CloudScale Systems',
    location: 'Seattle, WA',
    linkedInUrl: 'linkedin.com/in/alexthompson',
    profileImage: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',
    notes:
      'Met at a conference. Interested in distributed systems and potential collaboration.',
    keyFacts: [
      {
        text: 'Leading a platform migration to Kubernetes',
        source: 'Conversation',
        category: 'Professional',
      },
    ],
    funFacts: [
      {
        text: 'Homebrews craft beer and plays guitar',
        source: 'Conversation',
        category: 'Interest',
      },
    ],
    actions: [
      {
        type: 'meeting',
        title: 'Schedule architecture follow-up',
        description: 'Review optimization ideas from the conversation',
        priority: 'high',
      },
    ],
    transcriptText: baseTranscript,
  };
}

function normalizeInsightSource(value) {
  const source = String(value || '');
  return InsightSources.includes(source) ? source : 'Conversation';
}

function normalizeInsightCategory(value) {
  const category = String(value || '');
  return InsightCategories.includes(category) ? category : 'Professional';
}

function normalizeActionType(value) {
  const type = String(value || '');
  return ActionTypes.includes(type) ? type : 'follow-up';
}

function normalizeActionPriority(value) {
  const priority = String(value || '');
  return ActionPriority.includes(priority) ? priority : 'medium';
}

function normalizePersona(input, fallback) {
  const base = fallback || fallbackPersonaFromTranscript('');
  const persona = input || {};
  return {
    name: String(persona.name || base.name),
    title: String(persona.title || base.title),
    company: String(persona.company || base.company),
    location: String(persona.location || base.location),
    linkedInUrl: String(persona.linkedInUrl || ''),
    profileImage: String(persona.profileImage || base.profileImage),
    notes: String(persona.notes || base.notes),
    keyFacts: Array.isArray(persona.keyFacts) ? persona.keyFacts : base.keyFacts,
    funFacts: Array.isArray(persona.funFacts) ? persona.funFacts : base.funFacts,
    actions: Array.isArray(persona.actions) ? persona.actions : base.actions,
    transcriptText: String(persona.transcriptText || base.transcriptText || ''),
  };
}

function createTranscriptFromText(text, highlightText) {
  return {
    id: randomUUID(),
    platform: 'In-Person',
    occasion: 'Networking conversation',
    date: new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    time: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    location: 'Conference venue',
    fullTranscript: String(text || 'Transcript unavailable'),
    highlightedText: String(highlightText || 'Conversation highlight'),
    createdAt: nowIso(),
  };
}

function createAuditEvent(db, userId, type, entityType, entityId, data = {}) {
  db.auditEvents.push({
    id: randomUUID(),
    userId,
    type,
    entityType,
    entityId,
    data,
    createdAt: nowIso(),
  });
}

function buildContactFromPersona({
  userId,
  durationSeconds,
  persona,
  transcript,
}) {
  const safePersona = normalizePersona(persona, fallbackPersonaFromTranscript(persona?.transcriptText || ''));
  const transcriptId = transcript?.id;

  return {
    id: randomUUID(),
    userId,
    name: safePersona.name,
    title: safePersona.title,
    company: safePersona.company,
    location: safePersona.location,
    linkedInUrl: safePersona.linkedInUrl,
    profileImage: safePersona.profileImage,
    dateAdded: new Date().toISOString().slice(0, 10),
    notes: safePersona.notes,
    keyFacts: safePersona.keyFacts
      .map((fact) => ({
        id: randomUUID(),
        text: String(fact.text || '').trim(),
        source: normalizeInsightSource(fact.source),
        category: normalizeInsightCategory(fact.category),
        transcriptId,
        createdAt: nowIso(),
      }))
      .filter((fact) => fact.text),
    funFacts: safePersona.funFacts
      .map((fact) => ({
        id: randomUUID(),
        text: String(fact.text || '').trim(),
        source: normalizeInsightSource(fact.source),
        category: normalizeInsightCategory(fact.category),
        transcriptId,
        createdAt: nowIso(),
      }))
      .filter((fact) => fact.text),
    suggestedActions: safePersona.actions
      .map((action) => ({
        id: randomUUID(),
        type: normalizeActionType(action.type),
        title: String(action.title || '').trim(),
        description: String(action.description || '').trim(),
        priority: normalizeActionPriority(action.priority),
        dueDate: action.dueDate ? String(action.dueDate) : undefined,
        transcriptId,
        createdAt: nowIso(),
      }))
      .filter((action) => action.title && action.description),
    conversationDuration: estimateDuration(durationSeconds || 0),
    externalProfiles: [],
    emails: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function processRecording(recordingId, correlationId) {
  return withDb((db) => {
    const recording = db.recordings.find((r) => r.id === recordingId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    if (recording.status === 'completed') {
      return recording;
    }

    recording.status = 'processing';
    recording.updatedAt = nowIso();

    try {
      const persona = fallbackPersonaFromTranscript(recording.transcriptText);
      const transcript = createTranscriptFromText(persona.transcriptText, persona.keyFacts[0]?.text);
      db.transcripts.push(transcript);

      const contact = buildContactFromPersona({
        userId: recording.userId,
        durationSeconds: recording.durationSeconds,
        persona,
        transcript,
      });
      db.contacts.unshift(contact);

      recording.status = 'completed';
      recording.contactId = contact.id;
      recording.updatedAt = nowIso();

      createAuditEvent(db, recording.userId, 'recording.processed', 'recording', recording.id, {
        contactId: contact.id,
        correlationId,
      });

      return recording;
    } catch (error) {
      recording.attempts += 1;
      recording.lastError = error.message;
      recording.status = recording.attempts >= 3 ? 'failed' : 'queued';
      recording.updatedAt = nowIso();

      createAuditEvent(db, recording.userId, 'recording.failed', 'recording', recording.id, {
        error: error.message,
        attempts: recording.attempts,
      });

      logger.error('Recording processing failed', {
        correlationId,
        recordingId,
        error: error.message,
      });

      return recording;
    }
  });
}

function embedTranscript(transcript, insightText) {
  return {
    id: transcript.id,
    platform: transcript.platform,
    occasion: transcript.occasion,
    date: transcript.date,
    time: transcript.time,
    location: transcript.location,
    fullTranscript: transcript.fullTranscript,
    highlightedText: insightText,
  };
}

function hydrateContact(contact, transcriptsById) {
  const transcriptFor = (transcriptId, highlightText) => {
    const transcript = transcriptId ? transcriptsById[transcriptId] : null;
    if (!transcript) {
      return undefined;
    }
    return embedTranscript(transcript, highlightText);
  };

  return {
    ...contact,
    keyFacts: contact.keyFacts.map((insight) => ({
      ...insight,
      transcript: transcriptFor(insight.transcriptId, insight.text),
    })),
    funFacts: contact.funFacts.map((insight) => ({
      ...insight,
      transcript: transcriptFor(insight.transcriptId, insight.text),
    })),
    suggestedActions: contact.suggestedActions.map((action) => ({
      ...action,
      transcript: transcriptFor(action.transcriptId, action.title),
    })),
  };
}

module.exports = {
  processRecording,
  hydrateContact,
  estimateDuration,
  createTranscriptFromText,
  buildContactFromPersona,
  fallbackPersonaFromTranscript,
};
