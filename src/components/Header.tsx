import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  LogOut,
  User as UserIcon,
  UploadCloud,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AmiChanCatMascot } from './AmiChanCatMascot';

interface HeaderProps {
  partnerName?: string;
  connectionStatus?: 'connected' | 'connecting' | 'error';
  onOpenUploadApk?: () => void;
}

export default function Header({
  partnerName = 'Partner',
  connectionStatus = 'connected',
  onOpenUploadApk,
}: HeaderProps) {
  const { user, signOut } = useAuth();
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

  const statusLabel =
    connectionStatus === 'connected'
      ? `Live · ${partnerName}`
      : connectionStatus === 'connecting'
        ? 'Connecting'
        : 'Offline';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'border-b border-[#f0e4ea] bg-[#fffafb]/95 shadow-[0_8px_30px_-24px_rgba(194,24,91,0.18)] backdrop-blur-xl'
          : 'border-b border-[#f5e6ec] bg-[#fffafb]/85 backdrop-blur-md'
      }`}
      style={{ height: '68px' }}
    >
      <div className="mx-auto h-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-4">
          <a href="/" className="group flex items-center gap-3">
            <AmiChanCatMascot size={36} mood="happy" />
            <div className="leading-none">
              <span className="font-display text-[19px] font-semibold tracking-tight text-[#1d1b18] flex items-center gap-1.5">
                Activity Pulse
                <span className="text-[10px] text-[#ff4081] font-sans font-bold">🌸</span>
              </span>
              <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-[#c2185b] sm:block">
                AmiChan Sanctuary
              </span>
            </div>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Overview', href: '#overview' },
              { label: 'Usage', href: '#usage' },
              { label: 'Camera', href: '#camera' },
              { label: 'Activity', href: '#activity' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-[#6e6a63] transition-colors hover:bg-white hover:text-[#c2185b]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {/* Upload New APK Button */}
            {onOpenUploadApk && (
              <button
                type="button"
                onClick={onOpenUploadApk}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#f5d5e2] bg-[#fff0f5] text-[#c2185b] hover:bg-[#ff4081] hover:text-white transition-all text-xs font-semibold shadow-2xs active:scale-95"
                title="Upload new APK to GitHub releases and notify app"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload APK</span>
              </button>
            )}

            <div className="hidden items-center gap-2 rounded-full border border-[#f5e6ec] bg-white px-3 py-1.5 sm:flex">
              <span className="relative flex h-2 w-2">
                {connectionStatus === 'connected' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c2185b] opacity-30" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-[#c2185b]'
                      : connectionStatus === 'connecting'
                        ? 'bg-[#b54708]'
                        : 'bg-[#b42318]'
                  }`}
                />
              </span>
              <span className="text-[11px] font-medium text-[#6e6a63]">
                {statusLabel}
              </span>
            </div>

            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-[#f5e6ec] bg-white py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-[#f0d4df] hover:bg-[#fff9fb]"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff0f5] text-xs font-semibold text-[#c2185b]">
                    {user.email?.charAt(0).toUpperCase() || (
                      <UserIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="max-w-[140px] truncate text-[11px] font-medium text-[#1d1b18]">
                      {user.email}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-[#c2185b]">
                      Admin
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[#96918a] transition-transform ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 animate-slide-down-fade rounded-2xl border border-[#f5e6ec] bg-white p-2 shadow-[0_24px_60px_-24px_rgba(194,24,91,0.2)]">
                    <div className="mb-1 border-b border-[#fdf0f4] px-3 py-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#96918a]">
                        Signed in as
                      </p>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-[#1d1b18]">
                        {user.email}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[#c2185b]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#c2185b]" />
                        Authorized family admin
                      </p>
                    </div>

                    {onOpenUploadApk && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenUploadApk();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[#1d1b18] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
                      >
                        <UploadCloud className="h-4 w-4 text-[#c2185b]" />
                        <span className="font-medium">Upload New APK</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[#b42318] transition-colors hover:bg-[#fef3f2]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="font-medium">Sign out</span>
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
