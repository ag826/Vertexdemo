import { useState, useEffect } from 'react';
import { Mic, Square, ArrowLeft } from 'lucide-react';
import type { Contact } from '../App';

interface RecordingViewProps {
  onStop: (contact: Contact) => void;
  onBack: () => void;
}

export function RecordingView({ onStop, onBack }: RecordingViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPulsing(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPulsing(false);

    // Generate a mock contact based on recording
    const mockContact: Contact = {
      id: Date.now().toString(),
      name: 'Alex Thompson',
      title: 'Senior Software Engineer',
      company: 'CloudScale Systems',
      location: 'Seattle, WA',
      linkedInUrl: 'linkedin.com/in/alexthompson',
      profileImage: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',
      dateAdded: new Date().toISOString().split('T')[0],
      notes: 'Met at Tech Summit 2026. Working on distributed systems and microservices architecture. Mentioned interest in Kubernetes optimization and cloud cost reduction. Team is growing - they\'re hiring 2 more engineers. Really enthusiastic about the new features they\'re launching.',
      keyFacts: [
        { text: 'Expert in cloud architecture and distributed systems', source: 'Conversation', category: 'Professional' },
        { text: 'Previously worked at Amazon for 5 years on AWS', source: 'LinkedIn', category: 'Background' },
        { text: 'Active open source contributor (3K+ GitHub stars)', source: 'LinkedIn', category: 'Professional' },
        { text: 'Leading migration to Kubernetes for entire platform', source: 'Conversation', category: 'Professional' }
      ],
      funFacts: [
        { text: 'Homebrews craft beer (specializes in IPAs)', source: 'Conversation', category: 'Interest' },
        { text: 'Plays guitar in a local indie rock band', source: 'Conversation', category: 'Interest' },
        { text: 'Avid skier (hits the slopes every winter weekend)', source: 'Conversation', category: 'Interest' },
        { text: 'Obsessed with mechanical keyboards', source: 'Conversation', category: 'Interest' }
      ],
      conversationDuration: formatDuration(duration)
    };

    setTimeout(() => {
      onStop(mockContact);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-4 max-w-lg mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </header>

      {/* Main Recording Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        {!isRecording ? (
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-blue-500/10 rounded-full mb-6 backdrop-blur-sm border border-blue-500/20">
                <Mic className="w-16 h-16 text-blue-400" />
              </div>
              <h2 className="text-white mb-3">Ready to Record</h2>
              <p className="text-slate-300 text-lg">
                Tap the button below to start capturing your conversation
              </p>
            </div>

            <button
              onClick={handleStartRecording}
              className="bg-gradient-to-r from-blue-400 to-purple-400 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-500 hover:to-purple-500 transition-all hover:scale-105 shadow-lg"
            >
              Start Recording
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <div className={`inline-flex items-center justify-center w-32 h-32 bg-red-500/20 rounded-full mb-6 backdrop-blur-sm border border-red-500/30 ${isPulsing ? 'animate-pulse' : ''}`}>
                <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
              </div>
              <h2 className="text-white mb-2">Recording...</h2>
              <div className="text-blue-400 text-4xl font-mono mb-6">
                {formatDuration(duration)}
              </div>
              <p className="text-slate-300">
                Vertex is listening and capturing key details
              </p>
            </div>

            <button
              onClick={handleStopRecording}
              className="bg-slate-800 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2 mx-auto border border-slate-700"
            >
              <Square className="w-5 h-5 fill-current" />
              Stop & Generate Persona
            </button>
          </div>
        )}
      </main>

      {/* Tips */}
      <div className="p-6 max-w-lg mx-auto w-full">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 border border-slate-800">
          <p className="text-slate-300 text-sm text-center">
            💡 Keep your phone nearby for best audio quality
          </p>
        </div>
      </div>
    </div>
  );
}