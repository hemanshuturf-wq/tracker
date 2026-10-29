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
  { key: 'eventId', label: 'Event Identifier', icon: <Hash className="w-4 h-4" />, copyable: true, monospace: true },
  { key: 'deviceId', label: 'Device Identifier', icon: <Smartphone className="w-4 h-4" />, copyable: true, monospace: true },
  { key: 'eventType', label: 'Event Classification', icon: <Tag className="w-4 h-4" />, badge: true },
  { key: 'packageName', label: 'Package Name', icon: <Globe className="w-4 h-4" />, copyable: true, monospace: true, optional: true },
  { key: 'appLabel', label: 'Application Label', icon: <Layers className="w-4 h-4" />, optional: true },
  { key: 'observedAtUtc', label: 'Observed Timestamp (UTC)', icon: <Clock className="w-4 h-4" />, date: true },
  { key: 'sessionStartUtc', label: 'Session Start (UTC)', icon: <Clock className="w-4 h-4" />, date: true, optional: true },
  { key: 'sessionEndUtc', label: 'Session End (UTC)', icon: <Clock className="w-4 h-4" />, date: true, optional: true },
  { key: 'durationSeconds', label: 'Duration Elapsed', icon: <Clock className="w-4 h-4" />, number: true, optional: true },
  { key: 'title', label: 'Notification / Event Title', icon: <FileText className="w-4 h-4" />, multiline: true, optional: true },
  { key: 'body', label: 'Payload Message / Body', icon: <FileText className="w-4 h-4" />, multiline: true, optional: true },
  { key: 'extraJson', label: 'Metadata Payload (JSON)', icon: <Database className="w-4 h-4" />, json: true, optional: true },
  { key: 'schemaVersion', label: 'Data Schema Version', icon: <Shield className="w-4 h-4" />, number: true },
  { key: 'syncedByUid', label: 'Synced By UID', icon: <User className="w-4 h-4" />, copyable: true, monospace: true },
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

  const partnerUid = user
    ? user.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2'
      ? 'YLf3pl5On7S68Nnvlh50q4TP7Dv2'
      : 'y22eIUbwtxdmZFRtDSKabmgXrWQ2'
    : null;
  const partnerName =
    user?.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2' ? 'Amisha' : 'Parth';

  useEffect(() => {
    if (!id || !partnerUid) {
      setError('Event identifier missing or partner not recognized.');
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
            setError('This event does not originate from your authorized partner.');
          } else {
            setEvent({ ...data, id: snap.id });
          }
        } else {
          setError('Event not found or has been purged.');
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
      <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
        <Header partnerName={partnerName} />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="max-w-2xl w-full mx-auto px-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
        <Header partnerName={partnerName} />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="max-w-md w-full mx-auto p-8 rounded-3xl glass-card text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Telemetry Record Not Found</h2>
            <p className="text-xs text-slate-400 mb-6">{error || 'This event could not be loaded.'}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-modern-primary text-xs py-2 px-4 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
      <Header partnerName={partnerName} />

      <main className="flex-1 pt-22 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Nav */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="btn-modern-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Activity Feed</span>
            </button>

            <span className="text-xs font-mono text-slate-400 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              {partnerName}'s Record
            </span>
          </div>

          {/* Event Inspector Card */}
          <div className="glass-card rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl">
            
            {/* Inspector Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-white/[0.03] to-white/[0.01] border-b border-white/[0.08] flex items-center gap-5">
              <AppIcon
                packageName={event.packageName}
                appLabel={event.appLabel}
                size={56}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    {event.appLabel || event.packageName || 'System Event'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    {event.eventType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400">
                  Recorded {formatDistanceToNow(new Date(event.observedAtUtc), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Field Breakdown Grid */}
            <div className="p-6 sm:p-8 space-y-4">
              {FIELD_CONFIG.map((field) => {
                const { value, isEmpty } = formatValue(event, field);
                if (field.optional && isEmpty) return null;

                return (
                  <div
                    key={field.key}
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-start gap-4 group"
                  >
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 shrink-0 mt-0.5">
                      {field.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                          {field.label}
                        </span>

                        {field.copyable && !isEmpty && (
                          <button
                            onClick={() => handleCopy(value, field.key)}
                            className="p-1 rounded-md text-slate-500 hover:text-white transition-colors cursor-pointer"
                            title="Copy value"
                          >
                            {copiedField === field.key ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {field.json && !isEmpty ? (
                        <pre className="text-xs font-mono p-3 rounded-xl bg-black/60 border border-white/[0.06] text-cyan-300 overflow-x-auto leading-relaxed">
                          {value}
                        </pre>
                      ) : field.multiline && !isEmpty ? (
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {value}
                        </p>
                      ) : (
                        <p
                          className={clsx(
                            'text-sm text-slate-200 break-all',
                            field.monospace && 'font-mono text-xs text-cyan-300'
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

          </div>

        </div>
      </main>
    </div>
  );
}
