import { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Contact } from '../types';

interface PersonaCreatorViewProps {
  durationSeconds: number;
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

export function PersonaCreatorView({ durationSeconds, isSaving, onBack, onSave }: PersonaCreatorViewProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [keyFacts, setKeyFacts] = useState(['']);
  const [funFacts, setFunFacts] = useState(['']);

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-slate-300 text-sm">Manual Persona Creation</div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-slate-300">
          Recording duration: {toDuration(durationSeconds)}
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold">Contact Details</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company *" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location *" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          <input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} placeholder="LinkedIn URL (optional)" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold">Conversation Notes</h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you discuss?" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 min-h-[120px]" />
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold">Key Facts</h2>
          {keyFacts.map((fact, idx) => (
            <div key={idx} className="flex gap-2">
              <input value={fact} onChange={(e) => setListValue(setKeyFacts, keyFacts, idx, e.target.value)} placeholder={`Key fact ${idx + 1}`} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
              {keyFacts.length > 1 && (
                <button onClick={() => setKeyFacts(keyFacts.filter((_, i) => i !== idx))} className="px-2 border border-slate-700 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setKeyFacts([...keyFacts, ''])} className="text-blue-300 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add key fact
          </button>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold">Fun Facts</h2>
          {funFacts.map((fact, idx) => (
            <div key={idx} className="flex gap-2">
              <input value={fact} onChange={(e) => setListValue(setFunFacts, funFacts, idx, e.target.value)} placeholder={`Fun fact ${idx + 1}`} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
              {funFacts.length > 1 && (
                <button onClick={() => setFunFacts(funFacts.filter((_, i) => i !== idx))} className="px-2 border border-slate-700 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setFunFacts([...funFacts, ''])} className="text-blue-300 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add fun fact
          </button>
        </section>

        <button
          onClick={submit}
          disabled={!canSubmit || isSaving}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 py-3 rounded-lg font-semibold disabled:opacity-60"
        >
          {isSaving ? 'Saving Persona...' : 'Create Persona'}
        </button>
      </main>
    </div>
  );
}
