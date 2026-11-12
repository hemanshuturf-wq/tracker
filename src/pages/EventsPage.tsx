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
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { db } from '../firebase';
import type { EventType, TrackerEvent, RemoteImage } from '../types';
import Header from '../components/Header';
import { EventFilters } from '../components/EventFilters';
import EventCard from '../components/EventCard';
import UsagePanel from '../components/UsagePanel';
import { useAuth } from '../context/AuthContext';
import { useUsageData, getStartOfDayMs } from '../hooks/useUsageData';
import { formatBytes, formatDuration } from '../lib/format';
import { UploadApkModal } from '../components/UploadApkModal';

interface Filters {
  eventTypes: EventType[];
  appLabel: string | null;
  dateRange: 'today' | 'yesterday' | '7d' | '30d' | 'all';
  search: string;
}

interface StatItem {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  iconClass: string;
}

const PAGE_SIZE = 40;
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
  const usage = useUsageData(partnerUid, events);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadApkOpen, setUploadApkOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'error'
  >('connecting');

  // STRICT 24-HOUR FILTER: Default is 'today'
  const [filters, setFilters] = useState<Filters>({
    eventTypes: [],
    appLabel: null,
    dateRange: 'today',
    search: '',
  });

  const [remoteImages, setRemoteImages] = useState<RemoteImage[]>([]);
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(6);
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

  // Live listener for events
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
    const startOfToday = getStartOfDayMs(new Date());

    try {
      while (hasMoreRef.current && generation === loadGenerationRef.current) {
        const page = await fetchOlderPage(generation);
        if (!page || generation !== loadGenerationRef.current) break;
        appendOlderRows(page.rows);
        hasMoreRef.current = page.more;
        setHasMore(page.more);
        if (!page.more) break;

        // If user is on 'today' filter and oldest fetched event is older than midnight, we can stop!
        if (filters.dateRange === 'today') {
          const oldestTime = page.rows.length > 0
            ? toMillis(page.rows[page.rows.length - 1].observedAtUtc) ?? 0
            : 0;
          if (oldestTime > 0 && oldestTime < startOfToday) {
            break;
          }
        }
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
  }, [partnerUid, fetchOlderPage, appendOlderRows, filters.dateRange]);

  // Stream remote camera photos
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

  // STRICT 24-HOUR DATE CUTOFF & FILTERING
  const startOfToday = useMemo(() => getStartOfDayMs(new Date()), []);
  const startOfYesterday = useMemo(() => startOfToday - 86400000, [startOfToday]);

  const filteredEvents = useMemo(() => {
    const { eventTypes, appLabel, dateRange, search } = filters;
    const searchTrimmed = search.trim().toLowerCase();
    const now = Date.now();

    return events.filter((event) => {
      if (eventTypes.length > 0 && !eventTypes.includes(event.eventType)) {
        return false;
      }
      if (appLabel && event.appLabel !== appLabel) {
        return false;
      }

      const timestamp = toMillis(event.observedAtUtc);

      // STRICT 24-HOUR TIME RULES:
      if (dateRange === 'today') {
        // STRICT RULE: Never display anything before 12:00 AM today!
        if (timestamp === null || timestamp < startOfToday) return false;
      } else if (dateRange === 'yesterday') {
        // STRICT RULE: Yesterday is from yesterday 00:00:00 to 23:59:59
        if (timestamp === null || timestamp < startOfYesterday || timestamp >= startOfToday) return false;
      } else if (dateRange === '7d') {
        if (timestamp === null || timestamp < now - 7 * 86400000) return false;
      } else if (dateRange === '30d') {
        if (timestamp === null || timestamp < now - 30 * 86400000) return false;
      }

      if (searchTrimmed) {
        const haystack =
          `${event.title || ''} ${event.body || ''} ${event.appLabel || ''} ${event.packageName || ''}`.toLowerCase();
        if (!haystack.includes(searchTrimmed)) return false;
      }
      return true;
    });
  }, [events, filters, startOfToday, startOfYesterday]);

  const isViewingYesterday = filters.dateRange === 'yesterday';
  const activeUsageDoc = isViewingYesterday ? usage.yesterday : usage.today;

  const stats: StatItem[] = useMemo(() => {
    const totalData =
      (activeUsageDoc?.totalRxBytes ?? 0) + (activeUsageDoc?.totalTxBytes ?? 0);
    const appCount = activeUsageDoc?.apps.length ?? 0;
    const labelPrefix = isViewingYesterday ? 'Yesterday' : 'Today';

    return [
      {
        label: `Screen time ${labelPrefix.toLowerCase()}`,
        value: usage.loading && !activeUsageDoc
          ? '—'
          : formatDuration(activeUsageDoc?.totalSeconds ?? 0),
        detail: `${appCount} app${appCount === 1 ? '' : 's'} tracked`,
        icon: <Clock3 className="h-4 w-4" />,
        iconClass: 'bg-[#fff0f5] text-[#c2185b]',
      },
      {
        label: `Data ${labelPrefix.toLowerCase()}`,
        value: usage.loading && !activeUsageDoc
          ? '—'
          : formatBytes(totalData),
        detail: 'Wi-Fi + mobile',
        icon: <Wifi className="h-4 w-4" />,
        iconClass: 'bg-[#eef4fb] text-[#2f5d8a]',
      },
      {
        label: 'Apps active',
        value: String(appCount),
        detail: isViewingYesterday ? 'Used yesterday' : 'Used since 12:00 AM',
        icon: <Smartphone className="h-4 w-4" />,
        iconClass: 'bg-[#f4f3ff] text-[#5925dc]',
      },
      {
        label: isViewingYesterday ? 'Events yesterday' : 'Events today',
        value: String(
          isViewingYesterday
            ? filteredEvents.length
            : (usage.todayEventCount > 0 ? usage.todayEventCount : filteredEvents.length)
        ),
        detail: isViewingYesterday
          ? 'Full 24-hr record'
          : 'Strictly from 12 AM today',
        icon: <Activity className="h-4 w-4" />,
        iconClass: 'bg-[#fff5f8] text-[#ff4081]',
      },
    ];
  }, [usage.loading, activeUsageDoc, isViewingYesterday, filteredEvents.length, usage.todayEventCount]);

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
    <div className="min-h-screen bg-[#fff7f9] text-[#1d1b18] w-full overflow-x-hidden">
      <Header
        partnerName={partnerName}
        connectionStatus={connectionStatus}
        onOpenUploadApk={() => setUploadApkOpen(true)}
      />

      {newEventCount > 0 && (
        <div className="fixed left-1/2 top-[82px] z-40 -translate-x-1/2 px-4 max-w-[calc(100vw-2rem)]">
          <button
            onClick={showNewEvents}
            className="flex animate-slide-down-fade items-center gap-2 rounded-full bg-[#c2185b] px-4 py-2 text-xs font-medium text-white shadow-lg shadow-[#c2185b]/25 transition-transform hover:-translate-y-0.5"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>
              {newEventCount} new event{newEventCount > 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-3.5 pb-16 pt-[82px] sm:px-6 sm:pt-[92px] lg:px-8 overflow-x-hidden">
        {/* OVERVIEW SECTION */}
        <section id="overview">
          <div className="flex flex-col gap-4 border-b border-[#f5e6ec] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c2185b]">
                  AmiChan Space 🌸
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff0f5] text-[10px] text-[#ff4081] font-medium">
                  <Sparkles className="w-2.5 h-2.5" />
                  Your Pocket Sanctuary 💕
                </span>
              </div>
              <h1 className="font-display mt-1 text-3xl tracking-tight sm:text-4xl text-[#1d1b18]">
                {partnerName}&apos;s activity
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#6e6a63]">
                A quiet, sweet, and private record of daily life, screen time, and shared moments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f5e6ec] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6e6a63]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2185b]" />
                {partnerEmail}
              </span>
              <button
                onClick={handleRefresh}
                className="btn-secondary px-3 py-2 text-xs rounded-xl border border-[#ebdce3] bg-white text-[#1d1b18] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-3.5 py-2.5 text-xs text-[#b42318]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DAY SELECTOR TABS */}
          <div className="mt-4 flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-x-auto pb-1 w-full max-w-full min-w-0">
            <button
              type="button"
              onClick={() => handleFilterChange({ dateRange: 'today' })}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all ${
                filters.dateRange === 'today'
                  ? 'bg-[#c2185b] text-white shadow-xs scale-102'
                  : 'bg-white border border-[#f5e6ec] text-[#6e6a63] hover:text-[#c2185b] hover:bg-[#fff0f5]'
              }`}
            >
              <span>Today 🌸</span>
              <span className="text-[10px] opacity-80">({format(new Date(), 'MMM d')})</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange({ dateRange: 'yesterday' })}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all ${
                filters.dateRange === 'yesterday'
                  ? 'bg-[#c2185b] text-white shadow-xs scale-102'
                  : 'bg-white border border-[#f5e6ec] text-[#6e6a63] hover:text-[#c2185b] hover:bg-[#fff0f5]'
              }`}
            >
              <span>Yesterday 📅</span>
              <span className="text-[10px] opacity-80">({format(subDays(new Date(), 1), 'MMM d')})</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange({ dateRange: 'all' })}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium shrink-0 transition-all ${
                filters.dateRange === 'all'
                  ? 'bg-[#c2185b] text-white shadow-xs scale-102'
                  : 'bg-white border border-[#f5e6ec] text-[#6e6a63] hover:text-[#c2185b] hover:bg-[#fff0f5]'
              }`}
            >
              <span>All Activity 📜</span>
            </button>
          </div>

          {/* STATS TILES */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 w-full max-w-full min-w-0">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="surface-card p-3.5 sm:p-4 rounded-[22px] border border-[#f0e4ea] bg-white shadow-xs min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96918a] truncate">
                    {stat.label}
                  </p>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-xl shrink-0 ${stat.iconClass}`}
                  >
                    {stat.icon}
                  </span>
                </div>
                <p className="font-display mt-2 text-2xl leading-none tracking-tight text-[#1d1b18] truncate">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[10.5px] text-[#96918a] truncate">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* USAGE SECTION */}
        <div id="usage" className="mt-8 scroll-mt-24 w-full max-w-full min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl tracking-tight text-[#1d1b18] flex items-center gap-2">
                Digital Wellbeing & Usage
                <span className="text-sm">🌸</span>
              </h2>
              <p className="text-xs text-[#6e6a63]">
                {isViewingYesterday
                  ? 'Yesterday’s complete 24-hr screen time and data record.'
                  : 'Strictly from 12:00 AM local time today. Never counts yesterday.'}
              </p>
            </div>
          </div>
          <UsagePanel
            today={activeUsageDoc}
            history={usage.history}
            loading={usage.loading}
            error={usage.error}
            onRefresh={usage.refresh}
          />
        </div>

        {/* REMOTE CAMERA & POLAROID SCRAPBOOK SECTION */}
        <section id="camera" className="mt-8 scroll-mt-24 w-full max-w-full min-w-0">
          <div className="mb-3">
            <h2 className="font-display text-2xl tracking-tight text-[#1d1b18] flex items-center gap-2">
              Polaroid Scrapbook & Remote Camera
              <span className="text-sm">📸💕</span>
            </h2>
            <p className="text-xs text-[#6e6a63]">
              Request a fresh selfie from {partnerName}&apos;s phone and preserve shared moments.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.5fr] w-full max-w-full min-w-0">
            <div className="surface-card flex flex-col p-4 sm:p-5 rounded-[22px] border border-[#f0e4ea] bg-white shadow-xs w-full max-w-full min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0f5] text-[#c2185b] shrink-0">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1d1b18] truncate">Snap a photo</h3>
                  <p className="text-[11px] text-[#96918a] truncate">
                    Front selfie or rear lens
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => void triggerRemoteCamera('front')}
                  disabled={requestingCamera !== null || !partnerUid}
                  className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-[#c2185b] hover:bg-[#ff4081] text-white flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 disabled:opacity-50 min-w-0"
                >
                  <Aperture className="h-4 w-4 shrink-0" />
                  <span className="truncate">Request Front Selfie 🌸</span>
                  {requestingCamera === 'front' && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void triggerRemoteCamera('back')}
                  disabled={requestingCamera !== null || !partnerUid}
                  className="w-full py-2.5 px-3 text-xs font-medium rounded-xl border border-[#ebdce3] bg-white text-[#1d1b18] hover:bg-[#fff0f5] hover:text-[#c2185b] flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 min-w-0"
                >
                  <Camera className="h-4 w-4 shrink-0" />
                  <span className="truncate">Request Rear Camera</span>
                  {requestingCamera === 'back' && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                  )}
                </button>
              </div>

              <p className="mt-4 text-[10.5px] leading-relaxed text-[#96918a]">
                Captures quietly while locked. Photos save securely into your shared polaroid album.
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

            {/* VINTAGE POLAROID GALLERY */}
            <div className="surface-card p-4 sm:p-5 rounded-[22px] border border-[#f0e4ea] bg-white shadow-xs w-full max-w-full min-w-0 overflow-hidden">
              <div className="mb-3 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Aperture className="h-4 w-4 text-[#c2185b] shrink-0" />
                  <h3 className="text-sm font-semibold text-[#1d1b18] truncate">
                    Shared Polaroid Album
                  </h3>
                  <span className="font-mono text-[10px] text-[#96918a] shrink-0">
                    {displayedImages.length} of {remoteImages.length}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {remoteLoading && (
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin text-[#c2185b]" />
                  )}
                  {remoteImages.length > 0 && (
                    <>
                      <button
                        onClick={() => scrollGallery('left')}
                        className="rounded-lg border border-[#ebdce3] bg-white p-1 text-[#6e6a63] hover:bg-[#fff0f5] hover:text-[#c2185b]"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => scrollGallery('right')}
                        className="rounded-lg border border-[#ebdce3] bg-white p-1 text-[#6e6a63] hover:bg-[#fff0f5] hover:text-[#c2185b]"
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
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#ebdce3] bg-[#fffcfd] py-10 text-center">
                  <Camera className="mb-2 h-6 w-6 text-[#ff80ab]" />
                  <p className="text-xs font-medium text-[#6e6a63]">
                    No polaroids yet 💕
                  </p>
                  <p className="mt-1 text-[10.5px] text-[#96918a]">
                    Request a selfie above to create the first memory!
                  </p>
                </div>
              ) : (
                <div
                  ref={galleryRef}
                  className="flex snap-x snap-mandatory items-stretch gap-3 sm:gap-4 overflow-x-auto pb-3 pt-2 px-1 w-full max-w-full min-w-0"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {displayedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="group relative w-32 sm:w-44 shrink-0 snap-start rounded-md border border-[#f0e0e6] bg-white p-2 pb-3 shadow-[0_10px_25px_-8px_rgba(194,24,91,0.15)] transition-transform hover:scale-102 hover:rotate-0"
                      style={{
                        transform: idx % 2 === 0 ? 'rotate(-1.5deg)' : 'rotate(1.5deg)',
                      }}
                    >
                      {/* Washi tape sticker */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-2.5 sm:h-3 bg-[#ffb2cc]/80 rounded-xs rotate-[-2deg] pointer-events-none shadow-2xs" />

                      <div className="relative aspect-square overflow-hidden rounded-xs bg-[#fdeef3]">
                        <img
                          src={`data:image/jpeg;base64,${img.imageBase64}`}
                          alt="Remote capture"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="absolute left-1 top-1 sm:left-1.5 sm:top-1.5 rounded-md bg-[#c2185b]/80 px-1 sm:px-1.5 py-0.5 font-mono text-[8.5px] sm:text-[9px] font-medium uppercase tracking-wide text-white">
                          {img.lensFacing === 'front' ? 'Selfie 🌸' : 'Rear'}
                        </span>

                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 sm:gap-2 bg-[#1d1b18]/50 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setActivePhoto(img)}
                            className="rounded-lg bg-white/95 p-1.5 sm:p-2 text-[#c2185b] hover:bg-white"
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
                            className="flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1.5 text-[10px] font-semibold text-[#1d1b18] hover:bg-white"
                            title="Download image"
                          >
                            <Download className="h-3.5 w-3.5 text-[#c2185b]" />
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-center">
                        <p className="font-mono text-[9px] text-[#96918a]">
                          {formatDistanceToNow(new Date(img.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {hasMorePhotos && (
                    <button
                      onClick={() =>
                        setVisiblePhotoCount((prev) =>
                          Math.min(prev + 6, remoteImages.length),
                        )
                      }
                      className="flex w-32 sm:w-40 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#ebdce3] bg-[#fff9fb] p-3 text-center transition-colors hover:border-[#c2185b] hover:bg-white"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ff80ab] bg-[#fff0f5] text-[#c2185b]">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-medium text-[#c2185b]">
                        Load more polaroids
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ACTIVITY TIMELINE SECTION */}
        <section id="activity" className="mt-8 scroll-mt-24">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl tracking-tight text-[#1d1b18]">
                {isViewingYesterday ? 'Yesterday’s Activity' : 'Today’s Activity Timeline'}
              </h2>
              <p className="text-xs text-[#6e6a63]">
                {isViewingYesterday
                  ? 'Activity recorded strictly during yesterday’s 24 hours.'
                  : 'Newest first · strictly starting from 12:00 AM midnight today.'}
              </p>
            </div>
            <span className="rounded-full border border-[#f0e0e6] bg-white px-2.5 py-1 font-mono text-[10px] text-[#c2185b] font-medium">
              {filteredEvents.length} events
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
            <div className="surface-card flex flex-col items-center justify-center px-6 py-12 text-center rounded-[22px] border border-[#f0e4ea] bg-white">
              <Inbox className="mb-2 h-7 w-7 text-[#ff80ab]" />
              <p className="text-sm font-medium text-[#1d1b18]">
                {isViewingYesterday
                  ? 'No recorded activity for yesterday'
                  : 'No matching activity for today'}
              </p>
              <p className="mt-1 max-w-sm text-xs text-[#96918a]">
                {isViewingYesterday
                  ? 'Older activity can be explored by clicking "All Activity 📜".'
                  : 'Activity resets at 12:00 AM. New events appear in real-time as the phone is used.'}
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
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ebdce3] bg-white px-3 py-1.5 text-[11px] text-[#6e6a63]">
                <RefreshCw className="h-3 w-3 animate-spin text-[#c2185b]" />
                Loading activity…
              </span>
            ) : loadingMore ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ebdce3] bg-white px-3 py-1.5 text-[11px] text-[#6e6a63]">
                <RefreshCw className="h-3 w-3 animate-spin text-[#c2185b]" />
                Loading older activity…
              </span>
            ) : hasMore ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void loadMore()}
                  className="px-3.5 py-2 text-xs rounded-xl border border-[#ebdce3] bg-white text-[#1d1b18] hover:bg-[#fff0f5] hover:text-[#c2185b] font-medium transition-colors"
                >
                  Load next 100 events
                </button>
                <button
                  onClick={() => void loadAllRemaining()}
                  className="px-3.5 py-2 text-xs rounded-xl bg-[#c2185b] hover:bg-[#ff4081] text-white font-semibold transition-colors shadow-2xs"
                >
                  Load all remaining activity
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-[#96918a]">
                All activity loaded.
              </span>
            )}
          </div>
        </section>
      </main>

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1d1b18]/70 p-3 backdrop-blur-xs sm:p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[#f0e4ea] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#fdf0f4] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-[#ffb2cc] bg-[#fff0f5] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#c2185b]">
                  {activePhoto.lensFacing === 'front' ? 'Selfie 🌸' : 'Rear'}
                </span>
                <span className="font-mono text-[10.5px] text-[#96918a]">
                  {formatTimestamp(activePhoto.timestamp)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(activePhoto)}
                  className="px-3 py-1.5 rounded-xl bg-[#c2185b] hover:bg-[#ff4081] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="rounded-full p-1.5 text-[#96918a] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#fffafc] p-2 sm:p-4">
              <img
                src={`data:image/jpeg;base64,${activePhoto.imageBase64}`}
                alt="Captured photo"
                className="max-h-[60vh] w-auto max-w-full rounded-2xl object-contain shadow-xs"
                decoding="async"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#fdf0f4] px-4 py-2 font-mono text-[10px] text-[#96918a]">
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

      {/* UPLOAD NEW APK & GITHUB RELEASE MODAL */}
      {uploadApkOpen && (
        <UploadApkModal onClose={() => setUploadApkOpen(false)} />
      )}
    </div>
  );
}
