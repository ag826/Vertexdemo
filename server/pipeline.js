const { randomUUID } = require('crypto');
const { withDb, nowIso } = require('./store');
const logger = require('./logger');

function estimateDuration(durationSeconds) {
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function generatePersonaFromTranscript(text) {
  const baseTranscript = text ||
    'Met at a networking event. We discussed product strategy, hiring goals, and follow-up collaboration opportunities.';

  return {
    name: 'Alex Thompson',
    title: 'Senior Software Engineer',
    company: 'CloudScale Systems',
    location: 'Seattle, WA',
    linkedInUrl: 'linkedin.com/in/alexthompson',
    profileImage: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',
    notes:
      'Met at a conference. Interested in distributed systems, Kubernetes optimization, and potential collaboration on open-source initiatives.',
    keyFacts: [
      {
        text: 'Leading a platform migration to Kubernetes',
        source: 'Conversation',
        category: 'Professional',
      },
      {
        text: 'Previously worked on AWS infrastructure',
        source: 'LinkedIn',
        category: 'Background',
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
        description: 'Review Kubernetes optimization ideas from the conversation',
        priority: 'high',
      },
      {
        type: 'introduction',
        title: 'Introduce to hiring lead',
        description: 'Their team is hiring senior engineers in Q2',
        priority: 'medium',
      },
    ],
    transcriptText: baseTranscript,
  };
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
      const persona = generatePersonaFromTranscript(recording.transcriptText);

      const transcript = {
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
        fullTranscript: persona.transcriptText,
        highlightedText: persona.keyFacts[0].text,
        createdAt: nowIso(),
      };

      db.transcripts.push(transcript);

      const contact = {
        id: randomUUID(),
        userId: recording.userId,
        name: persona.name,
        title: persona.title,
        company: persona.company,
        location: persona.location,
        linkedInUrl: persona.linkedInUrl,
        profileImage: persona.profileImage,
        dateAdded: new Date().toISOString().slice(0, 10),
        notes: persona.notes,
        keyFacts: persona.keyFacts.map((fact) => ({
          id: randomUUID(),
          text: fact.text,
          source: fact.source,
          category: fact.category,
          transcriptId: transcript.id,
          createdAt: nowIso(),
        })),
        funFacts: persona.funFacts.map((fact) => ({
          id: randomUUID(),
          text: fact.text,
          source: fact.source,
          category: fact.category,
          createdAt: nowIso(),
        })),
        suggestedActions: persona.actions.map((action) => ({
          id: randomUUID(),
          type: action.type,
          title: action.title,
          description: action.description,
          priority: action.priority,
          dueDate: undefined,
          transcriptId: transcript.id,
          createdAt: nowIso(),
        })),
        conversationDuration: estimateDuration(recording.durationSeconds || 0),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

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
};
