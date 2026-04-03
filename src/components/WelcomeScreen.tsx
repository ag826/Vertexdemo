import { useState } from 'react';
import { Brain, Mail, Lock, User, Users } from 'lucide-react';
import vertexLogo from 'figma:asset/62edb3c51125a4b122ed2c06dafbbf9a9e7bec60.png';

interface WelcomeScreenProps {
  onSubmit: (payload: { mode: 'login' | 'register'; name?: string; email: string; password: string }) => Promise<void>;
}

export function WelcomeScreen({ onSubmit }: WelcomeScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ mode, name, email, password });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to continue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      <header className="p-4 flex justify-center max-w-lg mx-auto w-full">
        <img src={vertexLogo} alt="Vertex" className="h-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={vertexLogo} alt="Vertex" className="w-52 h-auto" />
          </div>
          <h1 className="text-slate-900 mb-4">Capture conversations.<br />Build networking personas.</h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Record real conversations, turn them into structured contact intelligence, and keep your follow-up momentum moving.
          </p>
        </div>

        <div className="w-full space-y-4 mb-8">
          <div className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold mb-1">AI Conversation Processing</h3>
              <p className="text-slate-600 text-sm">Gemini summarizes transcripts, extracts insights, and suggests next steps.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold mb-1">Persistent Contact Memory</h3>
              <p className="text-slate-600 text-sm">Every profile, action item, and note is saved to the backend database.</p>
            </div>
          </div>
        </div>

        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                mode === 'register' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                mode === 'login' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Sign in
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-2 block">Name</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Your name"
                    required
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700 mb-2 block">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 mb-2 block">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all font-semibold shadow-lg disabled:opacity-60"
            >
              {isSubmitting ? 'Working...' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm">
        <p>Designed for busy professionals at networking events</p>
      </footer>
    </div>
  );
}
