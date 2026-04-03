import { X, Calendar, Clock, MapPin, MessageSquare, Video, Phone, Mail, Linkedin, MessageCircle, Sparkles } from 'lucide-react';
import type { TranscriptDetail } from '../lib/types';

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

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 max-w-lg mx-auto">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-t-3xl border-t border-x border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
          <div className="pt-2 pb-4 px-4 sticky top-0 bg-gradient-to-b from-slate-900 to-slate-900/95 backdrop-blur-lg z-10 rounded-t-3xl">
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Sparkles className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Source Context</h2>
                  <p className="text-slate-400 text-xs">{insightText}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-6 overflow-y-auto space-y-4">
            <div className="rounded-xl p-4 border shadow-sm bg-blue-500/10 text-blue-300 border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  {getPlatformIcon(transcript.platform)}
                </div>
                <div>
                  <p className="text-xs text-slate-300 mb-0.5">Platform</p>
                  <p className="font-semibold">{transcript.platform}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                Context Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 rounded-lg p-3.5 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date</span>
                  </div>
                  <p className="text-white text-sm font-medium">{transcript.date}</p>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3.5 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time</span>
                  </div>
                  <p className="text-white text-sm font-medium">{transcript.time}</p>
                </div>
                {transcript.location && (
                  <div className="bg-slate-800/40 rounded-lg p-3.5 border border-slate-700/50 col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Location</span>
                    </div>
                    <p className="text-white text-sm font-medium">{transcript.location}</p>
                  </div>
                )}
                <div className="bg-slate-800/40 rounded-lg p-3.5 border border-slate-700/50 col-span-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Occasion</span>
                  </div>
                  <p className="text-white text-sm font-medium">{transcript.occasion}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
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
