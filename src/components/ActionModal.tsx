import { useState } from 'react';
import { X, Calendar, Clock, MapPin, MessageSquare, Video, Phone, Mail, Linkedin, MessageCircle, Send, CalendarPlus, PhoneCall, UserPlus as UserPlusIcon, Share2, CheckCircle } from 'lucide-react';
import type { SuggestedAction } from '../lib/types';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: SuggestedAction;
  contactName?: string;
  onExecute: (action: SuggestedAction) => Promise<{ subject?: string; body?: string } | void>;
  onComplete: (action: SuggestedAction) => Promise<void>;
}

export function ActionModal({ isOpen, onClose, action, contactName, onExecute, onComplete }: ActionModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [message, setMessage] = useState('');
  const transcript = action.transcript;

  if (!isOpen) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'In-Person':
        return <MessageSquare className="w-4 h-4" />;
      case 'Phone Call':
        return <Phone className="w-4 h-4" />;
      case 'Video Call':
        return <Video className="w-4 h-4" />;
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'LinkedIn Message':
        return <Linkedin className="w-4 h-4" />;
      case 'Text Message':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'In-Person':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Phone Call':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Video Call':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Email':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'LinkedIn Message':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Text Message':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const renderHighlightedTranscript = () => {
    if (!transcript) {
      return <span className="text-slate-700">No transcript context available.</span>;
    }
    const parts = transcript.fullTranscript.split(transcript.highlightedText);
    if (parts.length === 1) {
      return <span className="text-slate-700">{transcript.fullTranscript}</span>;
    }
    return (
      <>
        {parts.map((part, index) => (
          <span key={index}>
            <span className="text-slate-600">{part}</span>
            {index < parts.length - 1 && (
              <mark className="bg-yellow-200 text-slate-900 px-1.5 py-0.5 rounded font-semibold">
                {transcript.highlightedText}
              </mark>
            )}
          </span>
        ))}
      </>
    );
  };

  const getActionButton = () => {
    switch (action.type) {
      case 'email':
        return { icon: <Send className="w-4 h-4" />, text: 'Draft Email', gradient: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700', channel: 'email' };
      case 'meeting':
        return { icon: <CalendarPlus className="w-4 h-4" />, text: 'Schedule Meeting', gradient: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700', channel: 'calendar' };
      case 'call':
        return { icon: <PhoneCall className="w-4 h-4" />, text: 'Schedule Call', gradient: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700', channel: 'call' };
      case 'introduction':
        return { icon: <UserPlusIcon className="w-4 h-4" />, text: 'Make Introduction', gradient: 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700', channel: 'email' };
      case 'share':
        return { icon: <Share2 className="w-4 h-4" />, text: 'Share Resource', gradient: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700', channel: 'email' };
      case 'follow-up':
        return { icon: <CheckCircle className="w-4 h-4" />, text: 'Send Follow-up', gradient: 'from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700', channel: 'email' };
    }
  };

  const actionButton = getActionButton();

  const handleExecute = async () => {
    setIsExecuting(true);
    setMessage('');
    try {
      const result = await onExecute(action);
      if (result?.subject) {
        setMessage(`Draft ready: ${result.subject}`);
      } else {
        setMessage('Action sent successfully.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to execute action');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    setMessage('');
    try {
      await onComplete(action);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete action');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 max-w-lg mx-auto">
        <div className="bg-white rounded-t-3xl border-t border-x border-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
          <div className="pt-2 pb-4 px-4 sticky top-0 bg-white/95 backdrop-blur-lg z-10 rounded-t-3xl border-b border-slate-100">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-semibold">Suggested Action</h2>
                <p className="text-slate-500 text-xs">Generated from conversation context</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-6 overflow-y-auto space-y-4">
            <div className="pt-4">
              <h3 className="text-slate-900 font-semibold text-lg mb-2">{action.title}</h3>
              <p className="text-slate-700 text-sm leading-relaxed">{action.description}</p>
              {contactName && <p className="text-slate-600 text-xs mt-2">For: <span className="text-slate-700">{contactName}</span></p>}
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                <div className="text-slate-600 text-xs mb-1.5">Priority</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${action.priority === 'high' ? 'bg-red-500' : action.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                  <p className="text-slate-900 text-sm font-medium capitalize">{action.priority}</p>
                </div>
              </div>
              {action.dueDate && (
                <div className="flex-1 bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due Date</span>
                  </div>
                  <p className="text-slate-900 text-sm font-medium">{action.dueDate}</p>
                </div>
              )}
            </div>

            {transcript && (
              <>
                <div className={`rounded-xl p-4 border shadow-sm ${getPlatformColor(transcript.platform)}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      {getPlatformIcon(transcript.platform)}
                    </div>
                    <div>
                      <p className="text-xs mb-0.5 opacity-70">Platform</p>
                      <p className="font-semibold">{transcript.platform}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></div>
                    Context Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                      <div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Date</span>
                      </div>
                      <p className="text-slate-900 text-sm font-medium">{transcript.date}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                      <div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Time</span>
                      </div>
                      <p className="text-slate-900 text-sm font-medium">{transcript.time}</p>
                    </div>
                    {transcript.location && (
                      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 col-span-2">
                        <div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Location</span>
                        </div>
                        <p className="text-slate-900 text-sm font-medium">{transcript.location}</p>
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 col-span-2">
                      <div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Occasion</span>
                      </div>
                      <p className="text-slate-900 text-sm font-medium">{transcript.occasion}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></div>
                  Full Conversation
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full border border-yellow-200">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  <span>Highlighted</span>
                </div>
              </div>
              <div className="text-sm leading-relaxed bg-white rounded-lg p-4 border border-slate-200">
                {renderHighlightedTranscript()}
              </div>
            </div>

            {message && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                {message}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={`w-full bg-gradient-to-r ${actionButton.gradient} text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60`}
              >
                {actionButton.icon}
                <span>{isExecuting ? 'Working...' : actionButton.text}</span>
              </button>
              {action.status !== 'completed' && (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="w-full bg-white text-slate-700 py-3 px-4 rounded-xl font-medium border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isCompleting ? 'Saving...' : 'Mark as Complete'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
