import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Square, Loader, User, Linkedin, Twitter, Instagram, Github, MapPin, FileText, ScanText, Keyboard, Upload, CheckCircle2 } from 'lucide-react';
import { createContactFromRecording, createRecording, getContacts, startRecording, stopRecording, uploadAudioForTranscription, uploadImageForOcr } from '../lib/api';
import { createBrowserRecorder, type BrowserRecorder } from '../lib/audio';
import type { Contact, ContactSummary } from '../lib/types';

type CaptureSource = 'transcribe' | 'photo' | 'text';

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  }
}

interface TranscribingViewProps {
  onStop: (contact: Contact) => void;
  onBack: () => void;
  existingContact?: Contact | null;
}

export function TranscribingView({ onStop, onBack, existingContact }: TranscribingViewProps) {
  const [captureSource, setCaptureSource] = useState<CaptureSource>('transcribe');
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [platform, setPlatform] = useState<'In-Person' | 'Phone Call' | 'Video Call' | 'Email' | 'LinkedIn Message' | 'Text Message'>('In-Person');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [error, setError] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedImageName, setSelectedImageName] = useState('');
  const [contactMode, setContactMode] = useState<'new' | 'existing'>(existingContact ? 'existing' : 'new');
  const [existingContacts, setExistingContacts] = useState<ContactSummary[]>([]);
  const [existingContactsLoading, setExistingContactsLoading] = useState(false);
  const [selectedExistingContactId, setSelectedExistingContactId] = useState<number | null>(existingContact?.id ?? null);
  const [existingContactQuery, setExistingContactQuery] = useState('');
  const [profileData, setProfileData] = useState({
    name: existingContact?.name ?? '',
    title: existingContact?.title ?? '',
    company: existingContact?.company ?? '',
    location: existingContact?.location ?? '',
    linkedIn: existingContact?.linkedInUrl ?? '',
    twitter: '',
    instagram: '',
    github: '',
    occasion: '',
    transcriptText: '',
    locationContext: '',
  });

  const recorderRef = useRef<BrowserRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (isTranscribing) {
      interval = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isTranscribing]);

  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        void recorderRef.current.stop().catch(() => undefined);
        recorderRef.current = null;
      }
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!showProfileForm || existingContact) return;
    setExistingContactsLoading(true);
    void getContacts('')
      .then((response) => setExistingContacts(response.items))
      .catch(() => setExistingContacts([]))
      .finally(() => setExistingContactsLoading(false));
  }, [showProfileForm, existingContact]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectExistingContact = (contactId: number) => {
    const match = existingContacts.find((contact) => contact.id === contactId);
    setSelectedExistingContactId(contactId);
    setContactMode('existing');
    if (!match) return;
    setProfileData((prev) => ({
      ...prev,
      name: match.name,
      title: match.title,
      company: match.company,
      location: match.location,
      linkedIn: match.linkedInUrl,
    }));
  };

  const filteredExistingContacts = existingContacts.filter((contact) => {
    const needle = existingContactQuery.trim().toLowerCase();
    if (!needle) return true;
    return [
      contact.name,
      contact.title,
      contact.company,
      contact.location,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  const ensureRecording = async () => {
    if (recordingId) return recordingId;
    const created = await createRecording(platform, captureSource);
    setRecordingId(created.recording.id);
    return created.recording.id;
  };

  const startLiveRecognition = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setTranscriptionStatus('Listening to microphone... Live transcript is not supported in this browser, but final transcription will still appear after you stop.');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalChunk += `${chunk} `;
        } else {
          interimChunk += `${chunk} `;
        }
      }
      if (finalChunk.trim()) {
        setProfileData((prev) => ({
          ...prev,
          transcriptText: [prev.transcriptText, finalChunk.trim()].filter(Boolean).join(' ').trim(),
        }));
      }
      setInterimTranscript(interimChunk.trim());
    };
    recognition.onerror = (event) => {
      setTranscriptionStatus(`Listening to microphone... Live transcript paused: ${event.error}.`);
    };
    recognition.onend = () => {
      if (speechRecognitionRef.current === recognition && isTranscribing) {
        try {
          recognition.start();
        } catch {
          // Ignore restart errors.
        }
      }
    };
    recognition.start();
    speechRecognitionRef.current = recognition;
  };

  const handleStartTranscribing = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const recorder = await createBrowserRecorder();
      const id = await ensureRecording();
      await startRecording(id);
      recorderRef.current = recorder;
      setRecordingId(id);
      setIsTranscribing(true);
      setDuration(0);
      setTranscriptionStatus('Listening to microphone...');
      setInterimTranscript('');
      startLiveRecognition();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start recording');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopTranscribing = async () => {
    if (!recordingId) return;
    setError('');
    setIsSubmitting(true);
    try {
      setTranscriptionStatus('Converting audio...');
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
      const audioBlob = await recorderRef.current?.stop();
      recorderRef.current = null;
      let transcriptText = [profileData.transcriptText.trim(), interimTranscript.trim()].filter(Boolean).join(' ').trim();
      setInterimTranscript('');

      if (audioBlob && audioBlob.size > 0) {
        setIsProcessingTranscript(true);
        setTranscriptionStatus('Transcribing speech...');
        const transcription = await uploadAudioForTranscription(audioBlob);
        if (transcription.transcript.trim().length >= transcriptText.trim().length) {
          transcriptText = transcription.transcript.trim();
        }
        setProfileData((prev) => ({ ...prev, transcriptText }));
      }

      await stopRecording(recordingId, {
        occasion: profileData.occasion,
        location: profileData.locationContext,
        transcriptText,
      });
      setIsTranscribing(false);
      setShowProfileForm(true);
      setTranscriptionStatus(transcriptText ? 'Transcript captured successfully.' : '');
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Unable to stop recording');
    } finally {
      setIsProcessingTranscript(false);
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setError('');
    setSelectedImageName(file.name);
    setIsProcessingOcr(true);
    try {
      const response = await uploadImageForOcr(file);
      setProfileData((prev) => ({
        ...prev,
        transcriptText: response.text,
      }));
      setTranscriptionStatus('Notes image converted to text successfully.');
      setShowProfileForm(true);
      const id = await ensureRecording();
      setRecordingId(id);
    } catch (ocrError) {
      setError(ocrError instanceof Error ? ocrError.message : 'Unable to extract text from image');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleUseTypedText = async () => {
    setError('');
    try {
      const id = await ensureRecording();
      setRecordingId(id);
      setShowProfileForm(true);
      setTranscriptionStatus('Type or paste your notes, then save the contact.');
    } catch (typedError) {
      setError(typedError instanceof Error ? typedError.message : 'Unable to prepare text capture');
    }
  };

  const handleCreateProfile = async () => {
    const transcriptText = profileData.transcriptText.trim();
    if (!transcriptText) {
      setError('Transcript or notes text is required.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const id = await ensureRecording();
      if (captureSource !== 'transcribe') {
        await stopRecording(id, {
          occasion: profileData.occasion,
          location: profileData.locationContext,
          transcriptText,
        });
      }

      const response = await createContactFromRecording({
        recordingId: id,
        contactId: existingContact?.id ?? (contactMode === 'existing' ? selectedExistingContactId ?? undefined : undefined),
        profile: {
          ...profileData,
          transcriptText,
          platform,
        },
      });
      onStop(response.contact);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceCards = [
    {
      id: 'transcribe' as const,
      title: 'Transcribe',
      description: 'Use the microphone for live transcript + final speech-to-text.',
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: 'photo' as const,
      title: 'Photo Notes',
      description: 'Take a picture of written notes and run OCR through Gemini.',
      icon: <ScanText className="w-5 h-5" />,
    },
    {
      id: 'text' as const,
      title: 'Type Text',
      description: 'Paste or type conversation notes directly without recording.',
      icon: <Keyboard className="w-5 h-5" />,
    },
  ];

  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-white font-semibold text-lg">Create Contact Profile</h1>
              <p className="text-slate-400 text-sm">
                {existingContact ? `Add this conversation to ${existingContact.name}` : 'Save this conversation into your network memory'}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-5 border border-green-500/20 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Loader className="w-5 h-5 text-green-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {captureSource === 'transcribe' ? 'Transcription Ready' : captureSource === 'photo' ? 'OCR Ready' : 'Text Notes Ready'}
                </h3>
                <p className="text-slate-300 text-sm">
                  {captureSource === 'transcribe' ? `Duration: ${formatDuration(duration)}` : 'Ready to analyze notes'}
                </p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gemini will summarize this conversation, extract insights, and generate follow-up actions when you save the contact.
            </p>
          </div>

          {transcriptionStatus && (
            <div className="mb-4 rounded-xl border border-teal-800 bg-teal-950/40 px-4 py-3 text-sm text-teal-200">
              {transcriptionStatus}
            </div>
          )}

          <div className="space-y-4">
            {!existingContact && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-3">
                  <h3 className="text-white font-semibold">Where should this conversation go?</h3>
                  <p className="text-slate-400 text-sm">Create a new contact or attach it to someone already in your network.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactMode('new')}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${contactMode === 'new' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'}`}
                  >
                    Create New
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactMode('existing')}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${contactMode === 'existing' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'}`}
                  >
                    Add to Existing
                  </button>
                </div>

                {contactMode === 'existing' && (
                  <div className="mt-4">
                    <label className="block">
                      <span className="block text-slate-300 font-medium mb-2">Find contact</span>
                      <input
                        type="text"
                        value={existingContactQuery}
                        onChange={(event) => setExistingContactQuery(event.target.value)}
                        placeholder={existingContactsLoading ? 'Loading contacts...' : 'Search by name, title, company, or location'}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </label>
                    <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                      {filteredExistingContacts.map((contact) => {
                        const selected = selectedExistingContactId === contact.id;
                        return (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => handleSelectExistingContact(contact.id)}
                            className={`w-full border-b border-slate-800 px-4 py-3 text-left last:border-b-0 transition-colors ${
                              selected ? 'bg-teal-500/20' : 'hover:bg-slate-900'
                            }`}
                          >
                            <div className="font-medium text-white">{contact.name}</div>
                            <div className="text-sm text-slate-400">{contact.title} at {contact.company}</div>
                            <div className="text-xs text-slate-500">{contact.location}</div>
                          </button>
                        );
                      })}
                      {!existingContactsLoading && filteredExistingContacts.length === 0 && (
                        <div className="px-4 py-4 text-sm text-slate-400">
                          No contacts match that search yet.
                        </div>
                      )}
                    </div>
                    {!existingContactsLoading && existingContacts.length === 0 && (
                      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                        No contacts found yet. Create a new contact first.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <span className="block text-slate-300 font-medium mb-2">Name <span className="text-red-400">*</span></span>
              <input
                type="text"
                value={profileData.name}
                onChange={(event) => handleInputChange('name', event.target.value)}
                placeholder="Enter contact name"
                disabled={!existingContact && contactMode === 'existing' && !!selectedExistingContactId}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-slate-300 font-medium mb-2">Title</span>
                <input
                  type="text"
                  value={profileData.title}
                  onChange={(event) => handleInputChange('title', event.target.value)}
                  placeholder="VP Product"
                  disabled={!existingContact && contactMode === 'existing' && !!selectedExistingContactId}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500"
                />
              </label>
              <label className="block">
                <span className="block text-slate-300 font-medium mb-2">Company</span>
                <input
                  type="text"
                  value={profileData.company}
                  onChange={(event) => handleInputChange('company', event.target.value)}
                  placeholder="TechCorp"
                  disabled={!existingContact && contactMode === 'existing' && !!selectedExistingContactId}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-slate-300 font-medium mb-2">Location</span>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(event) => handleInputChange('location', event.target.value)}
                  placeholder="San Francisco, CA"
                  disabled={!existingContact && contactMode === 'existing' && !!selectedExistingContactId}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-slate-300 font-medium mb-2">Occasion</span>
              <input
                type="text"
                value={profileData.occasion}
                onChange={(event) => handleInputChange('occasion', event.target.value)}
                placeholder="Networking dinner, Zoom intro call, conference coffee chat..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500"
              />
            </label>

            <label className="block">
              <span className="block text-slate-300 font-medium mb-2">Conversation Location / Context</span>
              <input
                type="text"
                value={profileData.locationContext}
                onChange={(event) => handleInputChange('locationContext', event.target.value)}
                placeholder="Moscone Center, virtual meeting room, email thread..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500"
              />
            </label>

            <label className="block">
              <span className="block text-slate-300 font-medium mb-2">Transcript / Conversation Notes <span className="text-red-400">*</span></span>
              <div className="relative">
                <FileText className="absolute left-3 top-4 text-slate-500 w-4 h-4" />
                <textarea
                  value={profileData.transcriptText}
                  onChange={(event) => handleInputChange('transcriptText', event.target.value)}
                  placeholder={
                    captureSource === 'transcribe'
                      ? 'Auto-filled from the microphone recording. You can edit or add notes before saving.'
                      : captureSource === 'photo'
                        ? 'OCR will place extracted notes here. You can edit before saving.'
                        : 'Type or paste the conversation notes here.'
                  }
                  className="w-full min-h-[180px] pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500 resize-none"
                />
              </div>
              {interimTranscript && (
                <div className="mt-3 rounded-lg border border-cyan-800 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100">
                  <span className="font-medium text-cyan-300">Live transcript:</span> {interimTranscript}
                </div>
              )}
            </label>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Social Profiles (Optional)
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'linkedIn', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-blue-400" />, placeholder: 'linkedin.com/in/username' },
                  { key: 'twitter', label: 'Twitter', icon: <Twitter className="w-4 h-4 text-sky-400" />, placeholder: '@username' },
                  { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-400" />, placeholder: '@username' },
                  { key: 'github', label: 'GitHub', icon: <Github className="w-4 h-4 text-slate-400" />, placeholder: 'github.com/username' },
                ].map((field) => (
                  <div key={field.key}>
                    <div className="flex items-center gap-2 mb-2">
                      {field.icon}
                      <label className="text-slate-300 text-sm font-medium">{field.label}</label>
                    </div>
                    <input
                      type="text"
                      value={profileData[field.key as keyof typeof profileData]}
                      onChange={(event) => handleInputChange(field.key as keyof typeof profileData, event.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-slate-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="pt-4 space-y-3">
              <button
                onClick={() => void handleCreateProfile()}
                disabled={
                  !profileData.name ||
                  !profileData.transcriptText.trim() ||
                  isSubmitting ||
                  isProcessingTranscript ||
                  isProcessingOcr ||
                  (!existingContact && contactMode === 'existing' && !selectedExistingContactId)
                }
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : existingContact || contactMode === 'existing' ? 'Attach Conversation & Refresh Contact' : 'Create Profile & View Insights'}
              </button>
              <button onClick={onBack} className="w-full bg-slate-800 text-slate-300 py-3 px-4 rounded-xl font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-semibold text-lg">New Conversation</h1>
            <p className="text-slate-400 text-sm">
              {existingContact ? `Add a new conversation source for ${existingContact.name}` : 'Choose how you want to capture this conversation'}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        <div className="space-y-3 mb-8">
          {sourceCards.map((source) => (
            <button
              key={source.id}
              onClick={() => setCaptureSource(source.id)}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                captureSource === source.id
                  ? 'border-teal-400 bg-teal-500/10 shadow-lg shadow-teal-500/10'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${captureSource === source.id ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {source.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-white font-semibold">{source.title}</h2>
                    {captureSource === source.id && <CheckCircle2 className="w-5 h-5 text-teal-300" />}
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{source.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold">
              {captureSource === 'transcribe' ? 'Live Transcription' : captureSource === 'photo' ? 'Notes Photo OCR' : 'Direct Text Entry'}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {captureSource === 'transcribe'
                ? 'The microphone only turns on in this mode.'
                : captureSource === 'photo'
                  ? 'Upload a photo of handwritten or typed notes and convert it to text.'
                  : 'Skip recording and go straight to typing or pasting your notes.'}
            </p>
          </div>

          {captureSource === 'transcribe' ? (
            !isTranscribing ? (
              <div className="text-center">
                <div className="w-28 h-28 mx-auto mb-5 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full flex items-center justify-center border-2 border-teal-400/30">
                  <Mic className="w-14 h-14 text-teal-400" />
                </div>
                <div className="mb-4">
                  <label className="block text-left">
                    <span className="block text-slate-300 font-medium mb-2">Conversation source</span>
                    <select
                      value={platform}
                      onChange={(event) => setPlatform(event.target.value as typeof platform)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      <option>In-Person</option>
                      <option>Phone Call</option>
                      <option>Video Call</option>
                      <option>Email</option>
                      <option>LinkedIn Message</option>
                      <option>Text Message</option>
                    </select>
                  </label>
                </div>
                <button
                  onClick={() => void handleStartTranscribing()}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-teal-500 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-60"
                >
                  {isSubmitting ? 'Starting...' : 'Start Transcribing'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-28 h-28 mx-auto mb-5 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center relative animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full animate-ping opacity-20"></div>
                  <Mic className="w-14 h-14 text-white relative z-10" />
                </div>
                <div className="text-blue-400 text-4xl font-mono mb-4">{formatDuration(duration)}</div>
                {transcriptionStatus && <p className="text-sm text-teal-300 mb-4">{transcriptionStatus}</p>}
                <textarea
                  value={profileData.transcriptText}
                  onChange={(event) => handleInputChange('transcriptText', event.target.value)}
                  placeholder="Live transcript and notes will appear here."
                  className="w-full min-h-[160px] rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                />
                {interimTranscript && (
                  <div className="mt-4 rounded-xl border border-cyan-800 bg-cyan-950/40 px-4 py-3 text-left text-sm text-cyan-100">
                    <div className="mb-1 font-medium text-cyan-300">Live transcript</div>
                    <div>{interimTranscript}</div>
                  </div>
                )}
                <button
                  onClick={() => void handleStopTranscribing()}
                  disabled={isSubmitting || isProcessingTranscript}
                  className="mt-6 bg-slate-800 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 mx-auto border border-slate-700 disabled:opacity-60"
                >
                  <Square className="w-5 h-5" />
                  {isProcessingTranscript ? 'Transcribing...' : isSubmitting ? 'Stopping...' : 'Stop & Continue'}
                </button>
              </div>
            )
          ) : captureSource === 'photo' ? (
            <div className="space-y-4">
              <label className="block">
                <span className="block text-slate-300 font-medium mb-2">Upload notes photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
                  className="hidden"
                  id="notes-photo-upload"
                />
                <label
                  htmlFor="notes-photo-upload"
                  className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-6 text-slate-300 hover:border-teal-500 hover:text-white"
                >
                  <Upload className="w-5 h-5" />
                  <span>{selectedImageName || 'Choose image'}</span>
                </label>
              </label>
              <textarea
                value={profileData.transcriptText}
                onChange={(event) => handleInputChange('transcriptText', event.target.value)}
                placeholder="OCR output will appear here. You can edit it before continuing."
                className="w-full min-h-[180px] rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
              <button
                onClick={() => void handleUseTypedText()}
                disabled={isProcessingOcr}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold disabled:opacity-50"
              >
                {isProcessingOcr ? 'Running OCR...' : 'Continue with OCR Text'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={profileData.transcriptText}
                onChange={(event) => handleInputChange('transcriptText', event.target.value)}
                placeholder="Type or paste the conversation notes here."
                className="w-full min-h-[220px] rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
              <button
                onClick={() => void handleUseTypedText()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold"
              >
                Continue with Typed Text
              </button>
            </div>
          )}

          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>
      </main>
    </div>
  );
}
