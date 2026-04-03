import { useEffect, useState } from 'react';
import { Zap, Mail, Calendar, Phone, UserPlus, Share2, Clock, ChevronRight } from 'lucide-react';
import { completeAction, executeAction, getAllActions } from '../lib/api';
import type { SuggestedAction } from '../lib/types';
import { ActionModal } from './ActionModal';

export function AllActionsView() {
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActions = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await getAllActions('open');
      setActions(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load actions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActions();
  }, []);

  const handleExecute = async (action: SuggestedAction) => {
    const response = await executeAction(action.id, action.type === 'meeting' ? 'calendar' : 'email');
    return response.execution.draft;
  };

  const handleComplete = async (action: SuggestedAction) => {
    await completeAction(action.id);
    await loadActions();
  };

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

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading action items...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="mb-3">{error}</p>
        <button onClick={() => void loadActions()} className="rounded-lg bg-white px-4 py-2 text-red-700 border border-red-200">
          Retry
        </button>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-slate-900 font-semibold mb-2">No pending actions</h3>
        <p className="text-slate-600">Action items generated from conversations will show up here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 font-semibold text-lg">Action Items</h2>
            <p className="text-slate-600 text-sm">{actions.length} pending {actions.length === 1 ? 'action' : 'actions'}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">
            <Zap className="w-3 h-3" />
            <span>Sorted by priority</span>
          </div>
        </div>

        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={`${action.contactId}-${action.id}`}
              onClick={() => setSelectedAction(action)}
              className="w-full bg-white rounded-lg p-4 border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                <img src={action.contactImage} alt={action.contactName} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 font-medium text-sm">{action.contactName}</h3>
                  <p className="text-slate-600 text-xs truncate">{action.contactTitle} at {action.contactCompany}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getActionColor(action.type)} flex-shrink-0`}>
                  {getActionIcon(action.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-slate-900 font-medium leading-snug">{action.title}</h4>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-slate-600 text-sm mb-3 leading-relaxed">{action.description}</p>
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

      {selectedAction && (
        <ActionModal
          isOpen
          onClose={() => setSelectedAction(null)}
          action={selectedAction}
          contactName={selectedAction.contactName}
          onExecute={handleExecute}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
