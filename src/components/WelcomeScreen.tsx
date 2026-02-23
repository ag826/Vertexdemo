import { FormEvent, useState } from 'react';
import { Users, Mic, Brain, Loader2 } from 'lucide-react';

interface WelcomeScreenProps {
  onGoogleSignIn: () => void;
  onRegister: (payload: { username: string; password: string; name?: string; email?: string }) => Promise<void>;
  onLogin: (payload: { username: string; password: string }) => Promise<void>;
  googleEnabled: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function WelcomeScreen({
  onGoogleSignIn,
  onRegister,
  onLogin,
  googleEnabled,
  isLoading = false,
  errorMessage,
}: WelcomeScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register') {
      await onRegister({ username, password, name, email });
      return;
    }
    await onLogin({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="p-4 flex justify-between items-center max-w-lg mx-auto w-full">
        <div className="text-blue-400 font-semibold text-xl">Vertex</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-4">Capture conversations.<br />Build networking personas.</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Sign in with Google, or create a username/password account.
          </p>
        </div>

        <div className="w-full space-y-4 mb-8">
          <div className="flex items-start gap-4 bg-slate-900/50 backdrop-blur-sm p-4 rounded-lg border border-slate-800">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Automatic Recording</h3>
              <p className="text-slate-400 text-sm">Capture context from conversations and sync it to your contact profiles</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-slate-900/50 backdrop-blur-sm p-4 rounded-lg border border-slate-800">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Smart Personas</h3>
              <p className="text-slate-400 text-sm">Generate key insights, actions, and transcript-backed evidence</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="w-full mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="w-full space-y-3 mb-4">
          <button
            onClick={onGoogleSignIn}
            disabled={isLoading || !googleEnabled}
            className="w-full bg-white text-slate-900 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleEnabled ? 'Continue with Google' : 'Google Auth Not Configured'}
          </button>

          <div className="text-center text-slate-500 text-xs">or</div>

          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md text-sm ${
                mode === 'login' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-md text-sm ${
                mode === 'register' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            )}
            {mode === 'register' && (
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            )}
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-400 text-white py-3 rounded-lg font-semibold disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'register' ? 'Create account' : 'Log in'}
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
