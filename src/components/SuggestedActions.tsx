import { useState } from 'react';
import { Mail, Calendar, Phone, UserPlus, Share2, Clock, ChevronRight, Zap } from 'lucide-react';
import type { SuggestedAction } from '../types';
import { TranscriptModal } from './TranscriptModal';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
}

export function SuggestedActions({ actions }: SuggestedActionsProps) {
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
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'meeting':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'call':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'introduction':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'share':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'follow-up':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <section className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold text-lg">Suggested Actions</h2>
            <p className="text-slate-400 text-xs">Based on your conversations</p>
          </div>
        </div>

        <div className="space-y-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setSelectedAction(action)}
              className="w-full bg-slate-900/50 rounded-lg p-4 border border-slate-800 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getActionColor(action.type)} flex-shrink-0`}>
                  {getActionIcon(action.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-white font-medium leading-snug">{action.title}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-green-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-3 leading-relaxed">
                    {action.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border bg-gradient-to-r ${getPriorityColor(action.priority)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(action.priority)}`}></div>
                      <span className="capitalize">{action.priority} priority</span>
                    </div>

                    {action.dueDate && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 text-slate-400 rounded-full text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{action.dueDate}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 px-2.5 py-1 bg-green-500/20 text-green-300 rounded-full text-xs border border-green-500/30">
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
        <TranscriptModal
          isOpen={true}
          onClose={() => setSelectedAction(null)}
          transcript={selectedAction.transcript}
          insightText={selectedAction.title}
        />
      )}
    </>
  );
}
