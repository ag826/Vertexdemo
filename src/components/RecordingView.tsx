import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Mic, Square } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(0);
  const stoppingRef = useRef(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
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
      durationRef.current = 0;
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      stoppingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch {
      setError('Microphone access failed. Allow microphone permission and try again.');
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive' || stoppingRef.current) {
      return;
    }
    stoppingRef.current = true;
    const recorder = mediaRecorderRef.current;
    const stopPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
    });
    recorder.stop();
    setIsRecording(false);
    const audioBlob = await stopPromise;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    await onStop({ durationSeconds: durationRef.current, audioBlob });
    stoppingRef.current = false;
  };

  return (
    <div className="vx-app">
      <header className="vx-topbar">
        <div className="vx-topbar-inner">
          <button className="vx-btn vx-btn-ghost" onClick={onBack} disabled={isRecording || isProcessing}>
            <span className="vx-row"><ArrowLeft size={16} /> Back</span>
          </button>
        </div>
      </header>

      <main className="vx-content" style={{ maxWidth: 560 }}>
        <div className="vx-section" style={{ textAlign: 'center', padding: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))',
              border: '1px solid color-mix(in oklab, var(--accent) 28%, var(--border))',
            }}
          >
            {isRecording ? <Square size={42} color="var(--accent)" /> : <Mic size={42} color="var(--accent)" />}
          </div>

          <h1 className="vx-h2" style={{ marginTop: 18 }}>
            {isRecording ? 'Recording in progress' : 'Ready to record'}
          </h1>
          <p className="vx-body" style={{ color: 'var(--text-muted)', marginTop: 6 }}>
            {isRecording
              ? 'Tap stop when you finish speaking.'
              : 'After recording, we transcribe and ask you where to link it.'}
          </p>

          <div className="vx-h1" style={{ marginTop: 12 }}>{formatDuration(duration)}</div>

          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
            className="vx-btn vx-btn-primary"
            style={{ width: '100%', height: 48, marginTop: 16 }}
          >
            <span className="vx-row" style={{ justifyContent: 'center' }}>
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              {isRecording ? 'Stop recording' : 'Start recording'}
            </span>
          </button>

          {error && <div className="vx-alert" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      </main>
    </div>
  );
}
