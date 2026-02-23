export interface TranscriptDetail {
  id?: string;
  platform: 'In-Person' | 'Phone Call' | 'Video Call' | 'Email' | 'LinkedIn Message' | 'Text Message';
  occasion: string;
  date: string;
  time: string;
  location?: string;
  fullTranscript: string;
  highlightedText: string;
}

export interface Insight {
  id?: string;
  text: string;
  source: 'Conversation' | 'LinkedIn' | 'Mutual Connection' | 'Website' | 'Social Media' | 'Email';
  category: 'Professional' | 'Personal' | 'Interest' | 'Background' | 'Goal';
  transcriptId?: string;
  transcript?: TranscriptDetail;
}

export interface SuggestedAction {
  id: string;
  type: 'email' | 'meeting' | 'follow-up' | 'introduction' | 'share' | 'call';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  transcriptId?: string;
  transcript: TranscriptDetail;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedInUrl: string;
  profileImage: string;
  dateAdded: string;
  notes: string;
  keyFacts: Insight[];
  funFacts: Insight[];
  suggestedActions: SuggestedAction[];
  conversationDuration: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  authProviders?: string[];
}

export interface Recording {
  id: string;
  status: 'created' | 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed';
  durationSeconds: number;
  contactId: string | null;
  lastError: string | null;
}
