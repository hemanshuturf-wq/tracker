import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

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
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[28px] border border-[#e7e3db] bg-white shadow-[0_30px_80px_-50px_rgba(29,27,24,0.4)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1f5c4a] p-10 text-white lg:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, #ffffff 0, transparent 32%), radial-gradient(circle at 80% 70%, #ffffff 0, transparent 30%)',
            }}
          />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-white/10"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight">
                  Activity Pulse
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                  Family dashboard
                </p>
              </div>
            </div>

            <h1 className="font-display mt-16 max-w-md text-[42px] leading-[1.05] tracking-tight">
              A calmer way to stay close.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              Screen time, app usage, and shared moments — gathered privately for
              the two people who matter.
            </p>

            <div className="mt-10 space-y-4">
              {[
                'Per-app screen time and data usage',
                'Remote camera, even when the phone is away',
                'A quiet, chronological family feed',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-[10px] uppercase tracking-[0.16em] text-white/50">
            <span>Private by design</span>
            <span>Two authorized accounts</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center bg-[#fbfaf8] p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f5c4a] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold tracking-tight text-[#1d1b18]">
                    Activity Pulse
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#96918a]">
                    Family dashboard
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#96918a]">
                Welcome back
              </p>
              <h2 className="font-display mt-1 text-3xl tracking-tight text-[#1d1b18]">
                Sign in
              </h2>
              <p className="mt-1.5 text-sm text-[#6e6a63]">
                Use one of the two authorized family accounts.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6a63]"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96918a]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="input-field py-2.5 pl-10 pr-10 text-sm"
                    placeholder="you@example.com"
                  />
                  {email && (
                    <span className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center">
                      {emailValid ? (
                        <CheckCircle className="h-4 w-4 text-[#1f5c4a]" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-[#b42318]" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6a63]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96918a]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    className="input-field py-2.5 pl-10 pr-11 text-sm"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#96918a] hover:bg-[#f3f1ec] hover:text-[#1d1b18]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-[#fecdca] bg-[#fef3f2] p-3 text-xs leading-relaxed text-[#b42318]"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !emailValid || !password}
                className="btn-primary mt-2 w-full py-2.5 text-sm"
              >
                {loading ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-[#96918a]">
              Access is limited to the two authorized accounts. Activity is
              visible to both.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
