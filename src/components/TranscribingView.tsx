import { useState, useEffect } from 'react';
import { ArrowLeft, Mic, Square, Loader, User, Linkedin, Twitter, Instagram, Github } from 'lucide-react';
import type { Contact } from '../App';

interface TranscribingViewProps {
  onStop: (contact: Contact) => void;
  onBack: () => void;
}

export function TranscribingView({ onStop, onBack }: TranscribingViewProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    title: '',
    company: '',
    linkedIn: '',
    twitter: '',
    instagram: '',
    github: ''
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTranscribing) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTranscribing]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTranscribing = () => {
    setIsTranscribing(true);
    setIsPulsing(true);
  };

  const handleStopTranscribing = () => {
    setIsTranscribing(false);
    setIsPulsing(false);
    setShowProfileForm(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateProfile = () => {
    // Simulated contact creation with the profile data
    const newContact: Contact = {
      id: Date.now().toString(),
      name: profileData.name || 'New Contact',
      title: profileData.title || 'Position not specified',
      company: profileData.company || 'Company not specified',
      location: 'Location from conversation',
      linkedInUrl: profileData.linkedIn || '',
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      dateAdded: new Date().toISOString().split('T')[0],
      notes: `Met during ${duration} second conversation. Profile created from transcription.`,
      keyFacts: [
        { text: 'Information extracted from conversation', source: 'Conversation', category: 'Professional' }
      ],
      funFacts: [
        { text: 'Details gathered during discussion', source: 'Conversation', category: 'Personal' }
      ],
      suggestedActions: [],
      conversationDuration: formatDuration(duration)
    };

    onStop(newContact);
  };

  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-white font-semibold text-lg">Create Contact Profile</h1>
              <p className="text-slate-400 text-sm">Add details about your conversation</p>
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
                <h3 className="text-white font-semibold">Transcription Complete</h3>
                <p className="text-slate-300 text-sm">Duration: {formatDuration(duration)}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              AI is processing your conversation and extracting insights. Complete the profile below to save this contact.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter contact name"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={profileData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g. Product Manager"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Company</label>
                <input
                  type="text"
                  value={profileData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="e.g. TechCorp"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Social Media (Optional)
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Linkedin className="w-4 h-4 text-blue-400" />
                    <label className="text-slate-300 text-sm font-medium">LinkedIn</label>
                  </div>
                  <input
                    type="text"
                    value={profileData.linkedIn}
                    onChange={(e) => handleInputChange('linkedIn', e.target.value)}
                    placeholder="linkedin.com/in/username"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Twitter className="w-4 h-4 text-sky-400" />
                    <label className="text-slate-300 text-sm font-medium">Twitter</label>
                  </div>
                  <input
                    type="text"
                    value={profileData.twitter}
                    onChange={(e) => handleInputChange('twitter', e.target.value)}
                    placeholder="@username"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <label className="text-slate-300 text-sm font-medium">Instagram</label>
                  </div>
                  <input
                    type="text"
                    value={profileData.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    placeholder="@username"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Github className="w-4 h-4 text-slate-400" />
                    <label className="text-slate-300 text-sm font-medium">GitHub</label>
                  </div>
                  <input
                    type="text"
                    value={profileData.github}
                    onChange={(e) => handleInputChange('github', e.target.value)}
                    placeholder="github.com/username"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={handleCreateProfile}
                disabled={!profileData.name}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Create Profile & View Insights
              </button>

              <button
                onClick={onBack}
                className="w-full bg-slate-800 text-slate-300 py-3 px-4 rounded-xl font-medium border border-slate-700 hover:bg-slate-700 transition-colors"
              >
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
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-white font-semibold text-lg">New Conversation</h1>
        </div>
      </header>

      {/* Main Transcribing Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        {!isTranscribing ? (
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full flex items-center justify-center border-2 border-teal-400/30">
                <Mic className="w-16 h-16 text-teal-400" />
              </div>
              <h2 className="text-white mb-2">Ready to Record</h2>
              <p className="text-slate-400">
                Start transcribing your networking conversation
              </p>
            </div>

            <button
              onClick={handleStartTranscribing}
              className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-teal-500 hover:to-cyan-600 transition-all hover:scale-105 shadow-lg"
            >
              Start Transcribing
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <div className={`w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center relative ${isPulsing ? 'animate-pulse' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full animate-ping opacity-20"></div>
                <Mic className="w-16 h-16 text-white relative z-10" />
              </div>
              <h2 className="text-white mb-2">Transcribing...</h2>
              <div className="text-blue-400 text-4xl font-mono mb-6">
                {formatDuration(duration)}
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Active conversation</span>
              </div>
            </div>

            <button
              onClick={handleStopTranscribing}
              className="bg-slate-800 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2 mx-auto border border-slate-700"
            >
              <Square className="w-5 h-5" />
              Stop & Create Profile
            </button>
          </div>
        )}
      </main>
    </div>
  );
}