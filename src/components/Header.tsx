import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function Header() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? 'bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-b border-[var(--border-primary)]' : 'bg-transparent'
      }`}
      style={{ height: '56px' }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost p-2 lg:hidden -ml-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-green-muted)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-[var(--text-primary)] hidden sm:block">Family Activity</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            <a href="/" className="btn-ghost px-3 py-1.5 text-sm">
              <span className="font-medium">Dashboard</span>
            </a>
          </nav>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] transition-all"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-green-muted)] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[var(--accent-green)]">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[160px]">{user.email}</p>
                    <p className="text-xs text-[var(--text-muted)]">Signed in</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-strong rounded-xl border shadow-xl animate-slide-down py-1" role="menu">
                    <div className="px-3 py-2 border-b border-[var(--border-primary)]">
                      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Account</p>
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden glass-strong border-t border-[var(--border-primary)] animate-slide-down">
          <nav className="px-4 py-3 space-y-2" aria-label="Mobile navigation">
            <a href="/" className="btn-secondary w-full justify-start px-4 py-3 text-base" onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </a>
            {user && (
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="btn-danger w-full justify-center px-4 py-3 text-base"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}