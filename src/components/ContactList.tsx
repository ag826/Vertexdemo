import { Briefcase, ChevronRight, Users } from 'lucide-react';
import type { Contact } from '../App';

interface ContactListProps {
  contacts: Contact[];
  onViewContact: (contact: Contact) => void;
  searchQuery: string;
}

export function ContactList({ contacts, onViewContact, searchQuery }: ContactListProps) {
  if (contacts.length === 0 && searchQuery) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-white font-semibold mb-2">No contacts found</h3>
        <p className="text-slate-400">Try searching with different keywords</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-white font-semibold mb-2">No contacts yet</h3>
        <p className="text-slate-400 mb-6">Start recording your first conversation to create a persona card</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wide px-1">
        {searchQuery ? `${contacts.length} Result${contacts.length !== 1 ? 's' : ''}` : `${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}`}
      </h2>
      
      <div className="space-y-2">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onViewContact(contact)}
            className="w-full bg-slate-900 rounded-lg p-4 border border-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <img
                src={contact.profileImage}
                alt={contact.name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-slate-800 group-hover:border-blue-500/30"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-white font-semibold truncate">{contact.name}</h3>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </div>
                
                <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{contact.title} at {contact.company}</span>
                </div>
                
                <p className="text-slate-400 text-sm line-clamp-2">
                  {contact.notes}
                </p>
                
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <span>{new Date(contact.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>•</span>
                  <span>{contact.conversationDuration}</span>
                  <span>•</span>
                  <span>{contact.keyFacts.length + contact.funFacts.length} insights</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}