import React, { memo, useState } from 'react';
import { clsx } from 'clsx';

interface AppIconProps {
  packageName: string | null;
  appLabel: string | null;
  size?: number;
  className?: string;
}

// ---- Real SVGs for Android & Global Applications ---------------------------

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
        <radialGradient id="ig-grad-full" cx="20%" cy="100%" r="130%">
          <stop offset="0%" stopColor="#ffb140" />
          <stop offset="25%" stopColor="#ff5445" />
          <stop offset="60%" stopColor="#d82d7e" />
          <stop offset="90%" stopColor="#9b36b7" />
          <stop offset="100%" stopColor="#4c64d8" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#ig-grad-full)" />
      <rect x="12" y="12" width="24" height="24" rx="7" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <circle cx="24" cy="24" r="5.5" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <circle cx="31" cy="17" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFFFF" />
      <path fill="#4285F4" d="M10 8.5c-.3.4-.5 1-.5 1.7v27.6c0 .7.2 1.3.5 1.7l15.5-15.5L10 8.5z" />
      <path fill="#FBBC05" d="M30.6 29.1l-5.1-5.1L10 39.5c.5.2 1.1.2 1.8-.2l18.8-10.2z" />
      <path fill="#EA4335" d="M11.8 8.7L25.5 24l5.1-5.1L11.8 8.7c-.7-.4-1.3-.4-1.8-.2z" />
      <path fill="#34A853" d="M38.8 22.3l-8.2-4.4-5.1 5.1 5.1 5.1 8.2-4.4c1.2-.7 1.2-1.7 0-2.4z" />
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

function GooglePhotosIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFFFF" />
      <path fill="#EA4335" d="M24 14a10 10 0 0 1 10 10h-10V14z" />
      <path fill="#4285F4" d="M34 24a10 10 0 0 1-10 10V24h10z" />
      <path fill="#34A853" d="M24 34a10 10 0 0 1-10-10h10v10z" />
      <path fill="#FBBC05" d="M14 24a10 10 0 0 1 10-10v10H14z" />
    </svg>
  );
}

function GoogleDriveIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFFFF" />
      <path fill="#FFC107" d="M17 11l-8.5 15 5.5 9.5 8.5-15z" />
      <path fill="#4CAF50" d="M31 11H17l8.5 15h14z" />
      <path fill="#2196F3" d="M22.5 35.5h17l-5.5-9.5H17z" />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFC00" />
      <path
        fill="#000000"
        d="M24 11c-4.8 0-8.5 3.5-8.5 8.3 0 1.2.2 2.7.5 3.7-.6.2-1.7.6-2.1 1.4-.4.8 0 1.6.4 1.9.9.7 2.3.4 3.1.2.5 1.5 1.7 3.3 3.6 4.2-1.3.4-3.1 1.2-3.3 2.5-.2 1.1.7 1.8 1.8 1.8 2.1 0 4.1-1.3 4.5-1.5.4.2 2.4 1.5 4.5 1.5 1.1 0 2-.7 1.8-1.8-.2-1.3-2-2.1-3.3-2.5 1.9-.9 3.1-2.7 3.6-4.2.8.2 2.2.5 3.1-.2.4-.3.8-1.1.4-1.9-.4-.8-1.5-1.2-2.1-1.4.3-1 .5-2.5.5-3.7 0-4.8-3.7-8.3-8.5-8.3z"
      />
      <path
        fill="#FFFFFF"
        d="M24 13c-3.8 0-6.8 2.8-6.8 6.6 0 1 .2 2.2.4 3-.5.2-1.4.5-1.7 1.1-.3.6 0 1.3.3 1.5.7.6 1.8.3 2.5.2.4 1.2 1.4 2.6 2.9 3.4-1 .3-2.5 1-2.6 2-.2.9.6 1.4 1.4 1.4 1.7 0 3.3-1 3.6-1.2.3.2 1.9 1.2 3.6 1.2.9 0 1.6-.6 1.4-1.4-.2-1-1.6-1.7-2.6-2 1.5-.7 2.5-2.2 2.9-3.4.7.1 1.8.4 2.5-.2.3-.3.6-.9.3-1.5-.3-.6-1.2-.9-1.7-1.1.2-.8.4-2 .4-3 0-3.8-3-6.6-6.8-6.6z"
      />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#1DB954" />
      <path
        fill="#FFFFFF"
        d="M33.6 30.1c-.4.6-1.2.8-1.8.4-5-3.1-11.3-3.8-18.7-2.1-.7.2-1.4-.3-1.5-1-.2-.7.3-1.4 1-1.5 8.1-1.9 15.1-1.1 20.6 2.3.7.4.8 1.3.4 1.9zm2.4-5.4c-.5.8-1.5 1-2.3.5-5.8-3.6-14.6-4.6-21.4-2.5-.9.3-1.8-.2-2.1-1-.3-.9.2-1.8 1-2.1 7.8-2.4 17.5-1.2 24.2 2.9.8.4 1.1 1.5.6 2.2zm.2-5.6c-6.9-4.1-18.3-4.5-24.9-2.5-1.1.3-2.2-.3-2.5-1.4-.3-1.1.3-2.2 1.4-2.5 7.6-2.3 20.2-1.9 28.2 2.9 1 .6 1.3 1.9.7 2.9-.6.9-1.9 1.2-2.9.6z"
      />
    </svg>
  );
}

function NetflixIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#000000" />
      <path fill="#E50914" d="M15 10h5v28h-5z" />
      <path fill="#E50914" d="M28 10h5v28h-5z" />
      <path fill="#B81D24" d="M15 10l18 28h-5L15 12z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M26.7 38V24.3h4.6l.7-5.3h-5.3v-3.4c0-1.5.4-2.6 2.6-2.6h2.8V8.2c-.5-.1-2.1-.2-4-.2-4 0-6.7 2.4-6.7 6.9v3.9h-4.6v5.3h4.6V38h5.3z"
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
        d="M28.4 13h3.5l-7.6 8.7L33.2 35h-7l-5.5-7.2L14.4 35h-3.5l8.1-9.3L10.7 13h7.2l5 6.6 5.5-6.6zm-1.2 19.9h1.9L16.8 15h-2.1l12.5 17.9z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#24A1DE" />
      <path
        fill="#FFFFFF"
        d="M34.4 13.9L11.2 22.8c-1.6.6-1.6 1.6-.3 2l5.9 1.8 13.8-8.7c.6-.4 1.3-.2.8.3l-11.2 10.1-.4 6.2c.6 0 .9-.3 1.2-.6l2.9-2.8 6 4.4c1.1.6 1.9.3 2.2-1l4-18.8c.4-1.5-.5-2.2-1.7-1.7z"
      />
    </svg>
  );
}

function PhonePeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#5F259F" />
      <path
        fill="#FFFFFF"
        d="M27.5 13H18c-.6 0-1 .4-1 1v20c0 .6.4 1 1 1s1-.4 1-1v-8h7.5c4.7 0 8.5-3.8 8.5-8.5s-3.8-8.5-8.5-8.5zm0 13H20V17h7.5c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5z"
      />
    </svg>
  );
}

function GPayIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#FFFFFF" />
      <path fill="#4285F4" d="M34 24.3c0-.7-.1-1.3-.2-1.9H24v3.8h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.9 3.1-4.6 3.1-7.6z" />
      <path fill="#34A853" d="M24 34.5c2.8 0 5.2-.9 7-2.6l-3.4-2.6c-1 .6-2.2 1-3.6 1-2.8 0-5.1-1.9-6-4.4h-3.5v2.7c1.7 3.5 5.3 5.9 9.5 5.9z" />
      <path fill="#FBBC05" d="M18 25.9c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2v-2.7h-3.5C13.6 20.6 13 22.2 13 24s.6 3.4 1.5 5.1l3.5-2.7z" />
      <path fill="#EA4335" d="M24 17.2c1.5 0 2.9.5 4 1.5l3-3c-1.8-1.7-4.2-2.7-7-2.7-4.2 0-7.8 2.4-9.5 5.9l3.5 2.7c.9-2.5 3.2-4.4 6-4.4z" />
    </svg>
  );
}

function AmazonIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#131921" />
      <path
        fill="#FF9900"
        d="M13 31.5c6.5 4.5 15.5 4.5 22 0 .5-.3 1.1.2.7.7-6.9 6.1-16.5 6.1-23.4 0-.4-.5.2-1 .7-.7z"
      />
      <path fill="#FF9900" d="M34.5 31.2c.4 1.2 1.8 1.8 2.5 1 .3-.4-.2-1.4-.6-1.8-.4-.4-1.5-.4-1.9.8z" />
      <path fill="#FFFFFF" d="M24 14c-4.2 0-6.5 2.5-6.5 5.8 0 3.7 2.8 5.7 6.5 5.7 1.8 0 3.5-.5 4.5-1.4v1.1h3.5V14.5h-3.5v1.2c-1.1-.9-2.7-1.7-4.5-1.7zm1.2 8.7c-2 0-3.3-1.4-3.3-3.2s1.3-3.2 3.3-3.2 3.3 1.4 3.3 3.2-1.3 3.2-3.3 3.2z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#FF4500" />
      <circle cx="24" cy="25" r="9" fill="#FFFFFF" />
      <circle cx="20" cy="24" r="1.8" fill="#FF4500" />
      <circle cx="28" cy="24" r="1.8" fill="#FF4500" />
      <path fill="none" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" d="M21 28c1 1 5 1 6 0" />
      <circle cx="13" cy="24" r="3" fill="#FFFFFF" />
      <circle cx="35" cy="24" r="3" fill="#FFFFFF" />
      <circle cx="31" cy="13" r="2" fill="#FFFFFF" />
      <path fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" d="M24 16l3-2 4 1" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#5865F2" />
      <path
        fill="#FFFFFF"
        d="M32.5 15.5C30.5 14.5 28.3 14 26 14l-.4.5c2.6.8 3.8 1.9 3.8 1.9-1.6-.9-3.2-1.4-4.8-1.6-1.3-.2-2.6-.2-3.8 0-1.6.2-3.2.7-4.8 1.6 0 0 1.2-1.1 3.8-1.9l-.4-.5c-2.3 0-4.5.5-6.5 1.5C9.5 20.5 9 29.5 9 29.5c2.3 1.7 4.5 1.7 4.5 1.7l.7-.9c-1.3-.4-2.5-1.1-2.5-1.1s.1.1.3.2c2.4 1.3 5 1.9 7.6 1.9s5.2-.6 7.6-1.9c.2-.1.3-.2.3-.2s-1.2.7-2.5 1.1l.7.9s2.2 0 4.5-1.7c0 0-.5-9-4-14zm-12.8 11.2c-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1 2 .9 2 2.1-.9 2.1-2 2.1zm8.6 0c-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1 2 .9 2 2.1-.9 2.1-2 2.1z"
      />
    </svg>
  );
}

function PhoneDialerIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#10B981" />
      <path
        fill="#FFFFFF"
        d="M33.2 27.6l-4.1-1.7c-.8-.3-1.7-.1-2.3.5l-1.8 2.2c-3.1-1.6-5.6-4.1-7.2-7.2l2.2-1.8c.6-.6.8-1.5.5-2.3l-1.7-4.1c-.4-.9-1.3-1.5-2.3-1.5H12c-1.3 0-2.4 1.1-2.3 2.4.9 10.9 9.7 19.7 20.6 20.6 1.3.1 2.4-1 2.4-2.3v-1.8c0-1-.6-1.9-1.5-2.3z"
      />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#3B82F6" />
      <path
        fill="#FFFFFF"
        d="M24 11C16.8 11 11 16.2 11 22.5c0 3.6 1.9 6.8 4.9 8.9L14 37l6.2-2.3c1.2.4 2.5.6 3.8.6 7.2 0 13-5.2 13-11.5S31.2 11 24 11z"
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

function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#0284C7" />
      <circle cx="24" cy="24" r="18" fill="#FFFFFF" />
      <path stroke="#0284C7" strokeWidth="3" strokeLinecap="round" d="M24 13v11l7 4" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#EC4899" />
      <rect x="11" y="12" width="26" height="24" rx="4" fill="#FFFFFF" />
      <circle cx="18" cy="18" r="3" fill="#F43F5E" />
      <path fill="#FB7185" d="M12 32l7-8 5 6 6-8 7 10z" />
    </svg>
  );
}

function FilesIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#F59E0B" />
      <path fill="#FFFFFF" d="M12 14c0-1.1.9-2 2-2h8l4 4h8c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H14c-1.1 0-2-.9-2-2V14z" />
    </svg>
  );
}

function resolveAppLogo(pkg: string | null, label: string | null): React.ReactNode | null {
  const p = (pkg || '').toLowerCase();
  const l = (label || '').toLowerCase();

  if (p.includes('whatsapp') || l.includes('whatsapp')) return <WhatsAppIcon />;
  if (p.includes('instagram') || l.includes('instagram')) return <InstagramIcon />;
  if (p.includes('vending') || p.includes('playstore') || l.includes('play store') || l.includes('google play') || l.includes('market')) {
    return <PlayStoreIcon />;
  }
  if (p.includes('youtube') || l.includes('youtube')) return <YouTubeIcon />;
  if (p.includes('chrome') || l.includes('chrome')) return <ChromeIcon />;
  if (p.includes('gm') || p.includes('gmail') || l.includes('gmail')) return <GmailIcon />;
  if (p.includes('maps') || l.includes('maps')) return <GoogleMapsIcon />;
  if (p.includes('photos') || l.includes('photos') || p.includes('google.android.apps.photos')) return <GooglePhotosIcon />;
  if (p.includes('drive') || l.includes('drive') || p.includes('google.android.apps.docs')) return <GoogleDriveIcon />;
  if (p.includes('snapchat') || l.includes('snapchat')) return <SnapchatIcon />;
  if (p.includes('spotify') || l.includes('spotify')) return <SpotifyIcon />;
  if (p.includes('netflix') || l.includes('netflix')) return <NetflixIcon />;
  if (p.includes('phonepe') || l.includes('phonepe')) return <PhonePeIcon />;
  if (p.includes('tez') || p.includes('gpay') || l.includes('gpay') || l.includes('google pay')) return <GPayIcon />;
  if (p.includes('amazon') || l.includes('amazon')) return <AmazonIcon />;
  if (p.includes('reddit') || l.includes('reddit')) return <RedditIcon />;
  if (p.includes('discord') || l.includes('discord')) return <DiscordIcon />;
  if (p.includes('katana') || p.includes('facebook') || l.includes('facebook')) return <FacebookIcon />;
  if (p.includes('twitter') || l.includes('twitter') || l === 'x') return <TwitterXIcon />;
  if (p.includes('telegram') || l.includes('telegram')) return <TelegramIcon />;
  if (p.includes('clock') || p.includes('alarm') || l.includes('clock') || l.includes('alarm')) return <ClockIcon />;
  if (p.includes('gallery') || p.includes('sec.android.gallery3d') || l.includes('gallery')) return <GalleryIcon />;
  if (p.includes('file') || p.includes('download') || l.includes('files') || l.includes('file manager')) return <FilesIcon />;
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
  'from-rose-400 to-pink-600',
  'from-pink-400 to-fuchsia-600',
  'from-purple-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-cyan-400 to-blue-600',
  'from-amber-400 to-orange-600'
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
  const [loadFailed, setLoadFailed] = useState(false);
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

  // If a package name exists and hasn't failed, try loading the official icon from Play Store favicon/CDN
  const isWebOrCustom = !loadFailed && packageName && packageName.includes('.');
  if (isWebOrCustom) {
    return (
      <div
        className={clsx(
          'relative rounded-2xl shrink-0 flex items-center justify-center overflow-hidden shadow-sm bg-white p-1 border border-pink-200/50',
          className
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={`https://play-lh.googleusercontent.com/${packageName}`}
          alt={appLabel || packageName}
          onError={() => setLoadFailed(true)}
          className="w-full h-full object-contain rounded-xl"
          loading="lazy"
        />
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
        'relative rounded-2xl shrink-0 flex items-center justify-center font-bold select-none shadow-sm overflow-hidden border border-white/20',
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
