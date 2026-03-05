import { useMemo, useState } from 'react';
import { ArrowLeft, Link2, UserPlus } from 'lucide-react';
import type { Contact } from '../types';

interface RecordingReviewViewProps {
  transcriptText: string;
  contacts: Contact[];
  isLinking: boolean;
  onBack: () => void;
  onTranscriptChange: (value: string) => void;
  onLinkToContact: (contactId: string) => Promise<void>;
  onCreateNew: () => void;
}

export function RecordingReviewView({
  transcriptText,
  contacts,
  isLinking,
  onBack,
  onTranscriptChange,
  onLinkToContact,
  onCreateNew,
}: RecordingReviewViewProps) {
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return contacts;
    }
    return contacts.filter((contact) =>
      `${contact.name} ${contact.title} ${contact.company}`.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  return (
    <div className="vx-app">
      <header className="vx-topbar">
        <div className="vx-topbar-inner">
          <button className="vx-btn vx-btn-ghost" onClick={onBack}>
            <span className="vx-row"><ArrowLeft size={16} /> Back</span>
          </button>
        </div>
      </header>

      <main className="vx-content" style={{ maxWidth: 720 }}>
        <div className="vx-col">
          <section className="vx-section">
            <h2 className="vx-h3">Transcript</h2>
            <p className="vx-caption" style={{ marginTop: 4 }}>
              Review and edit this transcript before you link it.
            </p>
            {!transcriptText.trim() && (
              <p className="vx-caption" style={{ marginTop: 10, color: 'var(--warning)' }}>
                No transcript was returned. Add notes manually before linking.
              </p>
            )}
            <textarea
              value={transcriptText}
              onChange={(event) => onTranscriptChange(event.target.value)}
              className="vx-textarea"
              style={{ marginTop: 12 }}
              placeholder="Transcription text..."
            />
          </section>

          <section className="vx-section">
            <h2 className="vx-h3">Link to an existing contact</h2>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts"
              className="vx-input"
              style={{ marginTop: 12 }}
            />

            <div className="vx-col" style={{ marginTop: 12, maxHeight: 260, overflow: 'auto' }}>
              {filtered.map((contact) => (
                <button
                  key={contact.id}
                  className="vx-contact-row"
                  style={{
                    borderColor: selectedContactId === contact.id
                      ? 'color-mix(in oklab, var(--accent) 45%, var(--border))'
                      : 'var(--border)',
                  }}
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <div className="vx-contact-main">
                    <img src={contact.profileImage} alt={contact.name} className="vx-avatar" />
                    <div style={{ minWidth: 0 }}>
                      <div className="vx-body" style={{ fontWeight: 650 }}>{contact.name}</div>
                      <div className="vx-caption">{contact.title} at {contact.company}</div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <div className="vx-caption">No contacts found.</div>}
            </div>

            <button
              onClick={() => selectedContactId && onLinkToContact(selectedContactId)}
              disabled={!selectedContactId || isLinking}
              className="vx-btn vx-btn-primary"
              style={{ width: '100%', height: 44, marginTop: 12 }}
            >
              <span className="vx-row" style={{ justifyContent: 'center' }}>
                <Link2 size={16} />
                {isLinking ? 'Linking...' : 'Link recording to selected contact'}
              </span>
            </button>
          </section>

          <section className="vx-section">
            <h2 className="vx-h3">Or create a new contact</h2>
            <button
              onClick={onCreateNew}
              disabled={isLinking}
              className="vx-btn"
              style={{ width: '100%', height: 44, marginTop: 10 }}
            >
              <span className="vx-row" style={{ justifyContent: 'center' }}>
                <UserPlus size={16} />
                Create new contact from this recording
              </span>
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
