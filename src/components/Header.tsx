import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, Radio, Shield, User as UserIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface HeaderProps {
  partnerName?: string;
  connectionStatus?: 'connected' | 'connecting' | 'error';
}

export default function Header({
  partnerName = 'Partner',
  connectionStatus = 'connected'
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080C14]/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-2xl shadow-black/40'
          : 'bg-[#080C14]/60 backdrop-blur-md border-b border-white/[0.04]'
      }`}
      style={{ height: '64px' }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center justify-between gap-4">
          
          {/* Brand Logo & Telemetry */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-500/10 border border-emerald-500/30 group-hover:border-emerald-400/60 transition-all shadow-lg shadow-emerald-500/10">
                <Shield className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#080C14]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  ACTIVITY<span className="text-emerald-400">PULSE</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                    Live
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono tracking-tight -mt-0.5 hidden sm:block">
                  Device Telemetry & Monitoring
                </span>
              </div>
            </a>
          </div>

          {/* Right Section: Status Indicator & Account */}
          <div className="flex items-center gap-3">
            
            {/* Live Connection Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="relative flex h-2 w-2">
                {connectionStatus === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
              </span>
              <span className="text-xs font-mono font-medium text-slate-300 capitalize">
                {connectionStatus === 'connected' ? `Synced with ${partnerName}` : connectionStatus}
              </span>
            </div>

            {/* User Profile Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer group"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-md">
                    {user.email?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                      {user.email}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Authorized Admin
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass-panel rounded-2xl border border-white/[0.12] shadow-2xl p-2 animate-slide-down-fade z-50">
                    <div className="px-3 py-2.5 border-b border-white/[0.08] mb-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
                        Active Account
                      </p>
                      <p className="text-sm font-semibold text-white truncate mt-0.5">
                        {user.email}
                      </p>
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                        <Radio className="w-3 h-3" /> Real-time listener active
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm text-rose-300 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
