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
  Monitor,
  Smartphone,
  Users,
} from 'lucide-react';
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
  color: string;
  bgColor: string;
}

const PARTNER_UIDS: Record<string, string> = {
  y22eIUbwtxdmZFRtDSKabmgXrWQ2: 'YLf3pl5On7S68Nnvlh50q4TP7Dv2',
  YLf3pl5On7S68Nnvlh50q4TP7Dv2: 'y22eIUbwtxdmZFRtDSKabmgXrWQ2',
};

/** Converts common JavaScript and Firestore timestamp values to milliseconds. */
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
  return millis === null ? 'Unknown date' : new Date(millis).toLocaleString();
}

function SkeletonRow() {
  return (
    <div className="p-4 flex items-start gap-3">
      <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-20" />
        </div>
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-3 w-48" />
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const partnerUid = user ? PARTNER_UIDS[user.uid] ?? null : null;
  const partnerName =
    user?.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2' ? 'amisha' : 'parth';
  const partnerEmail =
    user?.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2'
      ? 'amisha@gmail.com'
      : 'parth@gmail.com';

  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsLimit, setEventsLimit] = useState(20);
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

  const prevIdsRef = useRef<string[]>([]);
  const initialLoadRef = useRef(true);
  const newEventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  // Subscribe only to the selected partner's events. Firestore security rules
  // must independently enforce which signed-in users are allowed to read them.
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
          ? 'Unable to determine your partner account. Check the configured account mapping.'
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
        const rows = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }) as TrackerEvent);

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
            }, 4000);
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
            'Access denied. Check Firestore security rules and account permissions.',
          );
        } else if (snapshotError.code === 'failed-precondition') {
          setError(
            'The events query may require a composite index. Use the index-creation link in the Firebase error details.',
          );
        } else {
          setError(
            snapshotError.message ||
            'Failed to load events. Check your connection and try again.',
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

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    if (loading) return;
    if (events.length < eventsLimit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setEventsLimit((previous) => previous + 20);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);
    return () => {
      observer.unobserve(node);
      observer.disconnect();
    };
  }, [loading, events.length, eventsLimit]);

  // Scope the image query in Firestore rather than downloading other devices' images.
  useEffect(() => {
    if (!partnerUid) {
      setRemoteImages([]);
      setRemoteLoading(false);
      setRemoteError(null);
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
        const rows = snapshot.docs.map((imageDoc) => ({
          id: imageDoc.id,
          ...imageDoc.data(),
        }) as RemoteImage);
        setRemoteImages(rows);
        setRemoteLoading(false);
        setRemoteError(null);
      },
      (snapshotError) => {
        console.error('Firestore remote images error:', snapshotError);
        setRemoteLoading(false);
        setRemoteError(
          snapshotError.code === 'permission-denied'
            ? 'You are not authorized to view these images.'
            : snapshotError.code === 'failed-precondition'
              ? 'The images query may require a composite Firestore index.'
              : snapshotError.message || 'Failed to load captured images.',
        );
      },
    );

    return () => unsubscribe();
  }, [partnerUid]);

  /**
   * Submit a capture REQUEST. The receiving device must show the device owner
   * an approval prompt and must not access its camera until the owner approves.
   * The companion Android listener must support request_capture_photo.
   */
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
          `Request sent for the ${lensFacing} camera. The device owner must approve it on their device before a photo is taken.`,
        );
      } catch (requestError) {
        console.error('Failed to send camera request:', requestError);
        setCameraError(
          requestError instanceof Error
            ? requestError.message
            : 'Failed to send the camera request. Check Firestore permissions and your connection.',
        );
      } finally {
        setRequestingCamera(null);
      }
    },
    [partnerUid, user?.uid],
  );

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
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0,
        )
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  const stats: StatItem[] = [
    {
      label: "Partner's Events",
      value: filteredEvents.length,
      icon: <Activity className="w-5 h-5" />,
      color: 'var(--accent-green)',
      bgColor: 'var(--accent-green-muted)',
    },
    {
      label: 'Sessions',
      value: filteredEvents.filter(
        (event) =>
          event.eventType === 'APP_SESSION_START' ||
          event.eventType === 'APP_SESSION_END',
      ).length,
      icon: <Monitor className="w-5 h-5" />,
      color: 'var(--accent-blue)',
      bgColor: 'var(--accent-blue)',
    },
    {
      label: 'Notifications',
      value: filteredEvents.filter(
        (event) => event.eventType === 'NOTIFICATION_POSTED',
      ).length,
      icon: <Bell className="w-5 h-5" />,
      color: 'var(--accent-purple)',
      bgColor: 'var(--accent-purple)',
    },
    {
      label: 'Calls & SMS',
      value: filteredEvents.filter(
        (event) =>
          event.eventType === 'CALL_LOG' ||
          event.eventType === 'SMS_RECEIVED' ||
          event.eventType === 'SMS_SENT',
      ).length,
      icon: <Smartphone className="w-5 h-5" />,
      color: 'var(--accent-amber)',
      bgColor: 'var(--accent-amber)',
    },
  ];

  const hasActiveFilters =
    filters.eventTypes.length > 0 ||
    filters.appLabel !== null ||
    filters.dateRange !== 'all' ||
    filters.search.trim() !== '';

  const handleEventClick = (event: TrackerEvent) => {
    navigate('/event/' + event.id);
  };

  const renderEmptyState = () => (
    <div className="card p-12 text-center animate-in">
      <div
        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent-gray)' }}
      >
        <Activity className="w-8 h-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
        {hasActiveFilters
          ? 'No matching events'
          : `No events from ${partnerName} yet`}
      </h3>
      <p className="text-[var(--text-secondary)] text-sm max-w-xs mx-auto">
        {hasActiveFilters
          ? 'Try adjusting your filters or search terms.'
          : `Events associated with ${partnerEmail} will appear here when synced and authorized.`}
      </p>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="card overflow-hidden mt-4 animate-in">
      <div className="divide-y divide-[var(--border-primary)]">
        {[0, 1, 2, 3, 4].map((index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </div>
  );

  const renderEvents = () => {
    if (loading && initialLoad) {
      return renderLoadingSkeleton();
    }

    if (filteredEvents.length === 0) {
      return error ? null : renderEmptyState();
    }

    return (
      <div className="card overflow-hidden animate-in">
        <div className="divide-y divide-[var(--border-primary)]">
          {filteredEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => handleEventClick(event)}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />

      {newEventCount > 0 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] px-4 animate-slide-down pointer-events-none">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-green)] text-[var(--text-inverse)] rounded-full shadow-xl font-medium text-sm pointer-events-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
            </span>
            {newEventCount} new event{newEventCount === 1 ? '' : 's'}
          </div>
        </div>
      )}

      <main className="flex-1 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <div
              className="mb-6 flex items-center gap-3 p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-xl animate-in animate-wiggle"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-[var(--accent-red)] flex-shrink-0" />
              <p className="text-sm text-[var(--accent-red)]">{error}</p>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] rounded-xl">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                Viewing {partnerName}'s activity
              </span>
            </div>
          </div>

          <EventFilters
            filters={filters}
            onChange={handleFilterChange}
            events={events}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="card p-4 animate-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold font-mono text-[var(--text-primary)]">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${stat.bgColor} 20%, transparent)`,
                    }}
                  >
                    <span style={{ color: stat.color }}>{stat.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Camera requests are approval-gated on the receiving device. */}
          <section className="card p-4 mb-6 animate-in" aria-labelledby="remote-camera-title">
            <h3
              id="remote-camera-title"
              className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2"
            >
              <Camera className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
              Request a Photo
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Send a request to {partnerName}'s device. The device owner must approve the request on that device before its camera can be used.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void triggerRemoteCamera('front')}
                disabled={requestingCamera !== null || !partnerUid}
                className={`btn-primary flex items-center gap-2 ${requestingCamera === 'front' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Aperture className="w-4 h-4" />
                <span>Request Selfie</span>
                {requestingCamera === 'front' && (
                  <span className="animate-spin" aria-label="Sending request">⏳</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => void triggerRemoteCamera('back')}
                disabled={requestingCamera !== null || !partnerUid}
                className={`btn-secondary flex items-center gap-2 ${requestingCamera === 'back' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Camera className="w-4 h-4" />
                <span>Request Back-Camera Photo</span>
                {requestingCamera === 'back' && (
                  <span className="animate-spin" aria-label="Sending request">⏳</span>
                )}
              </button>
            </div>
            {cameraMessage && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]" role="status">
                {cameraMessage}
              </p>
            )}
            {cameraError && (
              <p className="mt-3 text-sm text-[var(--accent-red)]" role="alert">
                {cameraError}
              </p>
            )}
          </section>

          {/* Only images belonging to the selected partner device are queried. */}
          <section className="card p-4 mb-6 animate-in" aria-labelledby="captured-images-title">
            <div className="flex items-center justify-between mb-3">
              <h3
                id="captured-images-title"
                className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2"
              >
                <Aperture className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                Captured Images
              </h3>
              {remoteLoading && (
                <span className="text-xs text-[var(--accent-amber)] animate-pulse">
                  Loading images...
                </span>
              )}
            </div>

            {remoteError ? (
              <p className="text-sm text-[var(--accent-red)]" role="alert">
                {remoteError}
              </p>
            ) : remoteLoading && remoteImages.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-4">
                Loading captured images...
              </p>
            ) : remoteImages.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-center py-8">
                No images are available. Images should appear here only after the device owner has approved a capture request and the device has uploaded the photo.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {remoteImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <div className="aspect-square bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-primary)]">
                      <img
                        src={`data:image/jpeg;base64,${img.imageBase64}`}
                        alt={`${img.lensFacing} camera photo`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 capitalize">
                          {img.lensFacing === 'front' ? '🤳' : '📸'} {img.lensFacing}
                        </span>
                        <span className="text-[10px] opacity-75 text-right">
                          {formatTimestamp(img.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {partnerName}'s Events{' '}
                <span className="font-mono text-[var(--text-muted)] font-normal">
                  ({filteredEvents.length})
                </span>
              </h2>
              {hasActiveFilters && (
                <span className="chip bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Filtered
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className={
                  'w-2 h-2 rounded-full transition-colors ' +
                  (connectionStatus === 'connected'
                    ? 'bg-[var(--accent-green)]'
                    : connectionStatus === 'connecting'
                      ? 'bg-[var(--accent-amber)] animate-pulse-soft'
                      : 'bg-[var(--accent-red)]')
                }
              />
              <span className="text-xs text-[var(--text-muted)] capitalize">
                {connectionStatus}
              </span>
            </div>
          </div>

          {renderEvents()}

          <div ref={loadMoreRef} className="mt-6 text-center">
            {events.length >= eventsLimit && loading ? (
              <span className="text-sm text-[var(--text-muted)]">
                <span className="animate-spin mr-2">⏳</span>
                Loading...
              </span>
            ) : events.length >= eventsLimit ? (
              <span className="text-xs text-[var(--text-muted)]">Scroll to load more</span>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
