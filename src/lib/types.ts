export interface TranscriptDetail {
  id?: number;
  platform: 'In-Person' | 'Phone Call' | 'Video Call' | 'Email' | 'LinkedIn Message' | 'Text Message';
  occasion: string;
  date: string;
  time: string;
  location?: string;
  fullTranscript: string;
  highlightedText: string;
}

export interface Insight {
  id: number;
  text: string;
  source: 'Conversation' | 'LinkedIn' | 'Mutual Connection' | 'Website' | 'Social Media' | 'Email';
  category: 'Professional' | 'Personal' | 'Interest' | 'Background' | 'Goal';
  transcript?: TranscriptDetail | null;
}

export interface SuggestedAction {
  id: number;
  contactId?: number;
  contactName?: string;
  contactImage?: string;
  contactTitle?: string;
  contactCompany?: string;
  type: 'email' | 'meeting' | 'follow-up' | 'introduction' | 'share' | 'call';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string | null;
  status?: 'open' | 'completed';
  transcript?: TranscriptDetail | null;
}

export interface ContactSummary {
  id: number;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedInUrl: string;
  profileImage: string;
  dateAdded: string;
  notesPreview: string;
  conversationDuration: string;
  conversationDurationSeconds: number;
  insightCount: number;
}

export interface Contact {
  id: number;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedInUrl: string;
  profileImage: string;
  dateAdded: string;
  notes: string;
  socialProfiles: Record<string, string>;
  keyFacts: Insight[];
  funFacts: Insight[];
  suggestedActions: SuggestedAction[];
  conversations?: TranscriptDetail[];
  conversationDuration: string;
  conversationDurationSeconds: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  theme?: 'light' | 'dark';
}

export interface IntegrationItem {
  provider: string;
  name: string;
  status: 'connected' | 'disconnected' | 'pending';
  permissions: string[];
  lastSyncAt?: string | null;
  description: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  notifications: Record<string, unknown>;
  privacy: Record<string, unknown>;
  exportAvailable: boolean;
  aiConfigured?: boolean;
  aiModel?: string;
}

export interface Recording {
  id: number;
  status: string;
  platform: string;
  occasion: string;
  location: string;
  transcript_text: string;
  duration_seconds: number;
  extractedProfile?: {
    name: string;
    title: string;
    company: string;
    location: string;
    notes: string;
  };
  proposedInsights?: Array<{ text: string; category: string; source: string }>;
  proposedActions?: Array<{ title: string; type: string; priority: string }>;
}

export interface ChatRecommendation {
  contactType: 'In Your Network' | 'Suggested Contact' | 'Industry Expert' | 'Mutual Connection';
  name?: string;
  role: string;
  company: string;
  explanation: string;
  suggestedQuestions: string[];
  inNetwork: boolean;
  contactId?: number;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  recommendations?: ChatRecommendation[];
}
