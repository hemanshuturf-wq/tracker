import { useState } from 'react';

interface AmiChanCatMascotProps {
  size?: number;
  mood?: 'happy' | 'sleepy' | 'playful';
}

export function AmiChanCatMascot({ size = 40, mood = 'happy' }: AmiChanCatMascotProps) {
  const [wiggling, setWiggling] = useState(false);

  const handleClick = () => {
    setWiggling(true);
    setTimeout(() => setWiggling(false), 800);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title="AmiChan ~ tap to pet! 🌸"
      className={`cursor-pointer transition-transform select-none ${
        wiggling ? 'animate-bounce' : 'hover:scale-110 active:scale-95'
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        {/* Soft pink outer halo */}
        <circle cx="50" cy="50" r="48" fill="#FFF0F5" />
        
        {/* Cat Ears */}
        <polygon points="26,40 18,16 42,28" fill="#FF80AB" />
        <polygon points="28,38 22,22 38,30" fill="#FF4081" />
        
        <polygon points="74,40 82,16 58,28" fill="#FF80AB" />
        <polygon points="72,38 78,22 62,30" fill="#FF4081" />

        {/* Head */}
        <ellipse cx="50" cy="54" rx="34" ry="30" fill="#C2185B" />

        {/* Inner glow face */}
        <ellipse cx="50" cy="54" rx="32" ry="28" fill="#E91E63" />

        {/* Blush cheeks */}
        <circle cx="28" cy="62" r="6" fill="#FF80AB" opacity="0.85" />
        <circle cx="72" cy="62" r="6" fill="#FF80AB" opacity="0.85" />

        {/* Twinkling Cat Eyes */}
        {mood === 'sleepy' ? (
          <>
            <path d="M30 52 Q36 57 42 52" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
            <path d="M58 52 Q64 57 70 52" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="36" cy="50" rx="4.5" ry="5.5" fill="#FFFFFF" />
            <circle cx="37.5" cy="48.5" r="2" fill="#1D1B18" />
            <circle cx="34.5" cy="52" r="1.2" fill="#FFFFFF" />

            <ellipse cx="64" cy="50" rx="4.5" ry="5.5" fill="#FFFFFF" />
            <circle cx="65.5" cy="48.5" r="2" fill="#1D1B18" />
            <circle cx="62.5" cy="52" r="1.2" fill="#FFFFFF" />
          </>
        )}

        {/* Sweet Nose & Whiskers */}
        <polygon points="50,57 47,54 53,54" fill="#FFD7E2" />
        <path d="M50 57 L50 61" stroke="#FFD7E2" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M46 61 Q50 63 50 61 Q50 63 54 61" stroke="#FFD7E2" strokeWidth="1.5" strokeLinecap="round" fill="none" />

        {/* Whiskers */}
        <line x1="16" y1="54" x2="26" y2="56" stroke="#FFB2CC" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="62" x2="25" y2="61" stroke="#FFB2CC" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="84" y1="54" x2="74" y2="56" stroke="#FFB2CC" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="85" y1="62" x2="75" y2="61" stroke="#FFB2CC" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

