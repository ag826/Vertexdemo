const { randomUUID } = require('crypto');
const { loadDb, saveDb, nowIso } = require('./store');
const logger = require('./logger');
const { transcribeAudioDataUrl, generatePersonaFromTranscriptAi } = require('./ai');
const { enrichLinkedInProfile, normalizeLinkedInUrl } = require('./linkedin');
const { createTranscriptFromText, buildContactFromPersona } = require('./pipeline');

async function autoBuildContactFromRecording(userId, recordingId, correlationId) {
  const db = loadDb();
  const recording = db.recordings.find((entry) => entry.id === recordingId && entry.userId === userId);
  if (!recording) {
    const error = new Error('Recording not found');
    error.statusCode = 404;
    throw error;
  }

  if (!recording.audioUrl) {
    const error = new Error('Recording audio is required before auto-build');
    error.statusCode = 400;
    throw error;
  }

  recording.status = 'processing';
  recording.updatedAt = nowIso();
  saveDb(db);

  try {
    const transcriptText = recording.transcriptText
      ? String(recording.transcriptText).trim()
      : await transcribeAudioDataUrl(recording.audioUrl, correlationId);

    if (transcriptText) {
      recording.transcriptText = transcriptText;
    }

    const persona = await generatePersonaFromTranscriptAi(recording.transcriptText || '', correlationId);

    if (persona.linkedInUrl) {
      const linkedIn = await enrichLinkedInProfile(persona.linkedInUrl, correlationId);
      if (linkedIn) {
        persona.linkedInUrl = normalizeLinkedInUrl(persona.linkedInUrl);
        persona.name = linkedIn.fullName || persona.name;
        persona.profileImage = linkedIn.profilePictureUrl || persona.profileImage;
        if (!persona.title || persona.title === 'Unknown title') {
          persona.title = linkedIn.headline || linkedIn.occupation || persona.title;
        }
        if (!persona.location || persona.location === 'Unknown location') {
          persona.location = [linkedIn.city, linkedIn.country].filter(Boolean).join(', ') || persona.location;
        }
        if (linkedIn.summary) {
          persona.notes = persona.notes ? `${persona.notes}\n\nLinkedIn: ${linkedIn.summary}` : linkedIn.summary;
        }
      }
    }

    const transcript = createTranscriptFromText(
      persona.transcriptText || recording.transcriptText,
      persona.keyFacts?.[0]?.text || persona.funFacts?.[0]?.text,
    );
    db.transcripts.push(transcript);

    const contact = buildContactFromPersona({
      userId,
      durationSeconds: recording.durationSeconds,
      persona,
      transcript,
    });
    db.contacts.unshift(contact);

    recording.status = 'completed';
    recording.contactId = contact.id;
    recording.lastError = null;
    recording.updatedAt = nowIso();

    db.auditEvents.push({
      id: randomUUID(),
      userId,
      type: 'recording.autobuild.completed',
      entityType: 'recording',
      entityId: recording.id,
      data: { contactId: contact.id, correlationId },
      createdAt: nowIso(),
    });

    saveDb(db);
    return { recording, contact };
  } catch (error) {
    recording.attempts = Number(recording.attempts || 0) + 1;
    recording.status = recording.attempts >= 3 ? 'failed' : 'uploaded';
    recording.lastError = error.message;
    recording.updatedAt = nowIso();
    db.auditEvents.push({
      id: randomUUID(),
      userId,
      type: 'recording.autobuild.failed',
      entityType: 'recording',
      entityId: recording.id,
      data: { error: error.message, correlationId },
      createdAt: nowIso(),
    });
    saveDb(db);

    logger.error('Auto-build failed', {
      correlationId,
      recordingId,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  autoBuildContactFromRecording,
};
