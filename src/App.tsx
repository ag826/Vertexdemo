import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Mic, Search, Settings, LogOut } from 'lucide-react';
import { RecordingView } from './components/RecordingView';
import { PersonaCard } from './components/PersonaCard';
import { ContactList } from './components/ContactList';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PersonaCreatorView } from './components/PersonaCreatorView';
import { RecordingReviewView } from './components/RecordingReviewView';
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
  transcribeRecording,
  linkRecordingToContact,
  updateContactNotes,
  uploadRecordingMedia,
} from './lib/api';

interface DraftRecording {
  id: string;
  durationSeconds: number;
  transcriptText: string;
}

type MainTab = 'contacts' | 'record' | 'settings';
type FlowView = 'list' | 'recording' | 'reviewRecording' | 'createPersona' | 'persona';

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

  const [tab, setTab] = useState<MainTab>('contacts');
  const [currentView, setCurrentView] = useState<FlowView>('list');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [isRecordingProcessing, setIsRecordingProcessing] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [isLinkingRecording, setIsLinkingRecording] = useState(false);
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
    if (!token || tab !== 'contacts' || currentView !== 'list') {
      return;
    }
    const timeout = setTimeout(() => {
      refreshContacts(token, searchQuery);
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchQuery, token, refreshContacts, tab, currentView]);

  useEffect(() => {
    if (tab === 'record' && currentView === 'list') {
      setCurrentView('recording');
    }
    if (tab !== 'record' && currentView === 'recording') {
      setCurrentView('list');
    }
  }, [tab, currentView]);

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
    setTab('record');
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

      let transcriptText = '';
      try {
        const transcribed = await transcribeRecording(token, recording.id);
        transcriptText = String(transcribed.transcriptText || '').trim();
      } catch {
        transcriptText = '';
      }

      if (!transcriptText) {
        transcriptText = 'Transcription was not generated automatically. You can type or paste notes here.';
      }

      setDraftRecording({
        id: recording.id,
        durationSeconds: payload.durationSeconds,
        transcriptText,
      });
      setCurrentView('reviewRecording');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save recording');
      setCurrentView('list');
      setTab('contacts');
    } finally {
      setIsRecordingProcessing(false);
    }
  };

  const handleLinkRecordingToContact = async (contactId: string) => {
    if (!token || !draftRecording) {
      return;
    }
    setIsLinkingRecording(true);
    setErrorMessage(null);
    try {
      const result = await linkRecordingToContact(token, draftRecording.id, {
        contactId,
        transcriptText: draftRecording.transcriptText,
        appendToNotes: true,
      });
      setContacts((prev) => prev.map((contact) => (contact.id === result.contact.id ? result.contact : contact)));
      setSelectedContact(result.contact);
      setCurrentView('persona');
      setDraftRecording(null);
      setTab('contacts');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not link recording to contact');
    } finally {
      setIsLinkingRecording(false);
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
      setTab('contacts');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create contact');
    } finally {
      setIsCreatingPersona(false);
    }
  };

  const handleSignOut = async () => {
    if (!token) {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      return;
    }
    try {
      await signOut(token);
    } finally {
      setStoredToken(null);
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
    return <RecordingView onStop={handleStopRecording} onBack={() => { setTab('contacts'); setCurrentView('list'); }} isProcessing={isRecordingProcessing} />;
  }

  if (currentView === 'reviewRecording' && draftRecording) {
    return (
      <RecordingReviewView
        transcriptText={draftRecording.transcriptText}
        contacts={contacts}
        isLinking={isLinkingRecording}
        onBack={() => { setTab('contacts'); setCurrentView('list'); setDraftRecording(null); }}
        onTranscriptChange={(transcriptText) => setDraftRecording((prev) => (prev ? { ...prev, transcriptText } : prev))}
        onLinkToContact={handleLinkRecordingToContact}
        onCreateNew={() => setCurrentView('createPersona')}
      />
    );
  }

  if (currentView === 'createPersona' && draftRecording) {
    return (
      <PersonaCreatorView
        durationSeconds={draftRecording.durationSeconds}
        initialNotes={draftRecording.transcriptText}
        isSaving={isCreatingPersona}
        onBack={() => setCurrentView('reviewRecording')}
        onSave={handleCreatePersona}
      />
    );
  }

  if (currentView === 'persona' && selectedContact) {
    return (
      <PersonaCard
        contact={selectedContact}
        onBack={() => setCurrentView('list')}
        onUpdateNotes={handleUpdateNotes}
      />
    );
  }

  const NavButton = ({ id, label, icon }: { id: MainTab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => {
        setTab(id);
        setCurrentView(id === 'record' ? 'recording' : 'list');
      }}
      className={`vx-nav-btn ${tab === id ? 'is-active' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="vx-app vx-shell">
      <aside className="vx-sidebar">
        <div className="vx-brand">Vertex</div>
        <NavButton id="contacts" label="Contacts" icon={<Home size={16} />} />
        <NavButton id="record" label="Record" icon={<Mic size={16} />} />
        <NavButton id="settings" label="Settings" icon={<Settings size={16} />} />
      </aside>

      <div className="vx-main">
        <header className="vx-topbar">
          <div className="vx-topbar-inner">
            <div className="vx-row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="vx-h3">Vertex</div>
                {headerSubtitle && <div className="vx-caption">{headerSubtitle}</div>}
              </div>
              <button className="vx-btn vx-btn-ghost" onClick={handleSignOut}>
                <span className="vx-row"><LogOut size={14} /> Log out</span>
              </button>
            </div>
            {tab === 'contacts' && (
              <div style={{ marginTop: 12, position: 'relative' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  placeholder="Search contacts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="vx-input"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            )}
          </div>
        </header>

        <main className="vx-content">
          {errorMessage && <div className="vx-alert" style={{ marginBottom: 12 }}>{errorMessage}</div>}

          {tab === 'contacts' && (
            <ContactList
              contacts={contacts}
              onViewContact={(contact) => { setSelectedContact(contact); setCurrentView('persona'); }}
              searchQuery={searchQuery}
              isLoading={isContactsLoading}
            />
          )}

          {tab === 'settings' && (
            <section className="vx-section vx-col" style={{ maxWidth: 620 }}>
              <h2 className="vx-h3">Settings</h2>
              <div className="vx-caption">Signed in as {user.name}</div>
              <div className="vx-row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <div>
                  <div className="vx-body" style={{ fontWeight: 600 }}>Google sign-in</div>
                  <div className="vx-caption">{authProviders.google ? 'Enabled' : 'Not configured'}</div>
                </div>
                <span className="vx-badge">{authProviders.google ? 'On' : 'Off'}</span>
              </div>
              <button className="vx-btn" style={{ width: 'fit-content' }} onClick={handleSignOut}>Sign out</button>
            </section>
          )}
        </main>
      </div>

      <nav className="vx-bottom-nav" aria-label="Main navigation">
        <NavButton id="contacts" label="Contacts" icon={<Home size={18} />} />
        <NavButton id="record" label="Record" icon={<Mic size={18} />} />
        <NavButton id="settings" label="Settings" icon={<Settings size={18} />} />
      </nav>
    </div>
  );
}
