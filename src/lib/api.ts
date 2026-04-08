import type {
  AppSettings,
  ChatRecommendation,
  Contact,
  ContactSummary,
  IntegrationItem,
  Recording,
  SuggestedAction,
  User,
} from './types';

const API_BASE = '/api';
const TOKEN_KEY = 'vertex-token';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function formatApiErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const joined = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const msg = typeof record.msg === 'string' ? record.msg : '';
          const loc = Array.isArray(record.loc) ? record.loc.join('.') : '';
          return [loc, msg].filter(Boolean).join(': ');
        }
        return '';
      })
      .filter(Boolean)
      .join('; ');
    if (joined) return joined;
  }
  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(response.status, formatApiErrorMessage(data.detail, 'Request failed'));
  }
  return data as T;
}

export async function register(payload: { email: string; password: string; name: string }) {
  return request<{ user: User; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return request<{ user: User }>('/me');
}

export async function getContacts(search = '') {
  return request<{ items: ContactSummary[] }>(`/contacts?search=${encodeURIComponent(search)}`);
}

export async function getContact(contactId: number) {
  return request<{ contact: Contact }>(`/contacts/${contactId}`);
}

export async function updateContactNotes(contactId: number, notes: string) {
  return request<{ contact: Contact }>(`/contacts/${contactId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

export async function deleteContact(contactId: number) {
  return request<{ success: boolean }>(`/contacts/${contactId}`, {
    method: 'DELETE',
  });
}

export async function refreshContactAnalysis(contactId: number) {
  return request<{ contact: Contact }>(`/contacts/${contactId}/refresh-analysis`, {
    method: 'POST',
  });
}

export async function createRecording(platform: string, sourceType = 'manual') {
  return request<{ recording: Recording }>('/recordings', {
    method: 'POST',
    body: JSON.stringify({ sourceType, provider: 'manual', platform }),
  });
}

export async function startRecording(recordingId: number) {
  return request<{ recording: Recording }>(`/recordings/${recordingId}/start`, {
    method: 'POST',
    body: JSON.stringify({ startedAt: new Date().toISOString() }),
  });
}

export async function stopRecording(recordingId: number, payload: { occasion: string; location: string; transcriptText: string }) {
  return request<{ recording: Recording }>(`/recordings/${recordingId}/stop`, {
    method: 'POST',
    body: JSON.stringify({
      stoppedAt: new Date().toISOString(),
      occasion: payload.occasion,
      location: payload.location,
      transcriptText: payload.transcriptText,
    }),
  });
}

export async function createContactFromRecording(payload: {
  recordingId: number;
  contactId?: number;
  profile: {
    name: string;
    title: string;
    company: string;
    location: string;
    linkedIn: string;
    twitter: string;
    instagram: string;
    github: string;
    transcriptText: string;
    occasion: string;
    platform: string;
    locationContext: string;
  };
}) {
  return request<{ contact: Contact }>('/contacts/from-recording', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAllActions(status = 'open') {
  return request<{ items: SuggestedAction[] }>(`/actions?status=${encodeURIComponent(status)}`);
}

export async function executeAction(actionId: number, channel: string) {
  return request<{ execution: { status: string; draft: { subject: string; body: string } } }>(`/actions/${actionId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ channel, payload: {} }),
  });
}

export async function completeAction(actionId: number) {
  return request<{ action: SuggestedAction }>(`/actions/${actionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ completed: true }),
  });
}

export async function getSettings() {
  return request<AppSettings>('/settings');
}

export async function updateSettings(payload: Partial<AppSettings>) {
  return request<{ settings: AppSettings }>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getIntegrations() {
  return request<{ items: IntegrationItem[] }>('/integrations');
}

export async function connectIntegration(provider: string, scopes: string[]) {
  return request<{ integration: { provider: string; status: string } }>(`/integrations/${provider}/connect`, {
    method: 'POST',
    body: JSON.stringify({ scopes }),
  });
}

export async function disconnectIntegration(provider: string) {
  return request<{ success: boolean }>(`/integrations/${provider}`, {
    method: 'DELETE',
  });
}

export async function exportData(format: 'json' | 'csv') {
  return request<{ exportId: number; status: string; path: string }>('/exports', {
    method: 'POST',
    body: JSON.stringify({ format }),
  });
}

export async function sendAssistantMessage(payload: { chatSessionId?: number | null; content: string }) {
  return request<{
    chatSessionId: number;
    message: { role: 'assistant'; content: string; recommendations: ChatRecommendation[] };
  }>('/assistant/messages', {
    method: 'POST',
    body: JSON.stringify({ role: 'user', content: payload.content, chatSessionId: payload.chatSessionId }),
  });
}

export async function draftAssistantMessage(payload: { contactId?: number; goal: string }) {
  return request<{ subject: string; body: string }>('/assistant/draft-message', {
    method: 'POST',
    body: JSON.stringify({
      targetType: payload.contactId ? 'contact' : 'external',
      contactId: payload.contactId,
      goal: payload.goal,
    }),
  });
}

export async function uploadAudioForTranscription(audio: Blob) {
  const headers = new Headers();
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const formData = new FormData();
  formData.append('audio', audio, 'recording.wav');

  const response = await fetch(`${API_BASE}/transcriptions/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(response.status, formatApiErrorMessage(data.detail, 'Transcription failed'));
  }
  return data as { transcript: string };
}

export async function uploadImageForOcr(image: File) {
  const headers = new Headers();
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const formData = new FormData();
  formData.append('image', image);

  const response = await fetch(`${API_BASE}/ocr/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(response.status, formatApiErrorMessage(data.detail, 'OCR failed'));
  }
  return data as { text: string };
}
