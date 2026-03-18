import { X, Calendar, Clock, MapPin, MessageSquare, Video, Phone, Mail, Linkedin, MessageCircle, Sparkles, Send, CalendarPlus, PhoneCall, UserPlus as UserPlusIcon, Share2, CheckCircle, Zap } from 'lucide-react';
import type { SuggestedAction } from '../App';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: SuggestedAction;
  contactName?: string;
}

export function ActionModal({ isOpen, onClose, action, contactName }: ActionModalProps) {
  if (!isOpen) return null;

  const transcript = action.transcript;

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
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300';
      case 'Phone Call':
        return 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-300';
      case 'Video Call':
        return 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-300';
      case 'Email':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-300';
      case 'LinkedIn Message':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300';
      case 'Text Message':
        return 'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-300';
      default:
        return 'from-slate-500/20 to-slate-600/20 border-slate-500/30 text-slate-300';
    }
  };

  const renderHighlightedTranscript = () => {
    const parts = transcript.fullTranscript.split(transcript.highlightedText);
    
    if (parts.length === 1) {
      return <span className="text-slate-300">{transcript.fullTranscript}</span>;
    }

    return (
      <>
        {parts.map((part, index) => (
          <span key={index}>
            <span className="text-slate-400">{part}</span>
            {index < parts.length - 1 && (
              <mark className="bg-yellow-400/90 text-slate-900 px-1.5 py-0.5 rounded font-semibold">
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
        return {
          icon: <Send className="w-4 h-4" />,
          text: 'Draft Email',
          gradient: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
        };
      case 'meeting':
        return {
          icon: <CalendarPlus className="w-4 h-4" />,
          text: 'Schedule Meeting',
          gradient: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
        };
      case 'call':
        return {
          icon: <PhoneCall className="w-4 h-4" />,
          text: 'Schedule Call',
          gradient: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
        };
      case 'introduction':
        return {
          icon: <UserPlusIcon className="w-4 h-4" />,
          text: 'Make Introduction',
          gradient: 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700'
        };
      case 'share':
        return {
          icon: <Share2 className="w-4 h-4" />,
          text: 'Share Resource',
          gradient: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
        };
      case 'follow-up':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Send Follow-up',
          gradient: 'from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700'
        };
    }
  };

  const actionButton = getActionButton();

  const handleAction = () => {
    // This would integrate with email/calendar in a real app
    alert(`Action triggered: ${action.title}`);
  };

  const handleMarkComplete = () => {
    alert('Marked as complete!');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 max-w-lg mx-auto">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-t-3xl border-t border-x border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header with drag indicator */}
          <div className="pt-2 pb-4 px-4 sticky top-0 bg-gradient-to-b from-slate-900 to-slate-900/95 backdrop-blur-lg z-10 rounded-t-3xl">
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                  <Zap className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="text-white font-semibold text-lg">Action Item</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4 space-y-5 pb-8">
            {/* Action Summary */}
            <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-xl p-5 border border-green-500/20 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-xs font-semibold text-green-300 uppercase tracking-wider">Suggested Action</p>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{action.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{action.description}</p>
              {contactName && (
                <p className="text-slate-400 text-xs mt-2">For: <span className="text-slate-300">{contactName}</span></p>
              )}
            </div>

            {/* Priority & Due Date */}
            <div className="flex gap-3">
              {action.priority && (
                <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-lg p-3.5 border border-slate-700/50">
                  <div className="text-slate-400 text-xs mb-1.5">Priority</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      action.priority === 'high' ? 'bg-red-400' :
                      action.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                    }`}></div>
                    <p className="text-white text-sm font-medium capitalize">{action.priority}</p>
                  </div>
                </div>
              )}
              {action.dueDate && (
                <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-lg p-3.5 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due Date</span>
                  </div>
                  <p className="text-white text-sm font-medium">{action.dueDate}</p>
                </div>
              )}
            </div>

            {/* Platform Badge */}
            <div className={`bg-gradient-to-br ${getPlatformColor(transcript.platform)} rounded-xl p-4 border shadow-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    {getPlatformIcon(transcript.platform)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-0.5">Platform</p>
                    <p className="font-semibold">{transcript.platform}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Context Details */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                Context Details
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-3.5 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date</span>
                  </div>
                  <p className="text-white text-sm font-medium">{transcript.date}</p>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-3.5 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time</span>
                  </div>
                  <p className="text-white text-sm font-medium">{transcript.time}</p>
                </div>

                {transcript.location && (
                  <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-3.5 border border-slate-700/50 col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Location</span>
                    </div>
                    <p className="text-white text-sm font-medium">{transcript.location}</p>
                  </div>
                )}

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-3.5 border border-slate-700/50 col-span-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Occasion</span>
                  </div>
                  <p className="text-white text-sm font-medium">{transcript.occasion}</p>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                  Full Conversation
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-yellow-300 bg-yellow-500/20 px-2.5 py-1 rounded-full border border-yellow-500/30">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                  <span>Highlighted</span>
                </div>
              </div>
              <div className="text-sm leading-relaxed bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                {renderHighlightedTranscript()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAction}
                className={`w-full bg-gradient-to-r ${actionButton.gradient} text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]`}
              >
                {actionButton.icon}
                <span>{actionButton.text}</span>
              </button>

              <button
                onClick={handleMarkComplete}
                className="w-full bg-slate-800 text-slate-300 py-3 px-4 rounded-xl font-medium border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Complete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}