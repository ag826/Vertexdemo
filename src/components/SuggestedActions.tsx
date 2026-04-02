import { useState } from 'react';
import { Mail, Calendar, Phone, UserPlus, Share2, Clock, ChevronRight, Zap } from 'lucide-react';
import type { SuggestedAction } from '../App';
import { ActionModal } from './ActionModal';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  contactName: string;
}

export function SuggestedActions({ actions, contactName }: SuggestedActionsProps) {
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);

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
        return 'from-red-50 to-orange-50 border-red-200 text-red-700 dark:from-red-500/20 dark:to-orange-500/20 dark:border-red-500/30 dark:text-red-300';
      case 'medium':
        return 'from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700 dark:from-yellow-500/20 dark:to-amber-500/20 dark:border-yellow-500/30 dark:text-yellow-300';
      case 'low':
        return 'from-blue-50 to-cyan-50 border-blue-200 text-blue-700 dark:from-blue-500/20 dark:to-cyan-500/20 dark:border-blue-500/30 dark:text-blue-300';
    }
  };

  const getPriorityDot = (priority: SuggestedAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 dark:bg-red-400';
      case 'medium':
        return 'bg-yellow-500 dark:bg-yellow-400';
      case 'low':
        return 'bg-blue-500 dark:bg-blue-400';
    }
  };

  const getActionColor = (type: SuggestedAction['type']) => {
    switch (type) {
      case 'email':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
      case 'meeting':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30';
      case 'call':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30';
      case 'introduction':
        return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30';
      case 'share':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30';
      case 'follow-up':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30';
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <section className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-teal-200 dark:border-teal-700/50 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-lg">Suggested Actions</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs">Based on your conversations</p>
          </div>
        </div>

        <div className="space-y-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setSelectedAction(action)}
              className="w-full bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getActionColor(action.type)} flex-shrink-0`}>
                  {getActionIcon(action.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-slate-900 dark:text-slate-100 font-medium leading-snug">{action.title}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 leading-relaxed">
                    {action.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border bg-gradient-to-r ${getPriorityColor(action.priority)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(action.priority)}`}></div>
                      <span className="capitalize">{action.priority} priority</span>
                    </div>

                    {action.dueDate && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-full text-xs border border-slate-200 dark:border-slate-600">
                        <Clock className="w-3 h-3" />
                        <span>{action.dueDate}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs border border-teal-200 dark:border-teal-700">
                      <Zap className="w-3 h-3" />
                      <span>View context</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Transcript Modal */}
      {selectedAction && (
        <ActionModal
          isOpen={true}
          onClose={() => setSelectedAction(null)}
          action={selectedAction}
          contactName={contactName}
        />
      )}
    </>
  );
}