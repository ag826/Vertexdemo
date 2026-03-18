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
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(contact.notes);
  const [selectedInsight, setSelectedInsight] = useState<{ insight: Insight; text: string } | null>(null);

  const handleSaveNotes = () => {
    onUpdateNotes(contact.id, editedNotes);
    setIsEditingNotes(false);
  };

  const handleCancelEdit = () => {
    setEditedNotes(contact.notes);
    setIsEditingNotes(false);
  };

  const getSourceIcon = (source: Insight['source']) => {
    switch (source) {
      case 'Conversation':
        return <MessageSquare className="w-3 h-3" />;
      case 'LinkedIn':
        return <LinkIcon className="w-3 h-3" />;
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

  const getCategoryColor = (category: Insight['category']) => {
    switch (category) {
      case 'Professional':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Personal':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Interest':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Background':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'Goal':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to contacts</span>
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-8">
        {/* Profile Header with Large Image */}
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="px-6 pt-8 pb-6">
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={contact.profileImage}
                alt={contact.name}
                className="w-32 h-32 rounded-full border-4 border-blue-500/30 object-cover mb-4 shadow-lg"
              />
              <h1 className="text-white mb-2">{contact.name}</h1>
              <div className="flex items-center gap-2 text-slate-200 mb-1">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span className="font-medium">{contact.title}</span>
              </div>
              <div className="text-slate-400 mb-3">{contact.company}</div>
              
              <div className="flex items-center gap-4 text-slate-400 text-sm">
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
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-400 to-purple-400 text-white py-3 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all font-medium shadow-lg"
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
          <section className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/20 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center shadow-sm">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-white font-semibold text-lg">Things to Know</h2>
            </div>
            <ul className="space-y-4">
              {contact.keyFacts.map((insight, index) => (
                <li key={index}>
                  <button
                    onClick={() => insight.transcript && setSelectedInsight({ insight, text: insight.text })}
                    className={`w-full bg-slate-900/50 rounded-lg p-4 border border-slate-800 shadow-sm backdrop-blur-sm text-left transition-all ${
                      insight.transcript ? 'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer' : ''
                    }`}
                    disabled={!insight.transcript}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-6 h-6 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-300 text-xs font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="leading-relaxed font-medium text-slate-200 flex-1">{insight.text}</span>
                          {insight.transcript && (
                            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-9 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 rounded-full text-xs text-slate-400">
                        {getSourceIcon(insight.source)}
                        <span>{insight.source}</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${getCategoryColor(insight.category)}`}>
                        <span>{getCategoryIcon(insight.category)}</span>
                        <span>{insight.category}</span>
                      </div>
                      {insight.transcript && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
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
          <section className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center shadow-sm">
                <Lightbulb className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-white font-semibold text-lg">Fun Facts & Interests</h2>
            </div>
            <ul className="space-y-4">
              {contact.funFacts.map((insight, index) => (
                <li key={index} className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 shadow-sm backdrop-blur-sm">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-purple-400 text-xl leading-none flex-shrink-0">•</span>
                    <span className="leading-relaxed font-medium text-slate-200 flex-1">{insight.text}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-7 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 rounded-full text-xs text-slate-400">
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
          <section className="bg-slate-900/50 rounded-xl p-6 border border-slate-800 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Conversation Notes</h2>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 text-sm font-medium"
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
                  className="w-full px-4 py-3 border-2 border-slate-700 bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-slate-200 min-h-[120px] resize-none placeholder-slate-500"
                  placeholder="Add notes from your conversation..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all font-medium shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium border border-slate-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
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