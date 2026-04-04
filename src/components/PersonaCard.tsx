import { useState } from 'react';
import { ArrowLeft, Briefcase, MapPin, Linkedin, Clock, Lightbulb, AlertCircle, Edit2, Check, X, MessageSquare, Users, Globe, Mail, Hash, ChevronRight, FileText, Plus, Trash2, RefreshCcw } from 'lucide-react';
import type { Contact, Insight, SuggestedAction } from '../lib/types';
import { TranscriptModal } from './TranscriptModal';
import { SuggestedActions } from './SuggestedActions';

interface PersonaCardProps {
  contact: Contact;
  onBack: () => void;
  onUpdateNotes: (contactId: number, notes: string) => Promise<void>;
  onExecuteAction: (action: SuggestedAction) => Promise<{ subject?: string; body?: string } | void>;
  onCompleteAction: (action: SuggestedAction) => Promise<void>;
  onAddConversation: () => void;
  onDeleteContact: (contactId: number) => Promise<void>;
  onRefreshContact: (contactId: number) => Promise<void>;
}

export function PersonaCard({ contact, onBack, onUpdateNotes, onExecuteAction, onCompleteAction, onAddConversation, onDeleteContact, onRefreshContact }: PersonaCardProps) {
  const [selectedInsight, setSelectedInsight] = useState<{ insight: Insight; text: string } | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(contact.notes);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAllKeyFacts, setShowAllKeyFacts] = useState(false);
  const [showAllFunFacts, setShowAllFunFacts] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSaveNotes = async () => {
    setSaveError('');
    setIsSaving(true);
    try {
      await onUpdateNotes(contact.id, editedNotes);
      setIsEditingNotes(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedNotes(contact.notes);
    setSaveError('');
    setIsEditingNotes(false);
  };

  const handleDeleteContact = async () => {
    const confirmed = window.confirm(`Delete ${contact.name}? This will remove this contact, all transcripts, insights, and actions.`);
    if (!confirmed) return;
    setDeleteError('');
    setIsDeleting(true);
    try {
      await onDeleteContact(contact.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete contact');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefreshContact = async () => {
    setRefreshError('');
    setIsRefreshing(true);
    try {
      await onRefreshContact(contact.id);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Unable to refresh contact analysis');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Professional':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Personal':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Background':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  const getCategoryIcon = (category: Insight['category']) => {
    switch (category) {
      case 'Professional':
        return '💼';
      case 'Personal':
        return '👤';
      case 'Interest':
        return '🎯';
      case 'Background':
        return '📚';
      case 'Goal':
        return '🚀';
    }
  };

  const getSourceIcon = (source: Insight['source']) => {
    switch (source) {
      case 'Conversation':
        return <MessageSquare className="w-3 h-3" />;
      case 'LinkedIn':
        return <Linkedin className="w-3 h-3" />;
      case 'Mutual Connection':
        return <Users className="w-3 h-3" />;
      case 'Website':
        return <Globe className="w-3 h-3" />;
      case 'Social Media':
        return <Hash className="w-3 h-3" />;
      case 'Email':
        return <Mail className="w-3 h-3" />;
    }
  };

  const visibleKeyFacts = showAllKeyFacts ? contact.keyFacts : contact.keyFacts.slice(0, 3);
  const visibleFunFacts = showAllFunFacts ? contact.funFacts : contact.funFacts.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to contacts</span>
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-8">
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="px-6 pt-8 pb-6">
            <div className="flex flex-col items-center text-center mb-6">
              <img src={contact.profileImage} alt={contact.name} className="w-32 h-32 rounded-full border-4 border-teal-200 object-cover mb-4 shadow-lg" />
              <h1 className="text-slate-900 mb-2">{contact.name}</h1>
              <div className="flex items-center gap-2 text-slate-700 mb-1">
                <Briefcase className="w-4 h-4 text-teal-600" />
                <span className="font-medium">{contact.title}</span>
              </div>
              <div className="text-slate-600 mb-3">{contact.company}</div>
              <div className="flex items-center gap-4 text-slate-600 text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{contact.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{contact.conversationDuration} talk</span>
                </div>
              </div>
            </div>

            {contact.linkedInUrl ? (
              <a
                href={contact.linkedInUrl.startsWith('http') ? contact.linkedInUrl : `https://${contact.linkedInUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-medium shadow-lg"
              >
                <Linkedin className="w-5 h-5" />
                <span>View LinkedIn Profile</span>
              </a>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm text-slate-500">
                No LinkedIn profile linked yet.
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-6 space-y-4">
          <SuggestedActions
            actions={contact.suggestedActions}
            contactName={contact.name}
            onExecute={onExecuteAction}
            onComplete={onCompleteAction}
          />

          <section className="bg-teal-50 rounded-xl p-6 border border-teal-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shadow-sm">
                <AlertCircle className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="text-slate-900 font-semibold text-lg">Things to Know</h2>
            </div>
            {contact.keyFacts.length === 0 ? (
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-4 text-sm text-slate-500">
                No professional insights extracted yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {visibleKeyFacts.map((insight, index) => (
                  <li key={insight.id}>
                    <button
                      onClick={() => insight.transcript && setSelectedInsight({ insight, text: insight.text })}
                      className={`w-full bg-white rounded-lg p-4 border border-slate-200 shadow-sm text-left transition-all ${
                        insight.transcript ? 'hover:border-teal-300 hover:shadow-md cursor-pointer' : ''
                      }`}
                      disabled={!insight.transcript}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-teal-700 text-xs font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="leading-relaxed font-medium text-slate-900 flex-1">{insight.text}</span>
                            {insight.transcript && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-9 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                          {getSourceIcon(insight.source)}
                          <span>{insight.source}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${getCategoryColor(insight.category)}`}>
                          <span>{getCategoryIcon(insight.category)}</span>
                          <span>{insight.category}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {contact.keyFacts.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllKeyFacts((prev) => !prev)}
                className="mt-4 rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
              >
                {showAllKeyFacts ? 'Show less' : `Show all (${contact.keyFacts.length})`}
              </button>
            )}
          </section>

          <section className="bg-purple-50 rounded-xl p-6 border border-purple-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shadow-sm">
                <Lightbulb className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-slate-900 font-semibold text-lg">Fun Facts & Interests</h2>
            </div>
            {contact.funFacts.length === 0 ? (
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-4 text-sm text-slate-500">
                No personal insights extracted yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {visibleFunFacts.map((insight) => (
                  <li key={insight.id}>
                    <button
                      onClick={() => insight.transcript && setSelectedInsight({ insight, text: insight.text })}
                      className={`w-full bg-white rounded-lg p-4 border border-slate-200 shadow-sm text-left transition-all ${
                        insight.transcript ? 'hover:border-purple-300 hover:shadow-md cursor-pointer' : ''
                      }`}
                      disabled={!insight.transcript}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-purple-600 text-xl leading-none flex-shrink-0">•</span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="leading-relaxed font-medium text-slate-900 flex-1">{insight.text}</span>
                            {insight.transcript && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-7 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                          {getSourceIcon(insight.source)}
                          <span>{insight.source}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${getCategoryColor(insight.category)}`}>
                          <span>{getCategoryIcon(insight.category)}</span>
                          <span>{insight.category}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {contact.funFacts.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllFunFacts((prev) => !prev)}
                className="mt-4 rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
              >
                {showAllFunFacts ? 'Show less' : `Show all (${contact.funFacts.length})`}
              </button>
            )}
          </section>

          <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 font-semibold text-lg">Conversation Notes</h2>
              {!isEditingNotes && (
                <button onClick={() => setIsEditingNotes(true)} className="text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 text-sm font-medium">
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={editedNotes}
                  onChange={(event) => setEditedNotes(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 min-h-[120px] resize-none placeholder-slate-400"
                  placeholder="Add notes from your conversation..."
                />
                {saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>}
                <div className="flex gap-2">
                  <button onClick={handleSaveNotes} disabled={isSaving} className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-medium shadow-sm disabled:opacity-60">
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEdit} className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium border border-slate-300">
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{contact.notes || 'No notes added yet.'}</p>
              </div>
            )}
          </section>

          <section className="bg-blue-50 rounded-xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-slate-900 font-semibold text-lg">Conversation Transcript</h2>
            </div>
            {contact.conversations && contact.conversations.length > 0 ? (
              <div className="space-y-4">
                {contact.conversations.map((conversation, index) => (
                  <div key={`${conversation.id ?? index}-${conversation.date}-${conversation.time}`} className="rounded-lg bg-white border border-blue-200 p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">{conversation.platform}</span>
                      <span>{conversation.date}</span>
                      <span>•</span>
                      <span>{conversation.time}</span>
                      {conversation.location && (
                        <>
                          <span>•</span>
                          <span>{conversation.location}</span>
                        </>
                      )}
                    </div>
                    <div className="mb-2 text-sm font-medium text-slate-800">{conversation.occasion || 'Conversation context'}</div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{conversation.fullTranscript}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-4 text-sm text-slate-500">
                No transcript saved for this contact yet.
              </div>
            )}
          </section>

          <div className="text-center text-slate-500 text-sm pt-2">
            Added {new Date(contact.dateAdded).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <h2 className="text-blue-900 font-semibold text-lg mb-2">Refresh Gemini Analysis</h2>
            <p className="text-sm text-blue-800 mb-4">
              Manually rerun Gemini extraction for Things to Know, Fun Facts, and Suggested Actions using all saved conversation notes.
            </p>
            {refreshError && <div className="mb-3 rounded-lg border border-blue-300 bg-white px-4 py-3 text-sm text-blue-800">{refreshError}</div>}
            <button
              type="button"
              onClick={() => void handleRefreshContact()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh with Gemini'}
            </button>
          </section>

          <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-red-900 font-semibold text-lg mb-2">Delete Contact</h2>
            <p className="text-sm text-red-800 mb-4">
              This permanently removes this contact and all related recordings, transcript highlights, insights, and actions.
            </p>
            {deleteError && <div className="mb-3 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm text-red-700">{deleteError}</div>}
            <button
              type="button"
              onClick={() => void handleDeleteContact()}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </button>
          </section>
        </div>
      </div>

      {selectedInsight?.insight.transcript && (
        <TranscriptModal
          isOpen
          onClose={() => setSelectedInsight(null)}
          transcript={selectedInsight.insight.transcript}
          insightText={selectedInsight.text}
        />
      )}

      <button
        onClick={onAddConversation}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-cyan-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white"
        aria-label={`Add conversation for ${contact.name}`}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
