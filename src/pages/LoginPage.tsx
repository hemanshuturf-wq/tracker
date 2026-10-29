import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck, Activity } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#080C14] text-slate-100 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-scale">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 mb-4 shadow-xl shadow-emerald-500/10">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ACTIVITY<span className="text-emerald-400">PULSE</span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-mono">
            Secure Admin Telemetry Console
          </p>
        </div>

        {/* Login Form Box */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.1] shadow-2xl shadow-black/60 relative">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2"
              >
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white/[0.04] focus:bg-[#0E1524] border border-white/[0.08] focus:border-emerald-500/50 text-white placeholder-slate-500 outline-none transition-all"
                  placeholder="admin@example.com"
                />
                {email && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    {emailValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2"
              >
                Access Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-white/[0.04] focus:bg-[#0E1524] border border-white/[0.08] focus:border-emerald-500/50 text-white placeholder-slate-500 outline-none transition-all"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-xs text-rose-300 animate-fade-scale"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !emailValid || !password}
              className="btn-modern-primary w-full py-2.5 mt-2 text-sm cursor-pointer"
            >
              {loading ? (
                <span>Authenticating Session…</span>
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-end encrypted telemetry stream</span>
          </div>
        </div>

      </div>
    </div>
  );
}
