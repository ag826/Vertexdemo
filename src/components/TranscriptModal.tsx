import { X, Calendar, Clock, MapPin, MessageSquare, Video, Phone, Mail, Linkedin, MessageCircle, Sparkles } from 'lucide-react';
import type { TranscriptDetail } from '../App';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptDetail;
  insightText: string;
}

export function TranscriptModal({ isOpen, onClose, transcript, insightText }: TranscriptModalProps) {
  if (!isOpen) return null;

  const getPlatformIcon = (platform: TranscriptDetail['platform']) => {
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
    }
  };

  const getPlatformColor = (platform: TranscriptDetail['platform']) => {
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
    }
  };

  // Function to highlight the relevant text in the transcript
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
              <mark className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white px-1.5 py-0.5 rounded border-l-2 border-blue-400">
                {transcript.highlightedText}
              </mark>
            )}
          </span>
        ))}
      </>
    );
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-white font-semibold text-lg">Conversation Insight</h2>
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
            {/* Insight Summary */}
            <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl p-5 border border-blue-500/20 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Extracted Insight</p>
              </div>
              <p className="text-white font-medium leading-relaxed text-base">{insightText}</p>
            </div>

            {/* Platform Badge - Prominent */}
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

            {/* Metadata Grid */}
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
                <div className="flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Highlighted</span>
                </div>
              </div>
              <div className="text-sm leading-relaxed bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                {renderHighlightedTranscript()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}