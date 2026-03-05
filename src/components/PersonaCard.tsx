import { useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck2,
  Edit2,
  Check,
  X,
  MapPin,
  Link as LinkIcon,
  Clock3,
  ChevronRight,
} from 'lucide-react';
import type { Contact, Insight, SuggestedAction } from '../types';
import { TranscriptModal } from './TranscriptModal';

interface PersonaCardProps {
  contact: Contact;
  onBack: () => void;
  onUpdateNotes: (contactId: string, notes: string) => void;
}

export function PersonaCard({ contact, onBack, onUpdateNotes }: PersonaCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(contact.notes);
  const [selectedInsight, setSelectedInsight] = useState<{ transcript: Insight['transcript']; text: string } | null>(null);
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);
  const [openSections, setOpenSections] = useState({
    keyFacts: true,
    funFacts: false,
    actions: true,
    notes: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const profileHref = !contact.linkedInUrl
    ? null
    : contact.linkedInUrl.startsWith('http://') || contact.linkedInUrl.startsWith('https://')
      ? contact.linkedInUrl
      : `https://${contact.linkedInUrl}`;

  const handleSaveNotes = () => {
    onUpdateNotes(contact.id, editedNotes);
    setIsEditingNotes(false);
  };

  const InsightRow = ({ insight }: { insight: Insight }) => (
    <button
      className="vx-contact-row"
      style={{ padding: 10 }}
      onClick={() => insight.transcript && setSelectedInsight({ transcript: insight.transcript, text: insight.text })}
      disabled={!insight.transcript}
    >
      <div style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
        <div className="vx-body" style={{ fontWeight: 600 }}>{insight.text}</div>
        <div className="vx-caption" style={{ marginTop: 4 }}>{insight.source} • {insight.category}</div>
      </div>
      {insight.transcript && <ChevronRight size={16} color="var(--text-muted)" />}
    </button>
  );

  return (
    <div className="vx-app">
      <header className="vx-topbar">
        <div className="vx-topbar-inner">
          <button onClick={onBack} className="vx-btn vx-btn-ghost">
            <span className="vx-row"><ArrowLeft size={16} /> Back to contacts</span>
          </button>
        </div>
      </header>

      <main className="vx-content" style={{ maxWidth: 760 }}>
        <div className="vx-col">
          <section className="vx-section">
            <div className="vx-row" style={{ alignItems: 'flex-start' }}>
              <img src={contact.profileImage} alt={contact.name} className="vx-avatar" style={{ width: 64, height: 64 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 className="vx-h2">{contact.name}</h1>
                <div className="vx-row vx-caption" style={{ marginTop: 4 }}>
                  <Briefcase size={14} />
                  <span>{contact.title} at {contact.company}</span>
                </div>
                <div className="vx-row vx-caption" style={{ marginTop: 4 }}>
                  <MapPin size={14} />
                  <span>{contact.location}</span>
                  <span>•</span>
                  <Clock3 size={14} />
                  <span>{contact.conversationDuration}</span>
                </div>
              </div>
            </div>
            {profileHref && (
              <a href={profileHref} target="_blank" rel="noopener noreferrer" className="vx-btn" style={{ marginTop: 12, display: 'inline-flex' }}>
                <span className="vx-row"><LinkIcon size={14} /> Open external profile</span>
              </a>
            )}
          </section>

          <section className="vx-section">
            <button className="vx-btn vx-btn-ghost" onClick={() => toggleSection('actions')} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
              <span className="vx-row"><CalendarCheck2 size={16} /> Suggested actions</span>
              <span>{openSections.actions ? 'Hide' : 'Show'}</span>
            </button>
            {openSections.actions && (
              <div className="vx-col" style={{ marginTop: 10 }}>
                {contact.suggestedActions.length === 0 && <div className="vx-caption">No suggested actions yet.</div>}
                {contact.suggestedActions.map((action) => (
                  <button
                    key={action.id}
                    className="vx-contact-row"
                    style={{ padding: 10 }}
                    onClick={() => setSelectedAction(action)}
                  >
                    <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                      <div className="vx-body" style={{ fontWeight: 600 }}>{action.title}</div>
                      <div className="vx-caption" style={{ marginTop: 4 }}>{action.description}</div>
                    </div>
                    <span className="vx-badge">{action.priority}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="vx-section">
            <button className="vx-btn vx-btn-ghost" onClick={() => toggleSection('keyFacts')} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
              <span>Key facts</span>
              <span>{openSections.keyFacts ? 'Hide' : 'Show'}</span>
            </button>
            {openSections.keyFacts && (
              <div className="vx-col" style={{ marginTop: 10 }}>
                {contact.keyFacts.map((insight) => <InsightRow key={insight.id || insight.text} insight={insight} />)}
              </div>
            )}
          </section>

          <section className="vx-section">
            <button className="vx-btn vx-btn-ghost" onClick={() => toggleSection('funFacts')} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
              <span>Fun facts</span>
              <span>{openSections.funFacts ? 'Hide' : 'Show'}</span>
            </button>
            {openSections.funFacts && (
              <div className="vx-col" style={{ marginTop: 10 }}>
                {contact.funFacts.map((insight) => <InsightRow key={insight.id || insight.text} insight={insight} />)}
              </div>
            )}
          </section>

          <section className="vx-section">
            <button className="vx-btn vx-btn-ghost" onClick={() => toggleSection('notes')} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
              <span>Conversation notes</span>
              <span>{openSections.notes ? 'Hide' : 'Show'}</span>
            </button>
            {openSections.notes && (
              <div style={{ marginTop: 10 }}>
                {isEditingNotes ? (
                  <div className="vx-col">
                    <textarea className="vx-textarea" value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)} />
                    <div className="vx-row">
                      <button className="vx-btn vx-btn-primary" onClick={handleSaveNotes}>
                        <span className="vx-row"><Check size={14} /> Save</span>
                      </button>
                      <button className="vx-btn" onClick={() => { setEditedNotes(contact.notes); setIsEditingNotes(false); }}>
                        <span className="vx-row"><X size={14} /> Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="vx-col">
                    <p className="vx-body">{contact.notes || 'No notes yet.'}</p>
                    <button className="vx-btn" onClick={() => setIsEditingNotes(true)}>
                      <span className="vx-row"><Edit2 size={14} /> Edit notes</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedInsight?.transcript && (
        <TranscriptModal
          isOpen={true}
          onClose={() => setSelectedInsight(null)}
          transcript={selectedInsight.transcript}
          insightText={selectedInsight.text}
        />
      )}
      {selectedAction?.transcript && (
        <TranscriptModal
          isOpen={true}
          onClose={() => setSelectedAction(null)}
          transcript={selectedAction.transcript}
          insightText={selectedAction.title}
        />
      )}
    </div>
  );
}
