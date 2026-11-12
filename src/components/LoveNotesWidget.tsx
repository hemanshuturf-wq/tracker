import { useState, useEffect } from 'react';
import {
  Heart,
  Sparkles,
  Smile,
  Coffee,
  Moon,
  Check,
} from 'lucide-react';
import {
  collection,
  addDoc,
  query,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { db } from '../firebase';

interface LoveNotesWidgetProps {
  currentUid: string | null;
  partnerUid: string | null;
  partnerName: string;
}

interface NoteItem {
  id: string;
  senderUid: string;
  partnerUid: string;
  mood?: string;
  message?: string;
  createdAt?: any;
}

const MOODS = [
  { emoji: '🥰', label: 'Loving', icon: Heart },
  { emoji: '💖', label: 'Missing you', icon: Sparkles },
  { emoji: '☕', label: 'Cozy', icon: Coffee },
  { emoji: '😴', label: 'Sleepy', icon: Moon },
  { emoji: '🌸', label: 'Sweet', icon: Smile },
];

export function LoveNotesWidget({
  currentUid,
  partnerUid,
  partnerName,
}: LoveNotesWidgetProps) {
  const [selectedMood, setSelectedMood] = useState<string>('🥰');
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    if (!currentUid || !partnerUid) return;

    // Listen to recent notes exchanged between the two partners
    const q = query(
      collection(db, 'love_notes'),
      limit(10),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as NoteItem[];
        // Filter in memory to avoid composite index requirement
        const filtered = items.filter(
          (n) =>
            (n.senderUid === currentUid && n.partnerUid === partnerUid) ||
            (n.senderUid === partnerUid && n.partnerUid === currentUid) ||
            (!n.partnerUid && (n.senderUid === currentUid || n.senderUid === partnerUid))
        );
        filtered.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setRecentNotes(filtered.slice(0, 3));
      },
      (err) => {
        console.warn('Love notes stream warn:', err);
      },
    );

    return () => unsubscribe();
  }, [currentUid, partnerUid]);

  async function handleSendPoke() {
    if (!currentUid || !partnerUid || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'love_notes'), {
        senderUid: currentUid,
        partnerUid: partnerUid,
        mood: selectedMood,
        message: customNote.trim() || 'Thinking of you right now! 💕',
        createdAt: serverTimestamp(),
      });
      setCustomNote('');
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to send love note:', err);
    } finally {
      setSending(false);
    }
  }

  const latestPartnerNote = recentNotes.find((n) => n.senderUid === partnerUid);

  return (
    <article className="surface-card mb-6 p-4 sm:p-5 rounded-[22px] border border-[#f5e6ec] bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#fdf2f6] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#fff0f5] text-[#c2185b] flex items-center justify-center text-lg">
            💌
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-[#1d1b18] flex items-center gap-1.5">
              Daily Mood & Love Notes
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fff0f5] text-[#c2185b] font-medium">
                Pookie Space 💕
              </span>
            </h3>
            <p className="text-xs text-[#6e6a63]">
              Leave sweet sticky notes and send a quick ping to {partnerName}
            </p>
          </div>
        </div>

        {latestPartnerNote && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#fff5f8] border border-[#fde8ef] text-xs text-[#c2185b] max-w-full min-w-0">
            <span className="text-base shrink-0">{latestPartnerNote.mood || '💖'}</span>
            <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
              &quot;{latestPartnerNote.message}&quot;
            </span>
            <span className="text-[10px] text-[#96918a] shrink-0">
              {latestPartnerNote.createdAt?.toDate
                ? formatDistanceToNow(latestPartnerNote.createdAt.toDate(), { addSuffix: true })
                : 'just now'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
        <div className="flex items-center justify-center sm:justify-start gap-1 bg-[#fff8fa] p-1 rounded-xl border border-[#fae5ed] shrink-0">
          {MOODS.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setSelectedMood(m.emoji)}
              className={`px-2.5 py-1 text-sm rounded-lg transition-all ${
                selectedMood === m.emoji
                  ? 'bg-white shadow-xs scale-105 border border-[#f7d6e2]'
                  : 'hover:bg-white/60 opacity-75'
              }`}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder={`Leave a sweet note for ${partnerName}…`}
            className="flex-1 min-w-0 text-xs px-3 py-2 rounded-xl border border-[#fae5ed] bg-[#fffafc] text-[#1d1b18] placeholder-[#96918a] focus:outline-none focus:border-[#ff4081]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendPoke();
            }}
          />

          <button
            type="button"
            onClick={handleSendPoke}
            disabled={sending}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-[#ff4081] hover:bg-[#c2185b] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {sentSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Sent! 💕</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Poke 💕</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
