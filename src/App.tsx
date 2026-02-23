import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { RecordingView } from './components/RecordingView';
import { PersonaCard } from './components/PersonaCard';
import { ContactList } from './components/ContactList';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PersonaCreatorView } from './components/PersonaCreatorView';
import type { Contact, User } from './types';
import {
  createContact,
  createRecording,
  getAuthProviders,
  getGoogleAuthStartUrl,
  getMe,
  getStoredToken,
  listContacts,
  loginWithPassword,
  registerWithPassword,
  setStoredToken,
  signOut,
  updateContactNotes,
  uploadRecordingMedia,
} from './lib/api';

interface DraftRecording {
  id: string;
  durationSeconds: number;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert audio blob'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authProviders, setAuthProviders] = useState<{ google: boolean; local: boolean }>({
    google: false,
    local: true,
  });

  const [currentView, setCurrentView] = useState<'list' | 'recording' | 'createPersona' | 'persona'>('list');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [isRecordingProcessing, setIsRecordingProcessing] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [draftRecording, setDraftRecording] = useState<DraftRecording | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshContacts = useCallback(async (activeToken: string, query = '') => {
    setIsContactsLoading(true);
    try {
      const data = await listContacts(activeToken, query);
      setContacts(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load contacts');
    } finally {
      setIsContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const providers = await getAuthProviders();
        setAuthProviders(providers);
      } catch {
        setAuthProviders({ google: false, local: true });
      }

      const params = new URLSearchParams(window.location.search);
      const callbackToken = params.get('token');
      const callbackError = params.get('error');

      if (window.location.pathname === '/auth/callback') {
        if (callbackToken) {
          setStoredToken(callbackToken);
        }
        if (callbackError) {
          setErrorMessage(`Google sign-in failed: ${callbackError}`);
        }
        window.history.replaceState({}, document.title, '/');
      }

      const stored = getStoredToken();
      if (!stored) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const me = await getMe(stored);
        setToken(stored);
        setUser(me);
        await refreshContacts(stored);
      } catch {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initialize();
  }, [refreshContacts]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeout = setTimeout(() => {
      refreshContacts(token, searchQuery);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, token, refreshContacts]);

  const handleGoogleSignIn = () => {
    setErrorMessage(null);
    window.location.href = getGoogleAuthStartUrl();
  };

  const handleRegister = async (payload: { username: string; password: string; name?: string; email?: string }) => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const auth = await registerWithPassword(payload);
      setToken(auth.token);
      setUser(auth.user);
      await refreshContacts(auth.token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSigningIn(false);
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (payload: { username: string; password: string }) => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const auth = await loginWithPassword(payload);
      setToken(auth.token);
      setUser(auth.user);
      await refreshContacts(auth.token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsSigningIn(false);
      setIsAuthLoading(false);
    }
  };

  const handleStartRecording = () => {
    setCurrentView('recording');
    setErrorMessage(null);
  };

  const handleStopRecording = async (payload: { durationSeconds: number; audioBlob: Blob }) => {
    if (!token) {
      return;
    }

    setIsRecordingProcessing(true);
    setErrorMessage(null);

    try {
      const recording = await createRecording(token, payload.durationSeconds);
      const dataUrl = await blobToDataUrl(payload.audioBlob);

      await uploadRecordingMedia(token, recording.id, {
        audioUrl: dataUrl,
        transcriptText: '',
      });

      setDraftRecording({
        id: recording.id,
        durationSeconds: payload.durationSeconds,
      });
      setCurrentView('createPersona');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save recording');
      setCurrentView('list');
    } finally {
      setIsRecordingProcessing(false);
    }
  };

  const handleCreatePersona = async (payload: {
    name: string;
    title: string;
    company: string;
    location: string;
    linkedInUrl?: string;
    notes: string;
    keyFacts: Contact['keyFacts'];
    funFacts: Contact['funFacts'];
    conversationDuration: string;
  }) => {
    if (!token || !draftRecording) {
      return;
    }

    setIsCreatingPersona(true);
    setErrorMessage(null);

    try {
      const contact = await createContact(token, {
        ...payload,
        recordingId: draftRecording.id,
      });

      setContacts((prev) => [contact, ...prev]);
      setSelectedContact(contact);
      setCurrentView('persona');
      setDraftRecording(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create persona');
    } finally {
      setIsCreatingPersona(false);
    }
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentView('persona');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedContact(null);
    setDraftRecording(null);
  };

  const handleSignOut = async () => {
    if (!token) {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setContacts([]);
      setCurrentView('list');
      setSelectedContact(null);
      return;
    }

    try {
      await signOut(token);
    } catch {
      setStoredToken(null);
    } finally {
      setToken(null);
      setUser(null);
      setContacts([]);
      setCurrentView('list');
      setSelectedContact(null);
      setDraftRecording(null);
      setErrorMessage(null);
    }
  };

  const handleUpdateNotes = async (contactId: string, notes: string) => {
    if (!token) {
      return;
    }

    const optimistic = contacts.map((c) => (c.id === contactId ? { ...c, notes } : c));
    setContacts(optimistic);
    if (selectedContact?.id === contactId) {
      setSelectedContact({ ...selectedContact, notes });
    }

    try {
      const updated = await updateContactNotes(token, contactId, notes);
      setContacts((prev) => prev.map((contact) => (contact.id === updated.id ? updated : contact)));
      if (selectedContact?.id === contactId) {
        setSelectedContact(updated);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update notes');
      await refreshContacts(token, searchQuery);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (isContactsLoading) {
      return 'Syncing contacts...';
    }
    if (user) {
      return `Signed in as ${user.name}`;
    }
    return '';
  }, [isContactsLoading, user]);

  if (!token || !user) {
    return (
      <WelcomeScreen
        onGoogleSignIn={handleGoogleSignIn}
        onRegister={handleRegister}
        onLogin={handleLogin}
        googleEnabled={authProviders.google}
        isLoading={isSigningIn || isAuthLoading}
        errorMessage={errorMessage}
      />
    );
  }

  if (currentView === 'recording') {
    return (
      <RecordingView
        onStop={handleStopRecording}
        onBack={handleBackToList}
        isProcessing={isRecordingProcessing}
      />
    );
  }

  if (currentView === 'createPersona' && draftRecording) {
    return (
      <PersonaCreatorView
        durationSeconds={draftRecording.durationSeconds}
        isSaving={isCreatingPersona}
        onBack={handleBackToList}
        onSave={handleCreatePersona}
      />
    );
  }

  if (currentView === 'persona' && selectedContact) {
    return (
      <PersonaCard
        contact={selectedContact}
        onBack={handleBackToList}
        onUpdateNotes={handleUpdateNotes}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-white">Vertex</h1>
            <button
              onClick={handleSignOut}
              className="text-slate-300 text-sm px-3 py-1.5 border border-slate-700 rounded-lg hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
          {headerSubtitle && <p className="text-slate-400 text-sm mt-1">{headerSubtitle}</p>}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-400"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}
        <ContactList contacts={contacts} onViewContact={handleViewContact} searchQuery={searchQuery} />
      </main>

      <button
        onClick={handleStartRecording}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-blue-400 to-purple-400 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-purple-500 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        aria-label="Start new recording"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
