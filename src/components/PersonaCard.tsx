import { useState } from 'react';
import { ArrowLeft, Briefcase, MapPin, Linkedin, Clock, Lightbulb, AlertCircle, Edit2, Check, X, MessageSquare, Link as LinkIcon, Users, Globe, Mail, Hash, ChevronRight } from 'lucide-react';
import type { Contact, Insight } from '../App';
import { TranscriptModal } from './TranscriptModal';
import { SuggestedActions } from './SuggestedActions';

interface PersonaCardProps {
  contact: Contact;
  onBack: () => void;
  onUpdateNotes: (contactId: string, notes: string) => void;
}

export function PersonaCard({ contact, onBack, onUpdateNotes }: PersonaCardProps) {
  const [selectedInsight, setSelectedInsight] = useState<{ insight: Insight; text: string } | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(contact.notes);

  const handleSaveNotes = () => {
    onUpdateNotes(contact.id, editedNotes);
    setIsEditingNotes(false);
  };

  const handleCancelEdit = () => {
    setEditedNotes(contact.notes);
    setIsEditingNotes(false);
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
        return '🎯';
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to contacts</span>
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-8">
        {/* Profile Header with Large Image */}
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="px-6 pt-8 pb-6">
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={contact.profileImage}
                alt={contact.name}
                className="w-32 h-32 rounded-full border-4 border-teal-200 object-cover mb-4 shadow-lg"
              />
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

            <a
              href={`https://${contact.linkedInUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-medium shadow-lg"
            >
              <Linkedin className="w-5 h-5" />
              <span>View LinkedIn Profile</span>
            </a>
          </div>
        </div>

        {/* Content Sections */}
        <div className="px-4 py-6 space-y-4">
          {/* Suggested Actions */}
          <SuggestedActions actions={contact.suggestedActions} contactName={contact.name} />

          {/* Things to Know - Most Important */}
          <section className="bg-teal-50 rounded-xl p-6 border border-teal-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shadow-sm">
                <AlertCircle className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="text-slate-900 font-semibold text-lg">Things to Know</h2>
            </div>
            <ul className="space-y-4">
              {contact.keyFacts.map((insight, index) => (
                <li key={index}>
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
                          {insight.transcript && (
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                          )}
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
                      {insight.transcript && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-700 rounded-full text-xs border border-teal-200">
                          <MessageSquare className="w-3 h-3" />
                          <span>View context</span>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Fun Facts */}
          <section className="bg-purple-50 rounded-xl p-6 border border-purple-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shadow-sm">
                <Lightbulb className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-slate-900 font-semibold text-lg">Fun Facts & Interests</h2>
            </div>
            <ul className="space-y-4">
              {contact.funFacts.map((insight, index) => (
                <li key={index} className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-purple-600 text-xl leading-none flex-shrink-0">•</span>
                    <span className="leading-relaxed font-medium text-slate-900 flex-1">{insight.text}</span>
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
                </li>
              ))}
            </ul>
          </section>

          {/* Conversation Notes */}
          <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 font-semibold text-lg">Conversation Notes</h2>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 min-h-[120px] resize-none placeholder-slate-400"
                  placeholder="Add notes from your conversation..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-medium shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium border border-slate-300"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {contact.notes || 'No notes added yet.'}
                </p>
              </div>
            )}
          </section>

          {/* Date Added */}
          <div className="text-center text-slate-500 text-sm pt-2">
            Added {new Date(contact.dateAdded).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Transcript Modal */}
      {selectedInsight && selectedInsight.insight.transcript && (
        <TranscriptModal
          isOpen={true}
          onClose={() => setSelectedInsight(null)}
          transcript={selectedInsight.insight.transcript}
          insightText={selectedInsight.text}
        />
      )}
    </div>
  );
}