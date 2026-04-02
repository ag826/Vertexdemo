import { useState } from 'react';
import { Zap, Mail, Calendar, Phone, UserPlus, Share2, Clock, ChevronRight } from 'lucide-react';
import type { Contact, SuggestedAction } from '../App';
import { ActionModal } from './ActionModal';

interface AllActionsViewProps {
  contacts: Contact[];
}

interface ActionWithContact extends SuggestedAction {
  contactName: string;
  contactImage: string;
  contactTitle: string;
  contactCompany: string;
}

export function AllActionsView({ contacts }: AllActionsViewProps) {
  const [selectedAction, setSelectedAction] = useState<ActionWithContact | null>(null);

  // Flatten all actions from all contacts
  const allActions: ActionWithContact[] = contacts.flatMap(contact =>
    contact.suggestedActions.map(action => ({
      ...action,
      contactName: contact.name,
      contactImage: contact.profileImage,
      contactTitle: contact.title,
      contactCompany: contact.company
    }))
  );

  // Sort by priority (high -> medium -> low)
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  const sortedActions = allActions.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const getActionIcon = (type: SuggestedAction['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'introduction':
        return <UserPlus className="w-4 h-4" />;
      case 'share':
        return <Share2 className="w-4 h-4" />;
      case 'follow-up':
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: SuggestedAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-300';
      case 'medium':
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300';
      case 'low':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300';
    }
  };

  const getPriorityDot = (priority: SuggestedAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-400';
      case 'medium':
        return 'bg-yellow-400';
      case 'low':
        return 'bg-blue-400';
    }
  };

  const getActionColor = (type: SuggestedAction['type']) => {
    switch (type) {
      case 'email':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'meeting':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'call':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'introduction':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'share':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'follow-up':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
  };

  const getPriorityBadgeColor = (priority: SuggestedAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  if (sortedActions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-slate-900 font-semibold mb-2">No actions yet</h3>
        <p className="text-slate-600">Actions from your conversations will appear here</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <h2 className="text-slate-900 font-semibold text-lg">Action Items</h2>
            <p className="text-slate-600 text-sm">{sortedActions.length} pending {sortedActions.length === 1 ? 'action' : 'actions'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">
              <Zap className="w-3 h-3" />
              <span>Sorted by priority</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {sortedActions.map((action) => (
            <button
              key={`${action.contactName}-${action.id}`}
              onClick={() => setSelectedAction(action)}
              className="w-full bg-white rounded-lg p-4 border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all text-left group"
            >
              {/* Contact Info Header */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                <img
                  src={action.contactImage}
                  alt={action.contactName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 font-medium text-sm">{action.contactName}</h3>
                  <p className="text-slate-600 text-xs truncate">{action.contactTitle} at {action.contactCompany}</p>
                </div>
              </div>

              {/* Action Details */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getActionColor(action.type)} flex-shrink-0`}>
                  {getActionIcon(action.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-slate-900 font-medium leading-snug">{action.title}</h4>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors flex-shrink-0 mt-1" />
                  </div>
                  
                  <p className="text-slate-600 text-sm mb-3 leading-relaxed">
                    {action.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getPriorityBadgeColor(action.priority)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(action.priority)}`}></div>
                      <span className="capitalize">{action.priority} priority</span>
                    </div>

                    {action.dueDate && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{action.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Modal */}
      {selectedAction && (
        <ActionModal
          isOpen={true}
          onClose={() => setSelectedAction(null)}
          action={selectedAction}
          contactName={selectedAction.contactName}
        />
      )}
    </>
  );
}