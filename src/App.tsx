import { useEffect, useState, type ReactNode } from 'react';
import { Search, Plus, Users as UsersIcon, Zap, Settings as SettingsIcon, MessageCircle, LogOut } from 'lucide-react';
import { AllActionsView } from './components/AllActionsView';
import { ChatAssistant } from './components/ChatAssistant';
import { ContactList } from './components/ContactList';
import { PersonaCard } from './components/PersonaCard';
import { SettingsView } from './components/SettingsView';
import { ThemeProvider } from './components/ThemeContext';
import { TranscribingView } from './components/TranscribingView';
import { WelcomeScreen } from './components/WelcomeScreen';
import { completeAction, deleteContact, executeAction, getContact, getContacts, getMe, login, refreshContactAnalysis, register, setStoredToken, updateContactNotes } from './lib/api';
import type { Contact, ContactSummary, SuggestedAction, User } from './lib/types';
import vertexLogo from 'figma:asset/62edb3c51125a4b122ed2c06dafbbf9a9e7bec60.png';

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [authError, setAuthError] = useState('');
  const [currentView, setCurrentView] = useState<'list' | 'recording' | 'persona'>('list');
  const [activeTab, setActiveTab] = useState<'contacts' | 'actions' | 'chat' | 'settings'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [recordingContact, setRecordingContact] = useState<Contact | null>(null);
  const [selectedContactLoading, setSelectedContactLoading] = useState(false);
  const [selectedContactError, setSelectedContactError] = useState('');

  const loadCurrentUser = async () => {
    try {
      const response = await getMe();
      setUser(response.user);
      setAuthError('');
    } catch (error) {
      setStoredToken(null);
      setUser(null);
      setAuthError(error instanceof Error ? error.message : 'Unable to restore session');
    } finally {
      setIsBooting(false);
    }
  };

  const loadContacts = async (search = searchQuery) => {
    if (!user) return;
    setContactsLoading(true);
    setContactsError('');
    try {
      const response = await getContacts(search);
      setContacts(response.items);
    } catch (error) {
      setContactsError(error instanceof Error ? error.message : 'Unable to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const timeout = window.setTimeout(() => {
      void loadContacts();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [user, searchQuery]);

  const handleAuthSubmit = async (payload: { mode: 'login' | 'register'; name?: string; email: string; password: string }) => {
    const response = payload.mode === 'register'
      ? await register({ name: payload.name || '', email: payload.email, password: payload.password })
      : await login({ email: payload.email, password: payload.password });
    setStoredToken(response.token);
    setUser(response.user);
    setCurrentView('list');
    setActiveTab('contacts');
    await loadContacts('');
  };

  const handleViewContact = async (contactId: number) => {
    setSelectedContactLoading(true);
    setSelectedContactError('');
    try {
      const response = await getContact(contactId);
      setSelectedContact(response.contact);
      setCurrentView('persona');
    } catch (error) {
      setSelectedContactError(error instanceof Error ? error.message : 'Unable to load contact');
    } finally {
      setSelectedContactLoading(false);
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedContact(null);
    setRecordingContact(null);
    setSelectedContactError('');
  };

  const handleUpdateNotes = async (contactId: number, notes: string) => {
    const response = await updateContactNotes(contactId, notes);
    setSelectedContact(response.contact);
    await loadContacts();
  };

  const handleDeleteContact = async (contactId: number) => {
    await deleteContact(contactId);
    setSelectedContact(null);
    setRecordingContact(null);
    setCurrentView('list');
    await loadContacts('');
  };

  const handleRefreshContact = async (contactId: number) => {
    const response = await refreshContactAnalysis(contactId);
    setSelectedContact(response.contact);
    await loadContacts();
  };

  const refreshSelectedContact = async () => {
    if (!selectedContact) return;
    const response = await getContact(selectedContact.id);
    setSelectedContact(response.contact);
  };

  const handleExecuteAction = async (action: SuggestedAction) => {
    const response = await executeAction(action.id, action.type === 'meeting' ? 'calendar' : 'email');
    return response.execution.draft;
  };

  const handleCompleteAction = async (action: SuggestedAction) => {
    await completeAction(action.id);
    await refreshSelectedContact();
    await loadContacts();
  };

  const handleContactCreated = async (contact: Contact) => {
    setSelectedContact(contact);
    setRecordingContact(null);
    setCurrentView('persona');
    await loadContacts('');
  };

  const handleStartGeneralRecording = () => {
    setRecordingContact(null);
    setCurrentView('recording');
  };

  const handleStartContactRecording = () => {
    if (!selectedContact) return;
    setRecordingContact(selectedContact);
    setCurrentView('recording');
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setContacts([]);
    setSelectedContact(null);
    setCurrentView('list');
    setActiveTab('contacts');
  };

  if (isBooting) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">Loading Vertex...</div>;
  }

  if (!user) {
    return <WelcomeScreen onSubmit={handleAuthSubmit} />;
  }

  if (currentView === 'recording') {
    return (
      <TranscribingView
        onStop={handleContactCreated}
        onBack={() => {
          setCurrentView(selectedContact ? 'persona' : 'list');
          setRecordingContact(null);
        }}
        existingContact={recordingContact}
      />
    );
  }

  if (currentView === 'persona') {
    if (selectedContactLoading) {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">Loading contact...</div>;
    }
    if (selectedContactError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="mb-4">{selectedContactError}</p>
            <button onClick={handleBackToList} className="rounded-lg bg-white px-4 py-2 border border-red-200">
              Back
            </button>
          </div>
        </div>
      );
    }
    if (selectedContact) {
      return (
        <PersonaCard
          contact={selectedContact}
          onBack={handleBackToList}
          onUpdateNotes={handleUpdateNotes}
          onExecuteAction={handleExecuteAction}
          onCompleteAction={handleCompleteAction}
          onAddConversation={handleStartContactRecording}
          onDeleteContact={handleDeleteContact}
          onRefreshContact={handleRefreshContact}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <img src={vertexLogo} alt="Vertex" className="h-10" />
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
              <LogOut className="w-4 h-4" />
              <span>{user.name}</span>
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <TabButton active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} icon={<UsersIcon className="w-4 h-4" />} label="Contacts" />
            <TabButton active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} icon={<Zap className="w-4 h-4" />} label="Actions" />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle className="w-4 h-4" />} label="Chat" />
            <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon className="w-4 h-4" />} label="Settings" />
          </div>

          {activeTab === 'contacts' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {authError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</div>}
        {activeTab === 'contacts' ? (
          contactsLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading contacts...</div>
          ) : contactsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              <p className="mb-3">{contactsError}</p>
              <button onClick={() => void loadContacts()} className="rounded-lg bg-white px-4 py-2 border border-red-200">
                Retry
              </button>
            </div>
          ) : (
            <ContactList contacts={contacts} onViewContact={handleViewContact} searchQuery={searchQuery} />
          )
        ) : activeTab === 'actions' ? (
          <AllActionsView />
        ) : activeTab === 'chat' ? (
          <ChatAssistant onViewContact={handleViewContact} />
        ) : (
          <SettingsView />
        )}
      </main>

      <button
        onClick={handleStartGeneralRecording}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-cyan-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
        aria-label="Start new transcription"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-all ${
        active
          ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-sm dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700'
          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
