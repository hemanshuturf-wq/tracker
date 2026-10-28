import { clsx } from 'clsx';

interface AppIconProps {
  packageName: string | null;
  appLabel: string | null;
  size?: number;
  className?: string;
}

const COLORS = [
  '#7FE07F',
  '#7FB0E0',
  '#E0A050',
  '#B090E0',
  '#50C0B0',
  '#E05050',
  '#E0E050',
];

const ICON_MAP: Record<string, React.ReactNode> = {
  'com.android.chrome': '🌐',
  'com.google.android.youtube': '▶️',
  'com.whatsapp': '💬',
  'com.instagram.android': '📷',
  'com.facebook.katana': '📘',
  'com.twitter.android': '🐦',
  'com.google.android.gm': '📧',
  'com.google.android.apps.maps': '🗺️',
  'com.spotify.music': '🎵',
  'com.netflix.mediaclient': '🎬',
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function AppIcon({ packageName, appLabel, size = 40, className = '' }: AppIconProps) {
  const label = appLabel || packageName || '?';
  const letter = label.charAt(0).toUpperCase();
  const seed = packageName || appLabel || '?';
  const color = COLORS[hashString(seed) % COLORS.length];
  const emoji = packageName ? ICON_MAP[packageName] : null;

  return (
    <div
      className={clsx('flex items-center justify-center rounded-xl flex-shrink-0 relative overflow-hidden', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold"
        style={{
          backgroundColor: packageName ? color : 'var(--bg-tertiary)',
          color: packageName ? '#0A0A0A' : 'var(--text-muted)',
          fontSize: size * 0.42,
        }}
      >
        {emoji ? (
          <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{emoji}</span>
        ) : (
          letter
        )}
      </div>
      {!packageName && (
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--bg-tertiary)] to-transparent" />
      )}
    </div>
  );
}