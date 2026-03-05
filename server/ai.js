const logger = require('./logger');

function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function extFromMime(mimeType) {
  if (!mimeType) {
    return 'webm';
  }
  if (mimeType.includes('wav')) {
    return 'wav';
  }
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
    return 'mp3';
  }
  if (mimeType.includes('mp4')) {
    return 'm4a';
  }
  return 'webm';
}

async function transcribeAudioDataUrl(audioUrl, correlationId) {
  if (!hasOpenAi()) {
    return '';
  }

  const parsed = parseDataUrl(audioUrl);
  if (!parsed) {
    return '';
  }

  const form = new FormData();
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
  form.append('response_format', 'json');
  form.append(
    'file',
    new Blob([parsed.buffer], { type: parsed.mimeType }),
    `recording.${extFromMime(parsed.mimeType)}`,
  );

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn('Audio transcription failed', {
      correlationId,
      status: response.status,
      body: body.slice(0, 200),
    });
    return '';
  }

  const payload = await response.json();
  return String(payload.text || '').trim();
}

function sanitizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(Boolean);
}

function fallbackPersona(transcriptText) {
  const safeTranscript = transcriptText || 'Conversation transcript unavailable.';
  return {
    name: 'New Contact',
    title: 'Unknown title',
    company: 'Unknown company',
    location: 'Unknown location',
    linkedInUrl: '',
    notes: safeTranscript.slice(0, 300),
    keyFacts: [
      { text: 'Met and discussed collaboration opportunities.', source: 'Conversation', category: 'Professional' },
    ],
    funFacts: [
      { text: 'Add a personal detail from the conversation.', source: 'Conversation', category: 'Interest' },
    ],
    actions: [
      {
        type: 'follow-up',
        title: 'Send follow-up message',
        description: 'Summarize the conversation and suggest next steps.',
        priority: 'medium',
      },
    ],
    transcriptText: safeTranscript,
  };
}

async function generatePersonaFromTranscriptAi(transcriptText, correlationId) {
  if (!hasOpenAi() || !transcriptText.trim()) {
    return fallbackPersona(transcriptText);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Extract contact persona JSON from networking transcript. Return compact JSON only.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            schema: {
              name: 'string',
              title: 'string',
              company: 'string',
              location: 'string',
              linkedInUrl: 'string',
              notes: 'string',
              keyFacts: [{ text: 'string', source: 'Conversation|LinkedIn|Mutual Connection|Website|Social Media|Email', category: 'Professional|Personal|Interest|Background|Goal' }],
              funFacts: [{ text: 'string', source: 'Conversation|LinkedIn|Mutual Connection|Website|Social Media|Email', category: 'Professional|Personal|Interest|Background|Goal' }],
              actions: [{ type: 'email|meeting|follow-up|introduction|share|call', title: 'string', description: 'string', priority: 'high|medium|low', dueDate: 'optional string' }],
              transcriptText: 'string',
            },
            transcript: transcriptText,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn('Persona extraction failed', {
      correlationId,
      status: response.status,
      body: body.slice(0, 200),
    });
    return fallbackPersona(transcriptText);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return fallbackPersona(transcriptText);
  }

  const fallback = fallbackPersona(transcriptText);
  return {
    name: String(parsed.name || fallback.name),
    title: String(parsed.title || fallback.title),
    company: String(parsed.company || fallback.company),
    location: String(parsed.location || fallback.location),
    linkedInUrl: String(parsed.linkedInUrl || ''),
    notes: String(parsed.notes || fallback.notes),
    keyFacts: sanitizeList(parsed.keyFacts).map((fact) => ({
      text: String(fact.text || '').trim(),
      source: String(fact.source || 'Conversation'),
      category: String(fact.category || 'Professional'),
    })).filter((fact) => fact.text),
    funFacts: sanitizeList(parsed.funFacts).map((fact) => ({
      text: String(fact.text || '').trim(),
      source: String(fact.source || 'Conversation'),
      category: String(fact.category || 'Interest'),
    })).filter((fact) => fact.text),
    actions: sanitizeList(parsed.actions).map((action) => ({
      type: String(action.type || 'follow-up'),
      title: String(action.title || '').trim(),
      description: String(action.description || '').trim(),
      priority: String(action.priority || 'medium'),
      dueDate: action.dueDate ? String(action.dueDate) : undefined,
    })).filter((action) => action.title && action.description),
    transcriptText: String(parsed.transcriptText || transcriptText || ''),
  };
}

module.exports = {
  hasOpenAi,
  transcribeAudioDataUrl,
  generatePersonaFromTranscriptAi,
};
