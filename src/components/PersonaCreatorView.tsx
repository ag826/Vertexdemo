import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Contact } from '../types';

interface PersonaCreatorViewProps {
  durationSeconds: number;
  initialNotes?: string;
  isSaving: boolean;
  onBack: () => void;
  onSave: (payload: {
    name: string;
    title: string;
    company: string;
    location: string;
    linkedInUrl?: string;
    notes: string;
    keyFacts: Contact['keyFacts'];
    funFacts: Contact['funFacts'];
    conversationDuration: string;
  }) => Promise<void>;
}

function toDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function PersonaCreatorView({ durationSeconds, initialNotes, isSaving, onBack, onSave }: PersonaCreatorViewProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [notes, setNotes] = useState(initialNotes || '');
  const [keyFacts, setKeyFacts] = useState(['']);
  const [funFacts, setFunFacts] = useState(['']);

  useEffect(() => {
    if (initialNotes !== undefined) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  const setListValue = (setter: (next: string[]) => void, list: string[], index: number, value: string) => {
    const next = [...list];
    next[index] = value;
    setter(next);
  };

  const submit = async () => {
    await onSave({
      name,
      title,
      company,
      location,
      linkedInUrl,
      notes,
      keyFacts: keyFacts
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text, source: 'Conversation', category: 'Professional' })),
      funFacts: funFacts
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text, source: 'Conversation', category: 'Interest' })),
      conversationDuration: toDuration(durationSeconds),
    });
  };

  const canSubmit = name.trim() && title.trim() && company.trim() && location.trim();

  return (
    <div className="vx-app">
      <header className="vx-topbar">
        <div className="vx-topbar-inner">
          <button className="vx-btn vx-btn-ghost" onClick={onBack}>
            <span className="vx-row"><ArrowLeft size={16} /> Back</span>
          </button>
        </div>
      </header>

      <main className="vx-content" style={{ maxWidth: 760 }}>
        <div className="vx-col">
          <section className="vx-section">
            <div className="vx-caption">Recording duration: {toDuration(durationSeconds)}</div>
          </section>

          <section className="vx-section vx-col">
            <h2 className="vx-h3">Contact details</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className="vx-input" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *" className="vx-input" />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company *" className="vx-input" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location *" className="vx-input" />
            <input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} placeholder="LinkedIn URL (optional)" className="vx-input" />
          </section>

          <section className="vx-section vx-col">
            <h2 className="vx-h3">Notes</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="vx-textarea" placeholder="Conversation notes" />
          </section>

          <section className="vx-section vx-col">
            <h2 className="vx-h3">Key facts</h2>
            {keyFacts.map((fact, idx) => (
              <div key={idx} className="vx-row">
                <input
                  value={fact}
                  onChange={(e) => setListValue(setKeyFacts, keyFacts, idx, e.target.value)}
                  placeholder={`Key fact ${idx + 1}`}
                  className="vx-input"
                />
                {keyFacts.length > 1 && (
                  <button className="vx-btn" onClick={() => setKeyFacts(keyFacts.filter((_, i) => i !== idx))}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button className="vx-btn vx-btn-ghost" onClick={() => setKeyFacts([...keyFacts, ''])}>
              <span className="vx-row"><Plus size={14} /> Add key fact</span>
            </button>
          </section>

          <section className="vx-section vx-col">
            <h2 className="vx-h3">Fun facts</h2>
            {funFacts.map((fact, idx) => (
              <div key={idx} className="vx-row">
                <input
                  value={fact}
                  onChange={(e) => setListValue(setFunFacts, funFacts, idx, e.target.value)}
                  placeholder={`Fun fact ${idx + 1}`}
                  className="vx-input"
                />
                {funFacts.length > 1 && (
                  <button className="vx-btn" onClick={() => setFunFacts(funFacts.filter((_, i) => i !== idx))}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button className="vx-btn vx-btn-ghost" onClick={() => setFunFacts([...funFacts, ''])}>
              <span className="vx-row"><Plus size={14} /> Add fun fact</span>
            </button>
          </section>

          <button
            onClick={submit}
            disabled={!canSubmit || isSaving}
            className="vx-btn vx-btn-primary"
            style={{ width: '100%', height: 46 }}
          >
            {isSaving ? 'Creating...' : 'Create contact'}
          </button>
        </div>
      </main>
    </div>
  );
}
