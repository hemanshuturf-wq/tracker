import React, { memo } from 'react';
import { clsx } from 'clsx';

interface AppIconProps {
  packageName: string | null;
  appLabel: string | null;
  size?: number;
  className?: string;
}

// Real SVG Logos for popular Android applications
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path
        fill="#FFFFFF"
        d="M34.2 13.8C31.5 11.1 27.9 9.6 24.1 9.6c-7.9 0-14.3 6.4-14.3 14.3 0 2.5.7 5 1.9 7.2L9.6 38.4l7.5-2c2.1 1.2 4.5 1.8 7 1.8h.1c7.9 0 14.3-6.4 14.3-14.3-.1-3.8-1.6-7.4-4.3-10.1zm-10.1 22.1h-.1c-2.1 0-4.2-.6-6-1.7l-.4-.3-4.5 1.2 1.2-4.4-.3-.5c-1.2-1.9-1.8-4-1.8-6.3 0-6.6 5.4-12 12-12 3.2 0 6.2 1.2 8.5 3.5 2.3 2.3 3.5 5.3 3.5 8.5 0 6.6-5.4 12-12.1 12zm6.6-9c-.4-.2-2.2-1.1-2.5-1.2-.4-.1-.6-.2-.9.2s-1 1.2-1.2 1.5-.4.3-.7.1c-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.7.2-.2.2-.4.3-.7.1-.2 0-.5-.1-.7-.1-.2-.9-2.1-1.2-2.9-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.5 1.5-1.5 3.6s1.5 4.2 1.7 4.5c.2.3 3 4.6 7.3 6.5 1 .4 1.8.7 2.4.9 1 .3 2 .3 2.8.2.8-.1 2.5-1 2.8-2 .4-1 .4-1.9.3-2.1-.2-.2-.5-.3-.9-.5z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="ig-grad-opt" cx="20%" cy="100%" r="130%">
          <stop offset="0%" stopColor="#ffb140" />
          <stop offset="25%" stopColor="#ff5445" />
          <stop offset="60%" stopColor="#d82d7e" />
          <stop offset="90%" stopColor="#9b36b7" />
          <stop offset="100%" stopColor="#4c64d8" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#ig-grad-opt)" />
      <rect x="12" y="12" width="24" height="24" rx="7" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <circle cx="24" cy="24" r="5.5" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <circle cx="31" cy="17" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FF0000" />
      <path
        fill="#FFFFFF"
        d="M37.8 17.6c-.4-1.5-1.6-2.7-3.1-3.1C32 14 24 14 24 14s-8 0-10.7.5c-1.5.4-2.7 1.6-3.1 3.1C9.7 20.3 9.7 24 9.7 24s0 3.7.5 6.4c.4 1.5 1.6 2.7 3.1 3.1 2.7.5 10.7.5 10.7.5s8 0 10.7-.5c1.5-.4 2.7-1.6 3.1-3.1.5-2.7.5-6.4.5-6.4s0-3.7-.5-6.4z"
      />
      <path fill="#FF0000" d="M21 28.5l8-4.5-8-4.5z" />
    </svg>
  );
}

function ChromeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#FFFFFF" />
      <path d="M24 5c7.8 0 14.6 4.6 17.6 11.3H24.3l-5.6 9.8L12.5 15.5C15.2 9.2 21.2 5 24 5z" fill="#EA4335" />
      <path d="M41.6 16.3C43.1 19.6 44 23.2 44 27c0 8.8-5.7 16.2-13.6 18.9L24.8 33.7l6.2-10.8 10.6-6.6z" fill="#FBBC05" />
      <path d="M30.4 45.9C28.3 46.6 26.2 47 24 47c-10.5 0-19.4-7.1-22.1-16.7l11.4-1.3 5.4 9.4 11.7 7.5z" fill="#34A853" />
      <circle cx="24" cy="24" r="9" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="7.5" fill="#4285F4" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFFFF" />
      <path fill="#4285F4" d="M10 33.5V17.8l14 10.5 14-10.5v15.7c0 1.4-1.1 2.5-2.5 2.5H12.5c-1.4 0-2.5-1.1-2.5-2.5z" />
      <path fill="#34A853" d="M10 17.8V14.5c0-1.4 1.1-2.5 2.5-2.5h2.2l9.3 7-14 8.8z" />
      <path fill="#EA4335" d="M38 17.8V14.5c0-1.4-1.1-2.5-2.5-2.5h-2.2l-9.3 7 14 8.8z" />
      <path fill="#FBBC05" d="M14.7 12h18.6l-9.3 7-9.3-7z" />
    </svg>
  );
}

function GoogleMapsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFFFF" />
      <path d="M24 7C16.8 7 11 12.8 11 20c0 9.7 11.4 20.3 12 20.8.6-.5 12-11.1 12-20.8 0-7.2-5.8-13-13-13z" fill="#34A853" />
      <path d="M24 7c-4.4 0-8.2 2.2-10.5 5.6l9.5 8 9.5-8C30.2 9.2 26.4 7 24 7z" fill="#EA4335" />
      <path d="M13.5 12.6C11.9 14.7 11 17.2 11 20c0 5.4 3.7 11.7 8.5 17.2l3.5-9.6-9.5-15z" fill="#FBBC05" />
      <circle cx="24" cy="20" r="4.5" fill="#FFFFFF" />
      <circle cx="24" cy="20" r="3.2" fill="#4285F4" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#1DB954" />
      <path
        fill="#FFFFFF"
        d="M33.6 30.6c-.3.5-.9.7-1.4.4-4-2.4-9-3-14.9-1.6-.6.1-1.1-.3-1.3-.8-.1-.6.3-1.1.8-1.3 6.5-1.5 12.1-.8 16.5 1.9.5.3.6.9.3 1.4zm2.4-5.3c-.4.6-1.2.8-1.8.4-4.9-3-12.4-3.9-18.2-2.1-.7.2-1.4-.2-1.6-.9-.2-.7.2-1.4.9-1.6 6.7-2 15-1 20.5 2.4.6.4.8 1.2.2 1.8zm.2-5.5c-5.8-3.4-15.4-3.8-21-2.1-.9.3-1.8-.2-2.1-1.1-.3-.9.2-1.8 1.1-2.1 6.5-2 17.1-1.5 23.8 2.5.8.5 1.1 1.6.6 2.4-.5.8-1.6 1-2.4.4z"
      />
    </svg>
  );
}

function NetflixIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#000000" />
      <path fill="#E50914" d="M15 11h5v26h-5z" />
      <path fill="#B81D24" d="M28 11h5v26h-5z" />
      <path fill="#E50914" d="M15 11l13 26h5L20 11z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M29.5 25.1l.9-6h-5.8v-3.9c0-1.6.8-3.2 3.4-3.2h2.6V6.9s-2.4-.4-4.6-.4c-4.7 0-7.8 2.9-7.8 8v4.6h-5.3v6h5.3v14.5c1.1.2 2.2.3 3.3.3 1.1 0 2.2-.1 3.3-.3V25.1h5z"
      />
    </svg>
  );
}

function TwitterXIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#000000" />
      <path
        fill="#FFFFFF"
        d="M27.5 22.3L36.3 12H34.2L26.5 21 20.4 12H13.2L22.4 25.5 13.2 36.2H15.3L23.4 26.8 29.8 36.2H37L27.5 22.3zm-2.9 3.4L23.6 24.3 16.1 13.6H19.3L25.4 22.3l1 1.4 7.9 11.3H31.1L24.6 25.7z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#229ED9" />
      <path
        fill="#FFFFFF"
        d="M34.8 13.4L11.5 22.4c-1.6.6-1.6 1.5-.3 1.9l6 1.9 13.9-8.8c.7-.4 1.3-.2.8.3L20.6 28l-.4 6.3c.6 0 .9-.3 1.2-.6l3-2.9 6.2 4.6c1.1.6 2 .3 2.3-1.1l4.1-19.3c.4-1.7-.6-2.5-2.2-1.6z"
      />
    </svg>
  );
}

function PhoneDialerIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#10B981" />
      <path
        fill="#FFFFFF"
        d="M32.8 28.5c-1.3-.2-2.7-.6-3.9-1.2-.5-.3-1.2-.1-1.5.3l-2.4 2.4c-3.6-1.9-6.5-4.8-8.4-8.4l2.4-2.4c.4-.4.6-1 .3-1.5-.6-1.2-1-2.6-1.2-3.9-.2-.9-1-1.6-2-1.6h-3.8c-1.2 0-2.2 1-2.1 2.2.8 11.2 9.8 20.2 21 21 1.2.1 2.2-.9 2.2-2.1V30.5c0-1-.7-1.8-1.7-2z"
      />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#1A73E8" />
      <path
        fill="#FFFFFF"
        d="M34 14H14c-2.2 0-4 1.8-4 4v14c0 2.2 1.8 4 4 4h16l6 6V18c0-2.2-1.8-4-4-4zm-4 12H18v-2h12v2zm4-4H18v-2h16v2zm0-4H18v-2h16v2z"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#374151" />
      <path
        fill="#FFFFFF"
        d="M20 12l-2 3H13c-1.7 0-3 1.3-3 3v16c0 1.7 1.3 3 3 3h22c1.7 0 3-1.3 3-3V18c0-1.7-1.3-3-3-3h-5l-2-3H20zm4 21c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"
      />
      <circle cx="24" cy="25" r="4.5" fill="#38BDF8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#4B5563" />
      <path
        fill="#FFFFFF"
        d="M35.6 22.3l-2.6-.4c-.2-.7-.5-1.4-.9-2l1.6-2.1c.4-.6.3-1.4-.2-1.9l-2.8-2.8c-.5-.5-1.3-.6-1.9-.2l-2.1 1.6c-.6-.4-1.3-.7-2-.9l-.4-2.6c-.1-.7-.7-1.2-1.4-1.2h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.6c-.7.2-1.4.5-2 .9l-2.1-1.6c-.6-.4-1.4-.3-1.9.2l-2.8 2.8c-.5.5-.6 1.3-.2 1.9l1.6 2.1c-.4.6-.7 1.3-.9 2l-2.6.4c-.7.1-1.2.7-1.2 1.4v4c0 .7.5 1.3 1.2 1.4l2.6.4c.2.7.5 1.4.9 2l-1.6 2.1c-.4.6-.3 1.4.2 1.9l2.8 2.8c.5.5 1.3.6 1.9.2l2.1-1.6c.6.4 1.3.7 2 .9l.4 2.6c.1.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.6c.7-.2 1.4-.5 2-.9l2.1 1.6c.6.4 1.4.3 1.9-.2l2.8-2.8c.5-.5.6-1.3.2-1.9l-1.6-2.1c.4-.6.7-1.3.9-2l2.6-.4c.7-.1 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.2-1.4zM24 28.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"
      />
    </svg>
  );
}

function resolveAppLogo(pkg: string | null, label: string | null): React.ReactNode | null {
  const p = (pkg || '').toLowerCase();
  const l = (label || '').toLowerCase();

  if (p.includes('whatsapp') || l.includes('whatsapp')) return <WhatsAppIcon />;
  if (p.includes('instagram') || l.includes('instagram')) return <InstagramIcon />;
  if (p.includes('youtube') || l.includes('youtube')) return <YouTubeIcon />;
  if (p.includes('chrome') || l.includes('chrome')) return <ChromeIcon />;
  if (p.includes('gm') || p.includes('gmail') || l.includes('gmail')) return <GmailIcon />;
  if (p.includes('maps') || l.includes('maps')) return <GoogleMapsIcon />;
  if (p.includes('spotify') || l.includes('spotify')) return <SpotifyIcon />;
  if (p.includes('netflix') || l.includes('netflix')) return <NetflixIcon />;
  if (p.includes('katana') || p.includes('facebook') || l.includes('facebook')) return <FacebookIcon />;
  if (p.includes('twitter') || l.includes('twitter') || l === 'x') return <TwitterXIcon />;
  if (p.includes('telegram') || l.includes('telegram')) return <TelegramIcon />;
  if (p.includes('dialer') || p.includes('telecom') || p.includes('phone') || l.includes('phone') || l.includes('call')) {
    return <PhoneDialerIcon />;
  }
  if (p.includes('messaging') || p.includes('mms') || p.includes('sms') || l.includes('message') || l.includes('sms')) {
    return <MessagesIcon />;
  }
  if (p.includes('camera') || l.includes('camera')) return <CameraIcon />;
  if (p.includes('settings') || l.includes('settings')) return <SettingsIcon />;

  return null;
}

const DEFAULT_GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-cyan-500 to-blue-700',
  'from-indigo-500 to-purple-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-pink-700',
  'from-violet-500 to-fuchsia-700',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function AppIconComponent({
  packageName,
  appLabel,
  size = 44,
  className = '',
}: AppIconProps) {
  const logo = resolveAppLogo(packageName, appLabel);

  if (logo) {
    return (
      <div
        className={clsx(
          'relative rounded-2xl shrink-0 flex items-center justify-center overflow-hidden shadow-sm',
          className
        )}
        style={{ width: size, height: size }}
      >
        {logo}
      </div>
    );
  }

  const label = appLabel || packageName || '?';
  const letter = label.charAt(0).toUpperCase();
  const seed = packageName || appLabel || 'app';
  const gradient = DEFAULT_GRADIENTS[hashString(seed) % DEFAULT_GRADIENTS.length];

  return (
    <div
      className={clsx(
        'relative rounded-2xl shrink-0 flex items-center justify-center font-mono font-bold select-none shadow-sm overflow-hidden border border-white/[0.12]',
        `bg-gradient-to-br ${gradient}`,
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
      }}
    >
      <span className="relative z-10 text-white font-extrabold tracking-tight">
        {letter}
      </span>
    </div>
  );
}

export default memo(AppIconComponent);
