import type { Contact, Recording, User } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'vertex_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.error || 'Request failed', response.status);
  }

  return payload as T;
}

export async function signIn(email = 'demo@vertex.app', name = 'Demo User') {
  const data = await request<{ token: string; user: User }>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
  });
  setStoredToken(data.token);
  return data;
}

export async function getAuthProviders() {
  const data = await request<{ providers: { google: boolean; local: boolean } }>('/auth/providers', {
    method: 'GET',
  });
  return data.providers;
}

export async function registerWithPassword(payload: {
  username: string;
  password: string;
  name?: string;
  email?: string;
}) {
  const data = await request<{ token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(data.token);
  return data;
}

export async function loginWithPassword(payload: { username: string; password: string }) {
  const data = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(data.token);
  return data;
}

export function getGoogleAuthStartUrl() {
  return `${API_BASE}/auth/google/start`;
}

export async function signOut(token: string) {
  await request<{ success: boolean }>('/auth/signout', {
    method: 'POST',
  }, token);
  setStoredToken(null);
}

export async function getMe(token: string) {
  const data = await request<{ user: User }>('/auth/me', { method: 'GET' }, token);
  return data.user;
}

export async function listContacts(token: string, query = '') {
  const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const data = await request<{ contacts: Contact[] }>(`/contacts${q}`, { method: 'GET' }, token);
  return data.contacts;
}

export async function updateContactNotes(token: string, contactId: string, notes: string) {
  const data = await request<{ contact: Contact }>(`/contacts/${contactId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  }, token);
  return data.contact;
}

export async function createContact(
  token: string,
  payload: {
    name: string;
    title: string;
    company: string;
    location: string;
    linkedInUrl?: string;
    notes?: string;
    keyFacts?: Array<{ text: string; source?: string; category?: string }>;
    funFacts?: Array<{ text: string; source?: string; category?: string }>;
    suggestedActions?: Array<{ type?: string; title: string; description: string; priority?: string; dueDate?: string }>;
    conversationDuration?: string;
    recordingId?: string;
  },
) {
  const data = await request<{ contact: Contact }>(
    '/contacts',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
  return data.contact;
}

export interface ContactMessage {
  id: string;
  provider: 'slack' | 'discord' | 'telegram';
  externalMessageId: string;
  channelId: string | null;
  channelName: string | null;
  text: string;
  timestamp: string;
}

export async function listContactMessages(token: string, contactId: string, limit = 200) {
  const data = await request<{ messages: ContactMessage[] }>(
    `/contacts/${contactId}/messages?limit=${encodeURIComponent(String(limit))}`,
    { method: 'GET' },
    token,
  );
  return data.messages;
}

export async function createRecording(token: string, durationSeconds: number) {
  const data = await request<{ recording: Recording }>('/recordings', {
    method: 'POST',
    body: JSON.stringify({ durationSeconds }),
  }, token);
  return data.recording;
}

export async function uploadRecordingAudio(token: string, recordingId: string, transcriptText: string) {
  const data = await request<{ recording: Recording }>(`/recordings/${recordingId}/audio`, {
    method: 'PUT',
    body: JSON.stringify({ transcriptText }),
  }, token);
  return data.recording;
}

export async function uploadRecordingMedia(
  token: string,
  recordingId: string,
  payload: { audioUrl: string; transcriptText?: string },
) {
  const data = await request<{ recording: Recording }>(`/recordings/${recordingId}/audio`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
  return data.recording;
}

export async function processRecording(token: string, recordingId: string) {
  const data = await request<{ recording: Recording }>(`/recordings/${recordingId}/process`, {
    method: 'POST',
  }, token);
  return data.recording;
}

export async function getRecording(token: string, recordingId: string) {
  return request<{ recording: Recording; contact?: Contact }>(`/recordings/${recordingId}`, {
    method: 'GET',
  }, token);
}

export interface IntegrationRecord {
  id: string;
  provider: 'slack' | 'discord' | 'telegram';
  status: 'connected' | 'disconnected';
  config: {
    guildId?: string;
    chatIds?: string[];
    channelIds?: string[];
    label?: string;
    promptOnUncertainMatch?: boolean;
  };
  lastSyncAt: string | null;
  lastSyncStats:
    | {
        contacts: { created: number; updated: number; scanned: number };
        messages: { created: number; skipped: number; scanned: number };
      }
    | null;
  lastError: string | null;
}

export async function listIntegrations(token: string) {
  return request<{ providers: string[]; integrations: IntegrationRecord[] }>(
    '/integrations',
    { method: 'GET' },
    token,
  );
}

export async function connectSlack(
  token: string,
  payload: { token: string; label?: string; channelIds?: string[]; promptOnUncertainMatch?: boolean },
) {
  return request<{ integration: IntegrationRecord }>(
    '/integrations/slack/connect',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function connectDiscord(
  token: string,
  payload: { botToken: string; guildId: string; label?: string; channelIds?: string[]; promptOnUncertainMatch?: boolean },
) {
  return request<{ integration: IntegrationRecord }>(
    '/integrations/discord/connect',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function connectTelegram(
  token: string,
  payload: { botToken: string; chatIds: string[]; label?: string; promptOnUncertainMatch?: boolean },
) {
  return request<{ integration: IntegrationRecord }>(
    '/integrations/telegram/connect',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function syncIntegration(token: string, provider: 'slack' | 'discord' | 'telegram') {
  return request<{
    integration: IntegrationRecord;
    stats: {
      contacts: { created: number; updated: number; scanned: number };
      messages: { created: number; skipped: number; scanned: number };
    };
  }>(`/integrations/${provider}/sync`, { method: 'POST' }, token);
}

export interface PendingMatch {
  id: string;
  provider: 'slack' | 'discord' | 'telegram';
  externalId: string;
  participant: {
    name: string;
    username?: string;
    email?: string;
  };
  candidates: Array<{
    contactId: string;
    contactName: string;
    score: number;
    reasons: string[];
    title?: string;
    company?: string;
  }>;
}

export async function listPendingMatches(token: string) {
  const data = await request<{ pendingMatches: PendingMatch[] }>(
    '/integrations/pending-matches',
    { method: 'GET' },
    token,
  );
  return data.pendingMatches;
}

export async function resolvePendingMatch(
  token: string,
  pendingMatchId: string,
  payload: { action: 'link'; contactId: string } | { action: 'create_new' },
) {
  return request(`/integrations/pending-matches/${pendingMatchId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}
