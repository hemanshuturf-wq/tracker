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
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Aperture,
  ArrowUp,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  Inbox,
  Maximize2,
  RefreshCw,
  Smartphone,
  Wifi,
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
import UsagePanel from '../components/UsagePanel';
import { useAuth } from '../context/AuthContext';
import { useUsageData } from '../hooks/useUsageData';
import { formatBytes, formatDuration } from '../lib/format';

interface Filters {
  eventTypes: EventType[];
  appLabel: string | null;
  dateRange: 'today' | '7d' | '30d' | 'all';
  search: string;
}

interface StatItem {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  iconClass: string;
}

const PAGE_SIZE = 25;
const OLDER_PAGE_SIZE = 100;

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
  return format(new Date(millis), 'MMM d, yyyy · h:mm a');
}

function downloadImage(img: RemoteImage) {
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${img.imageBase64}`;
  const dateStr = new Date(img.timestamp).toISOString().replace(/[:.]/g, '-');
  link.download = `photo-${img.lensFacing}-${dateStr}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function dedupeEvents(rows: TrackerEvent[]): TrackerEvent[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isParth = user?.uid === 'dicrDfK5OphttPlhKs5rBVUqNnC3';
  const partnerUid = user ? PARTNER_UIDS[user.uid] ?? null : null;
  const partnerName = isParth ? 'Amisha' : 'Parth';
  const partnerEmail = isParth ? 'amisha@gmail.com' : 'parth@gmail.com';

  const usage = useUsageData(partnerUid);

  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
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
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(5);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [requestingCamera, setRequestingCamera] = useState<
    'front' | 'back' | null
  >(null);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<RemoteImage | null>(null);

  const eventsRef = useRef<TrackerEvent[]>([]);
  const liveRowsRef = useRef<TrackerEvent[]>([]);
  const olderRowsRef = useRef<TrackerEvent[]>([]);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const initialLoadRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const autoLoadStartedRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const hasMoreRef = useRef(true);
  const atTopRef = useRef(true);
  const newEventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const applyEvents = useCallback((next: TrackerEvent[]) => {
    eventsRef.current = next;
    setEvents(next);
  }, []);

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      atTopRef.current = window.scrollY < 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live listener for the first page only. Older pages are fetched on demand.
  useEffect(() => {
    if (newEventTimeoutRef.current !== null) {
      clearTimeout(newEventTimeoutRef.current);
      newEventTimeoutRef.current = null;
    }

    if (!partnerUid) {
      applyEvents([]);
      setLoading(false);
      setInitialLoad(false);
      setConnectionStatus('error');
      setError('Please sign in with an authorized family account.');
      setNewEventCount(0);
      return;
    }

    let active = true;
    initialLoadRef.current = true;
    loadingMoreRef.current = false;
    autoLoadStartedRef.current = false;
    loadGenerationRef.current += 1;
    liveRowsRef.current = [];
    olderRowsRef.current = [];
    lastDocRef.current = null;
    hasMoreRef.current = true;

    applyEvents([]);
    setLoading(true);
    setInitialLoad(true);
    setLoadingMore(false);
    setAutoLoading(false);
    setHasMore(true);
    setConnectionStatus('connecting');
    setError(null);
    setNewEventCount(0);

    const eventsQuery = query(
      collection(db, 'events'),
      where('syncedByUid', '==', partnerUid),
      orderBy('observedAtUtc', 'desc'),
      limit(PAGE_SIZE),
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        if (!active) return;

        const rows = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as TrackerEvent,
        );

        const previousLiveRows = liveRowsRef.current;
        liveRowsRef.current = rows;

        // New events can push the oldest row out of the live first page. Keep
        // those rows in the older set so there is never a gap in the timeline.
        const liveIds = new Set(rows.map((row) => row.id));
        const droppedRows = previousLiveRows.filter((row) => !liveIds.has(row.id));
        if (droppedRows.length > 0) {
          olderRowsRef.current = dedupeEvents([
            ...olderRowsRef.current,
            ...droppedRows,
          ]);
        }

        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
          hasMoreRef.current = rows.length === PAGE_SIZE;
          setHasMore(hasMoreRef.current);
          applyEvents(rows);
          setLoading(false);
          setInitialLoad(false);
          setConnectionStatus('connected');
          setError(null);
          return;
        }

        const currentIds = new Set(eventsRef.current.map((event) => event.id));
        const added = rows.filter((row) => !currentIds.has(row.id));

        if (added.length > 0) {
          if (atTopRef.current) {
            applyEvents(dedupeEvents([...rows, ...olderRowsRef.current]));
          } else {
            setNewEventCount((count) => count + added.length);
          }
        }

        setLoading(false);
        setConnectionStatus('connected');
        setError(null);
      },
      (err) => {
        if (!active) return;
        console.error('Events stream error:', err);
        setConnectionStatus('error');
        setLoading(false);
        setInitialLoad(false);
        setError(err.message || 'Error streaming family activity.');
      },
    );

    return () => {
      active = false;
      unsubscribe();
      if (newEventTimeoutRef.current !== null) {
        clearTimeout(newEventTimeoutRef.current);
        newEventTimeoutRef.current = null;
      }
    };
  }, [partnerUid, refreshKey, applyEvents]);

  const appendOlderRows = useCallback(
    (rows: TrackerEvent[]) => {
      if (rows.length === 0) return;
      olderRowsRef.current = dedupeEvents([...olderRowsRef.current, ...rows]);
      // Appending below the viewport never changes the reader's scroll position.
      applyEvents(dedupeEvents([...eventsRef.current, ...rows]));
    },
    [applyEvents],
  );

  const fetchOlderPage = useCallback(async (generation: number) => {
    if (generation !== loadGenerationRef.current) return null;
    if (!partnerUid || !lastDocRef.current) return null;

    const olderQuery = query(
      collection(db, 'events'),
      where('syncedByUid', '==', partnerUid),
      orderBy('observedAtUtc', 'desc'),
      startAfter(lastDocRef.current),
      limit(OLDER_PAGE_SIZE),
    );
    const snapshot = await getDocs(olderQuery);
    // A refresh or account change happened while this page was in flight.
    if (generation !== loadGenerationRef.current) return null;
    const rows = snapshot.docs.map(
      (docSnap) =>
        ({
          id: docSnap.id,
          ...docSnap.data(),
        }) as TrackerEvent,
    );

    if (snapshot.docs.length > 0) {
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
    }

    return {
      rows,
      more: snapshot.docs.length === OLDER_PAGE_SIZE,
    };
  }, [partnerUid]);

  const loadMore = useCallback(async () => {
    if (
      !partnerUid ||
      loadingMoreRef.current ||
      !hasMoreRef.current ||
      !lastDocRef.current
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = loadGenerationRef.current;

    try {
      const page = await fetchOlderPage(generation);
      if (!page || generation !== loadGenerationRef.current) return;
      appendOlderRows(page.rows);
      hasMoreRef.current = page.more;
      setHasMore(page.more);
      setError(null);
    } catch (err) {
      console.error('Load more failed:', err);
      setError(
        err instanceof Error ? err.message : 'Could not load older activity.',
      );
    } finally {
      if (generation === loadGenerationRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [partnerUid, fetchOlderPage, appendOlderRows]);

  /**
   * Pulls every remaining page in the background. The first page stays live;
   * this fills the timeline below it so the reader never has to keep scrolling
   * just to discover older events.
   */
  const loadAllRemaining = useCallback(async () => {
    if (
      !partnerUid ||
      loadingMoreRef.current ||
      !hasMoreRef.current ||
      !lastDocRef.current
    ) {
      return;
    }

    autoLoadStartedRef.current = true;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setAutoLoading(true);
    const generation = loadGenerationRef.current;

    try {
      while (hasMoreRef.current && generation === loadGenerationRef.current) {
        const page = await fetchOlderPage(generation);
        if (!page || generation !== loadGenerationRef.current) break;
        appendOlderRows(page.rows);
        hasMoreRef.current = page.more;
        setHasMore(page.more);
        if (!page.more) break;
        // Let React paint the newly appended rows before the next request.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (generation === loadGenerationRef.current) {
        setError(null);
      }
    } catch (err) {
      console.error('Load all activity failed:', err);
      setError(
        err instanceof Error ? err.message : 'Could not load all activity.',
      );
    } finally {
      if (generation === loadGenerationRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setAutoLoading(false);
      }
    }
  }, [partnerUid, fetchOlderPage, appendOlderRows]);

  useEffect(() => {
    if (initialLoad || !hasMore || loadingMore) return;
    if (autoLoadStartedRef.current) return;
    void loadAllRemaining();
  }, [initialLoad, hasMore, loadingMore, loadAllRemaining]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || loadingMore || initialLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '500px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, initialLoad, loadMore]);

  // Captured photos
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
            }) as RemoteImage,
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
          `Request sent. ${partnerName}'s phone will take the ${lensFacing === 'front' ? 'selfie' : 'rear'} photo and upload it here.`,
        );
      } catch (err: any) {
        setCameraError(err.message || 'Failed to dispatch capture command.');
      } finally {
        setRequestingCamera(null);
      }
    },
    [partnerUid, user?.uid, partnerName],
  );

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

    return events.filter((event) => {
      if (eventTypes.length > 0 && !eventTypes.includes(event.eventType)) {
        return false;
      }
      if (appLabel && event.appLabel !== appLabel) {
        return false;
      }
      if (cutoff > 0) {
        const timestamp = toMillis(event.observedAtUtc);
        if (timestamp === null || timestamp < cutoff) return false;
      }
      if (searchTrimmed) {
        const haystack =
          `${event.title || ''} ${event.body || ''} ${event.appLabel || ''} ${event.packageName || ''}`.toLowerCase();
        if (!haystack.includes(searchTrimmed)) return false;
      }
      return true;
    });
  }, [events, filters]);

  const stats: StatItem[] = useMemo(() => {
    const todayData =
      (usage.today?.totalRxBytes ?? 0) + (usage.today?.totalTxBytes ?? 0);
    const appCount = usage.today?.apps.length ?? 0;

    return [
      {
        label: 'Screen time today',
        value: usage.loading && !usage.today
          ? '—'
          : formatDuration(usage.today?.totalSeconds ?? 0),
        detail: `${appCount} app${appCount === 1 ? '' : 's'} tracked`,
        icon: <Clock3 className="h-4 w-4" />,
        iconClass: 'bg-[#e9f1ed] text-[#1f5c4a]',
      },
      {
        label: 'Data today',
        value: usage.loading && !usage.today
          ? '—'
          : formatBytes(todayData),
        detail: 'Wi-Fi + mobile',
        icon: <Wifi className="h-4 w-4" />,
        iconClass: 'bg-[#eef4fb] text-[#2f5d8a]',
      },
      {
        label: 'Apps active',
        value: String(appCount),
        detail: 'Used since midnight',
        icon: <Smartphone className="h-4 w-4" />,
        iconClass: 'bg-[#f4f3ff] text-[#5925dc]',
      },
      {
        label: 'Events loaded',
        value: String(events.length),
        detail: autoLoading
          ? 'Loading all activity…'
          : hasMore
            ? 'Older activity available'
            : 'All activity loaded',
        icon: <Activity className="h-4 w-4" />,
        iconClass: 'bg-[#fffaeb] text-[#b54708]',
      },
    ];
  }, [usage.loading, usage.today, events.length, hasMore, autoLoading]);

  const displayedImages = useMemo(
    () => remoteImages.slice(0, visiblePhotoCount),
    [remoteImages, visiblePhotoCount],
  );
  const hasMorePhotos = remoteImages.length > visiblePhotoCount;

  const scrollGallery = (direction: 'left' | 'right') => {
    if (galleryRef.current) {
      galleryRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
    }
  };

  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/event/${id}`);
    },
    [navigate],
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    usage.refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [usage]);

  const showNewEvents = () => {
    applyEvents(dedupeEvents([...liveRowsRef.current, ...olderRowsRef.current]));
    setNewEventCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#1d1b18]">
      <Header partnerName={partnerName} connectionStatus={connectionStatus} />

      {newEventCount > 0 && (
        <div className="fixed left-1/2 top-[82px] z-40 -translate-x-1/2 px-4">
          <button
            onClick={showNewEvents}
            className="flex animate-slide-down-fade items-center gap-2 rounded-full bg-[#1d1b18] px-4 py-2 text-xs font-medium text-white shadow-lg shadow-[#1d1b18]/15 transition-transform hover:-translate-y-0.5"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>
              {newEventCount} new event{newEventCount > 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-[92px] sm:px-6 lg:px-8">
        <section id="overview">
          <div className="flex flex-col gap-4 border-b border-[#e7e3db] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#96918a]">
                Family overview
              </p>
              <h1 className="font-display mt-1 text-3xl tracking-tight sm:text-4xl">
                {partnerName}&apos;s activity
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#6e6a63]">
                A quiet, private record of apps, screen time, and shared moments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e3db] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6e6a63]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1f5c4a]" />
                {partnerEmail}
              </span>
              <button
                onClick={handleRefresh}
                className="btn-secondary px-3 py-2 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-3.5 py-2.5 text-xs text-[#b42318]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96918a]">
                    {stat.label}
                  </p>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.iconClass}`}
                  >
                    {stat.icon}
                  </span>
                </div>
                <p className="font-display mt-2 text-2xl leading-none tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[10.5px] text-[#96918a]">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div id="usage" className="mt-8 scroll-mt-24">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl tracking-tight">Usage</h2>
              <p className="text-xs text-[#6e6a63]">
                Screen time and network data, rolled up on the phone.
              </p>
            </div>
          </div>
          <UsagePanel
            today={usage.today}
            history={usage.history}
            loading={usage.loading}
            error={usage.error}
            onRefresh={usage.refresh}
          />
        </div>

        <section id="camera" className="mt-8 scroll-mt-24">
          <div className="mb-3">
            <h2 className="font-display text-2xl tracking-tight">Remote camera</h2>
            <p className="text-xs text-[#6e6a63]">
              Request a fresh photo from {partnerName}&apos;s phone.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.5fr]">
            <div className="surface-card flex flex-col p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9f1ed] text-[#1f5c4a]">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Take a photo</h3>
                  <p className="text-[11px] text-[#96918a]">
                    Front or rear camera
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void triggerRemoteCamera('front')}
                  disabled={requestingCamera !== null || !partnerUid}
                  className="btn-primary w-full py-2.5 text-xs"
                >
                  <Aperture className="h-4 w-4" />
                  <span>Front selfie</span>
                  {requestingCamera === 'front' && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void triggerRemoteCamera('back')}
                  disabled={requestingCamera !== null || !partnerUid}
                  className="btn-secondary w-full py-2.5 text-xs"
                >
                  <Camera className="h-4 w-4" />
                  <span>Rear camera</span>
                  {requestingCamera === 'back' && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                </button>
              </div>

              <p className="mt-4 text-[10.5px] leading-relaxed text-[#96918a]">
                Works while the phone is locked. For reliable background capture,
                keep battery optimization disabled for the tracker app.
              </p>

              {cameraMessage && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#abefc6] bg-[#ecfdf3] p-2.5 text-[11px] leading-relaxed text-[#067647]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{cameraMessage}</span>
                </div>
              )}
              {cameraError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#fecdca] bg-[#fef3f2] p-2.5 text-[11px] leading-relaxed text-[#b42318]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            <div className="surface-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Aperture className="h-4 w-4 text-[#6e6a63]" />
                  <h3 className="text-sm font-semibold">Recent photos</h3>
                  <span className="font-mono text-[10px] text-[#96918a]">
                    {displayedImages.length} of {remoteImages.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {remoteLoading && (
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin text-[#96918a]" />
                  )}
                  {remoteImages.length > 0 && (
                    <>
                      <button
                        onClick={() => scrollGallery('left')}
                        className="rounded-lg border border-[#e7e3db] bg-white p-1 text-[#6e6a63] hover:bg-[#f3f1ec]"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => scrollGallery('right')}
                        className="rounded-lg border border-[#e7e3db] bg-white p-1 text-[#6e6a63] hover:bg-[#f3f1ec]"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {remoteError ? (
                <p className="rounded-xl border border-[#fecdca] bg-[#fef3f2] p-2.5 text-xs text-[#b42318]">
                  {remoteError}
                </p>
              ) : remoteImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e7e3db] bg-[#faf9f7] py-10 text-center">
                  <Camera className="mb-2 h-6 w-6 text-[#c9c3b6]" />
                  <p className="text-xs font-medium text-[#6e6a63]">
                    No photos yet
                  </p>
                  <p className="mt-1 text-[10.5px] text-[#96918a]">
                    Request a selfie to see it here.
                  </p>
                </div>
              ) : (
                <div
                  ref={galleryRef}
                  className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {displayedImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-[#e7e3db] bg-[#faf9f7] sm:w-44"
                    >
                      <div className="relative aspect-square overflow-hidden bg-[#efede7]">
                        <img
                          src={`data:image/jpeg;base64,${img.imageBase64}`}
                          alt="Remote capture"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-[#1d1b18]/75 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-white">
                          {img.lensFacing === 'front' ? 'Selfie' : 'Rear'}
                        </span>

                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#1d1b18]/50 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setActivePhoto(img)}
                            className="rounded-lg bg-white/90 p-2 text-[#1d1b18] hover:bg-white"
                            title="View fullscreen"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1.5 text-[10px] font-semibold text-[#1d1b18] hover:bg-white"
                            title="Download image"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(img);
                          }}
                          className="absolute bottom-1.5 right-1.5 rounded-lg bg-white/90 p-1.5 text-[#1d1b18] shadow-sm sm:hidden"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="truncate px-2 py-1.5 font-mono text-[9.5px] text-[#96918a]">
                        {formatDistanceToNow(new Date(img.timestamp), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  ))}

                  {hasMorePhotos && (
                    <button
                      onClick={() =>
                        setVisiblePhotoCount((prev) =>
                          Math.min(prev + 5, remoteImages.length),
                        )
                      }
                      className="flex w-36 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#d8d3c8] bg-[#faf9f7] p-3 text-center transition-colors hover:border-[#1f5c4a] hover:bg-white sm:w-40"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#bcd6cb] bg-[#e9f1ed] text-[#1f5c4a]">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-semibold text-[#3f3b35]">
                        Load 5 more
                      </span>
                      <span className="font-mono text-[9px] text-[#96918a]">
                        {remoteImages.length - visiblePhotoCount} left
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="activity" className="mt-8 scroll-mt-24">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl tracking-tight">Activity</h2>
              <p className="text-xs text-[#6e6a63]">
                {autoLoading
                  ? `Newest first · loading all activity (${events.length} loaded)`
                  : hasMore
                    ? 'Newest first · older activity available'
                    : `Newest first · all ${events.length} events loaded`}
              </p>
            </div>
            <span className="rounded-full border border-[#e7e3db] bg-white px-2.5 py-1 font-mono text-[10px] text-[#6e6a63]">
              {filteredEvents.length} shown
            </span>
          </div>

          <EventFilters
            filters={filters}
            onChange={handleFilterChange}
            events={events}
          />

          {loading && initialLoad ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-[74px] rounded-2xl" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
              <Inbox className="mb-2 h-7 w-7 text-[#c9c3b6]" />
              <p className="text-sm font-medium text-[#3f3b35]">
                No matching activity
              </p>
              <p className="mt-1 max-w-sm text-xs text-[#96918a]">
                Try a different search or clear the filters. New activity appears
                here after the phone syncs.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleCardClick(event.id)}
                />
              ))}
            </div>
          )}

          <div ref={loadMoreRef} className="mt-6 flex justify-center py-3">
            {autoLoading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e3db] bg-white px-3 py-1.5 text-[11px] text-[#6e6a63]">
                <RefreshCw className="h-3 w-3 animate-spin text-[#1f5c4a]" />
                Loading all activity… {events.length} loaded
              </span>
            ) : loadingMore ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e3db] bg-white px-3 py-1.5 text-[11px] text-[#6e6a63]">
                <RefreshCw className="h-3 w-3 animate-spin text-[#1f5c4a]" />
                Loading older activity…
              </span>
            ) : hasMore ? (
              <button
                onClick={() => void loadAllRemaining()}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Load all remaining activity
              </button>
            ) : (
              <span className="text-[11px] text-[#96918a]">
                All {events.length} events loaded.
              </span>
            )}
          </div>
        </section>
      </main>

      {activePhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1d1b18]/70 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#e7e3db] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0eee8] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-[#bcd6cb] bg-[#e9f1ed] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#1f5c4a]">
                  {activePhoto.lensFacing === 'front' ? 'Selfie' : 'Rear'}
                </span>
                <span className="font-mono text-[10.5px] text-[#96918a]">
                  {formatTimestamp(activePhoto.timestamp)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(activePhoto)}
                  className="btn-primary px-2.5 py-1.5 text-[11px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="rounded-lg p-1 text-[#96918a] hover:bg-[#f3f1ec] hover:text-[#1d1b18]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#faf9f7] p-2 sm:p-4">
              <img
                src={`data:image/jpeg;base64,${activePhoto.imageBase64}`}
                alt="Captured photo"
                className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain"
                decoding="async"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#f0eee8] px-4 py-2 font-mono text-[10px] text-[#96918a]">
              <span className="truncate">UID: {activePhoto.deviceId}</span>
              <span>
                {formatDistanceToNow(new Date(activePhoto.timestamp), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
