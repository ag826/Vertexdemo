import { Briefcase, ChevronRight, Users } from 'lucide-react';
import type { Contact } from '../types';

interface ContactListProps {
  contacts: Contact[];
  onViewContact: (contact: Contact) => void;
  searchQuery: string;
  isLoading?: boolean;
}

export function ContactList({ contacts, onViewContact, searchQuery, isLoading = false }: ContactListProps) {
  if (isLoading) {
    return (
      <div className="vx-col">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="vx-card" style={{ padding: 12 }}>
            <div className="vx-row">
              <div className="vx-skeleton" style={{ width: 44, height: 44, borderRadius: 999 }} />
              <div style={{ flex: 1 }}>
                <div className="vx-skeleton" style={{ height: 12, width: '42%', marginBottom: 8 }} />
                <div className="vx-skeleton" style={{ height: 10, width: '62%', marginBottom: 8 }} />
                <div className="vx-skeleton" style={{ height: 10, width: '35%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0 && searchQuery) {
    return (
      <div className="vx-section" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ width: 52, height: 52, borderRadius: 999, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
          <Users size={24} color="var(--text-muted)" />
        </div>
        <h3 className="vx-h3">No contacts found</h3>
        <p className="vx-caption" style={{ marginTop: 4 }}>Try a different name, title, or company.</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="vx-section" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ width: 52, height: 52, borderRadius: 999, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
          <Users size={24} color="var(--text-muted)" />
        </div>
        <h3 className="vx-h3">No contacts yet</h3>
        <p className="vx-caption" style={{ marginTop: 4 }}>Record your first conversation to create one.</p>
      </div>
    );
  }

  return (
    <div className="vx-col">
      <h2 className="vx-caption" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', paddingInline: 2 }}>
        {searchQuery ? `${contacts.length} Result${contacts.length !== 1 ? 's' : ''}` : `${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}`}
      </h2>
      <div className="vx-col">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onViewContact(contact)}
            className="vx-contact-row"
          >
            <div className="vx-contact-main">
              <img
                src={contact.profileImage}
                alt={contact.name}
                className="vx-avatar"
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h3 className="vx-body" style={{ fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</h3>
                </div>
                <div className="vx-caption" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Briefcase size={13} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.title} at {contact.company}</span>
                </div>
                <div className="vx-caption" style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <span>{new Date(contact.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>•</span>
                  <span>{contact.conversationDuration}</span>
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </button>
        ))}
      </div>
    </div>
  );
}
