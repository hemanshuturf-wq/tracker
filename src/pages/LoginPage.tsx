import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || !password) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch {
      // error set in context
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-radial relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(127,224,127,0.03)_0%,_transparent_70%)] pointer-events-none" />
      
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="text-center mb-8 animate-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-green-muted)] border border-[var(--accent-green)]/30 mb-5 animate-pulse-soft">
            <svg className="w-8 h-8 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Family Activity</h1>
          <p className="mt-2 text-[var(--text-secondary)] text-sm max-w-xs mx-auto">
            Both authorized users can sign in. All data is shared securely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5 animate-in stagger-1">
          <div>
            <label htmlFor="email" className="label">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
                className={`input pl-10 ${email && !emailValid ? 'input-error' : ''}`}
                placeholder="parth@gmail.com"
                aria-describedby={email && !emailValid ? 'email-error' : undefined}
              />
              {email && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {emailValid ? (
                    <CheckCircle className="w-5 h-5 text-[var(--accent-green)]" />
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-[var(--accent-red)]" />
                      <span id="email-error" className="sr-only">Invalid email format</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
                className="input pl-10 pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg animate-in animate-wiggle" role="alert">
              <AlertCircle className="w-5 h-5 text-[var(--accent-red)] flex-shrink-0" />
              <p className="text-sm text-[var(--accent-red)]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !emailValid || !password}
            className="btn-primary w-full py-3 text-base mt-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <p className="text-center text-xs text-[var(--text-muted)] pt-2">
            Accounts must be created in the Firebase console before first use.
          </p>
        </form>

        <div className="mt-6 text-center animate-in stagger-2">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-green)]" />
            </span>
            <span className="text-xs text-[var(--text-secondary)]">End-to-end encrypted • Real-time sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}