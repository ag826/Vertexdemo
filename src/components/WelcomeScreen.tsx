import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';

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
    <div className="vx-app" style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
      <main style={{ width: '100%', maxWidth: 460, marginTop: 24, marginBottom: 24 }}>
        <div className="vx-col" style={{ marginBottom: 20 }}>
          <div className="vx-brand">Vertex</div>
          <h1 className="vx-h1">Capture conversations. Build better follow-ups.</h1>
          <p className="vx-body" style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Sign in quickly, record once, then link the transcript to the right contact.
          </p>
        </div>

        <div className="vx-section" style={{ marginBottom: 12 }}>
          <button
            onClick={onGoogleSignIn}
            disabled={isLoading || !googleEnabled}
            className="vx-btn"
            style={{ width: '100%', height: 44 }}
          >
            {googleEnabled ? 'Continue with Google' : 'Google not configured'}
          </button>

          <div className="vx-caption" style={{ textAlign: 'center', marginTop: 12, marginBottom: 12 }}>or</div>

          <div className="vx-row" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 12 }}>
            <button
              type="button"
              className={`vx-btn ${mode === 'login' ? '' : 'vx-btn-ghost'}`}
              onClick={() => setMode('login')}
              style={{ flex: 1, height: 38 }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`vx-btn ${mode === 'register' ? '' : 'vx-btn-ghost'}`}
              onClick={() => setMode('register')}
              style={{ flex: 1, height: 38 }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="vx-col">
            {mode === 'register' && (
              <input
                className="vx-input"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
            {mode === 'register' && (
              <input
                className="vx-input"
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
            <input
              className="vx-input"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
            <input
              className="vx-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="submit" disabled={isLoading} className="vx-btn vx-btn-primary" style={{ height: 44 }}>
              <span className="vx-row" style={{ justifyContent: 'center' }}>
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {mode === 'register' ? 'Create account' : 'Continue'}
              </span>
            </button>
          </form>
        </div>

        {errorMessage && <div className="vx-alert">{errorMessage}</div>}
      </main>
    </div>
  );
}
