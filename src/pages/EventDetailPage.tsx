import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { TrackerEvent } from '../types';
import Header from '../components/Header';
import {
  ChevronLeft,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  Smartphone,
  Tag,
  Hash,
  Globe,
  Database,
  FileText,
  User,
  Shield,
  Layers,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import AppIcon from '../components/AppIcon';

interface FieldConfig {
  key: keyof TrackerEvent;
  label: string;
  icon: React.ReactNode;
  copyable?: boolean;
  monospace?: boolean;
  multiline?: boolean;
  date?: boolean;
  number?: boolean;
  json?: boolean;
  optional?: boolean;
  badge?: boolean;
}

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'eventId', label: 'Event identifier', icon: <Hash className="h-4 w-4" />, copyable: true, monospace: true },
  { key: 'deviceId', label: 'Device identifier', icon: <Smartphone className="h-4 w-4" />, copyable: true, monospace: true },
  { key: 'eventType', label: 'Event type', icon: <Tag className="h-4 w-4" />, badge: true },
  { key: 'packageName', label: 'Package name', icon: <Globe className="h-4 w-4" />, copyable: true, monospace: true, optional: true },
  { key: 'appLabel', label: 'Application', icon: <Layers className="h-4 w-4" />, optional: true },
  { key: 'observedAtUtc', label: 'Observed at', icon: <Clock className="h-4 w-4" />, date: true },
  { key: 'sessionStartUtc', label: 'Session start', icon: <Clock className="h-4 w-4" />, date: true, optional: true },
  { key: 'sessionEndUtc', label: 'Session end', icon: <Clock className="h-4 w-4" />, date: true, optional: true },
  { key: 'durationSeconds', label: 'Duration', icon: <Clock className="h-4 w-4" />, number: true, optional: true },
  { key: 'title', label: 'Title', icon: <FileText className="h-4 w-4" />, multiline: true, optional: true },
  { key: 'body', label: 'Body', icon: <FileText className="h-4 w-4" />, multiline: true, optional: true },
  { key: 'extraJson', label: 'Metadata', icon: <Database className="h-4 w-4" />, json: true, optional: true },
  { key: 'schemaVersion', label: 'Schema version', icon: <Shield className="h-4 w-4" />, number: true },
  { key: 'syncedByUid', label: 'Synced by UID', icon: <User className="h-4 w-4" />, copyable: true, monospace: true },
];

function formatValue(event: TrackerEvent, field: FieldConfig): { value: string; isEmpty: boolean } {
  const val = event[field.key];
  if (val === null || val === undefined || val === '') {
    return { value: '—', isEmpty: true };
  }

  if (field.date) {
    const date = new Date(val as number);
    return {
      value: `${format(date, 'yyyy-MM-dd HH:mm:ss')} UTC (${formatDistanceToNow(date, { addSuffix: true })})`,
      isEmpty: false,
    };
  }

  if (field.number) {
    const secs = val as number;
    if (field.key === 'schemaVersion') return { value: `v${secs}`, isEmpty: false };
    if (secs < 60) return { value: `${secs} seconds`, isEmpty: false };
    if (secs < 3600) return { value: `${Math.floor(secs / 60)}m ${secs % 60}s`, isEmpty: false };
    return { value: `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`, isEmpty: false };
  }

  if (field.json) {
    try {
      const parsed = JSON.parse(val as string);
      return { value: JSON.stringify(parsed, null, 2), isEmpty: false };
    } catch {
      return { value: String(val), isEmpty: false };
    }
  }

  return { value: String(val), isEmpty: false };
}

export default function EventDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<TrackerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
    : null;
  const partnerName = isParth ? 'Amisha' : isAmisha ? 'Parth' : 'Partner';

  useEffect(() => {
    if (!id || !partnerUid) {
      setError('Event identifier missing or family account not recognized.');
      setLoading(false);
      return;
    }

    async function fetchEvent() {
      try {
        const docRef = doc(db, 'events', id!);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data() as TrackerEvent;
          if (data.syncedByUid !== partnerUid) {
            setError('This event does not belong to your authorized family account.');
          } else {
            setEvent({ ...data, id: snap.id });
          }
        } else {
          setError('Event not found or has been removed.');
        }
      } catch (err: any) {
        console.error('Fetch event detail failed:', err);
        setError(err.message || 'Failed to retrieve event details.');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id, partnerUid]);

  const handleCopy = (value: string, fieldName: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f5f2] text-[#1d1b18]">
        <Header partnerName={partnerName} />
        <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-[96px] sm:px-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#f6f5f2] text-[#1d1b18]">
        <Header partnerName={partnerName} />
        <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 pb-12 pt-[120px] text-center sm:px-6">
          <div className="surface-card w-full p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fef3f2] text-[#b42318]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl tracking-tight">Record not found</h2>
            <p className="mt-2 text-sm text-[#6e6a63]">
              {error || 'This event could not be loaded.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary mt-6 px-4 py-2 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to dashboard</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#1d1b18]">
      <Header partnerName={partnerName} />

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-[92px] sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to activity</span>
          </button>

          <span className="rounded-full border border-[#e7e3db] bg-white px-3 py-1 text-[10px] font-medium text-[#6e6a63]">
            {partnerName}&apos;s record
          </span>
        </div>

        <article className="surface-card overflow-hidden">
          <div className="flex items-center gap-4 border-b border-[#f0eee8] bg-[#fbfaf8] p-5 sm:p-6">
            <AppIcon
              packageName={event.packageName}
              appLabel={event.appLabel}
              size={52}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl tracking-tight">
                  {event.appLabel || event.packageName || 'System event'}
                </h1>
                <span className="rounded-full border border-[#bcd6cb] bg-[#e9f1ed] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#1f5c4a]">
                  {event.eventType.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#96918a]">
                Recorded{' '}
                {formatDistanceToNow(new Date(event.observedAtUtc), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#f3f1ec]">
            {FIELD_CONFIG.map((field) => {
              const { value, isEmpty } = formatValue(event, field);
              if (field.optional && isEmpty) return null;

              return (
                <div
                  key={field.key}
                  className="flex items-start gap-4 p-4 transition-colors hover:bg-[#fbfaf8] sm:p-5"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f1ec] text-[#6e6a63]">
                    {field.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96918a]">
                        {field.label}
                      </span>

                      {field.copyable && !isEmpty && (
                        <button
                          onClick={() => handleCopy(value, field.key)}
                          className="rounded-md p-1 text-[#96918a] hover:bg-[#f3f1ec] hover:text-[#1d1b18]"
                          title="Copy value"
                        >
                          {copiedField === field.key ? (
                            <CheckCircle className="h-3.5 w-3.5 text-[#1f5c4a]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {field.json && !isEmpty ? (
                      <pre className="overflow-x-auto rounded-xl border border-[#e7e3db] bg-[#fbfaf8] p-3 font-mono text-[11px] leading-relaxed text-[#3f3b35]">
                        {value}
                      </pre>
                    ) : field.multiline && !isEmpty ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3f3b35]">
                        {value}
                      </p>
                    ) : (
                      <p
                        className={clsx(
                          'break-all text-sm text-[#3f3b35]',
                          field.monospace &&
                            'font-mono text-[11.5px] text-[#1f5c4a]',
                        )}
                      >
                        {value}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </main>
    </div>
  );
}
