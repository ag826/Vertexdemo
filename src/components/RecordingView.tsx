import { useEffect, useRef, useState } from 'react';
import { Mic, Square, ArrowLeft, Loader2 } from 'lucide-react';

interface RecordingPayload {
  durationSeconds: number;
  audioBlob: Blob;
}

interface RecordingViewProps {
  onStop: (payload: RecordingPayload) => Promise<void> | void;
  onBack: () => void;
  isProcessing?: boolean;
}

export function RecordingView({ onStop, onBack, isProcessing = false }: RecordingViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (isProcessing) {
      return;
    }

    try {
      setError(null);
      setDuration(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setIsPulsing(true);
    } catch {
      setError('Microphone access failed. Please allow microphone permission and try again.');
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    const recorder = mediaRecorderRef.current;

    const stopPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        resolve(blob);
      };
    });

    recorder.stop();
    setIsRecording(false);
    setIsPulsing(false);

    const audioBlob = await stopPromise;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    await onStop({ durationSeconds: duration, audioBlob });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="p-4 max-w-lg mx-auto w-full">
        <button
          onClick={onBack}
          disabled={isProcessing || isRecording}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        {!isRecording ? (
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-blue-500/10 rounded-full mb-6 backdrop-blur-sm border border-blue-500/20">
                <Mic className="w-16 h-16 text-blue-400" />
              </div>
              <h2 className="text-white mb-3">Ready to Record</h2>
              <p className="text-slate-300 text-lg">Tap below to record audio from your microphone.</p>
            </div>

            <button
              onClick={handleStartRecording}
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-400 to-purple-400 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-500 hover:to-purple-500 transition-all hover:scale-105 shadow-lg disabled:opacity-70 disabled:hover:scale-100"
            >
              Start Recording
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <div className={`inline-flex items-center justify-center w-32 h-32 bg-red-500/20 rounded-full mb-6 backdrop-blur-sm border border-red-500/30 ${isPulsing ? 'animate-pulse' : ''}`}>
                <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-4 h-4 bg-white rounded-sm" />
                </div>
              </div>
              <h2 className="text-white mb-2">Recording...</h2>
              <div className="text-blue-400 text-4xl font-mono mb-6">{formatDuration(duration)}</div>
              <p className="text-slate-300">Recording with microphone in real time.</p>
            </div>

            <button
              onClick={handleStopRecording}
              disabled={isProcessing}
              className="bg-slate-800 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2 mx-auto border border-slate-700 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5 fill-current" />}
              {isProcessing ? 'Saving...' : 'Stop Recording'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm max-w-lg">
            {error}
          </div>
        )}
      </main>

      <div className="p-6 max-w-lg mx-auto w-full">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 border border-slate-800">
          <p className="text-slate-300 text-sm text-center">Persona creation is manual after recording stops.</p>
        </div>
      </div>
    </div>
  );
}
