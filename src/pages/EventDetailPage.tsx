import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { TrackerEvent } from '../types';
import Header from '../components/Header';
import { ChevronLeft, Copy, AlertCircle, CheckCircle, Clock, Smartphone, Tag, Hash, Globe, Database, FileText, User, Users } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

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
  { key: 'eventId', label: 'Event ID', icon: <Hash className="w-5 h-5" />, copyable: true, monospace: true },
  { key: 'deviceId', label: 'Device ID', icon: <Smartphone className="w-5 h-5" />, copyable: true, monospace: true },
  { key: 'eventType', label: 'Event Type', icon: <Tag className="w-5 h-5" />, badge: true },
  { key: 'packageName', label: 'Package Name', icon: <Globe className="w-5 h-5" />, copyable: true, monospace: true, optional: true },
  { key: 'appLabel', label: 'App Label', icon: <Smartphone className="w-5 h-5" />, optional: true },
  { key: 'observedAtUtc', label: 'Observed At (UTC)', icon: <Clock className="w-5 h-5" />, date: true },
  { key: 'sessionStartUtc', label: 'Session Start (UTC)', icon: <Clock className="w-5 h-5" />, date: true, optional: true },
  { key: 'sessionEndUtc', label: 'Session End (UTC)', icon: <Clock className="w-5 h-5" />, date: true, optional: true },
  { key: 'durationSeconds', label: 'Duration (seconds)', icon: <Clock className="w-5 h-5" />, number: true, optional: true },
  { key: 'title', label: 'Title', icon: <FileText className="w-5 h-5" />, multiline: true, optional: true },
  { key: 'body', label: 'Body', icon: <FileText className="w-5 h-5" />, multiline: true, optional: true },
  { key: 'extraJson', label: 'Extra JSON', icon: <Database className="w-5 h-5" />, json: true, optional: true },
  { key: 'schemaVersion', label: 'Schema Version', icon: <Hash className="w-5 h-5" />, number: true },
  { key: 'syncedByUid', label: 'Synced By UID', icon: <User className="w-5 h-5" />, copyable: true, monospace: true },
];

function formatValue(event: TrackerEvent, field: FieldConfig): { value: string; isEmpty: boolean } {
  const val = event[field.key];
  
  if (val === null || val === undefined || val === '') {
    return { value: '—', isEmpty: true };
  }

  if (field.date) {
    const date = new Date(val as number);
    return { 
      value: `${format(date, 'yyyy-MM-dd HH:mm:ss')} UTC  •  ${formatDistanceToNow(date, { addSuffix: true })}`,
      isEmpty: false 
    };
  }

  if (field.number) {
    const secs = val as number;
    if (secs < 60) return { value: `${secs}s`, isEmpty: false };
    if (secs < 3600) return { value: `${Math.floor(secs / 60)}m ${secs % 60}s`, isEmpty: false };
    return { value: `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`, isEmpty: false };
  }

  if (field.json) {
    try {
      const parsed = JSON.parse(val as string);
      return { value: JSON.stringify(parsed, null, 2), isEmpty: false };
    } catch {
      return { value: val as string, isEmpty: false };
    }
  }

  return { value: String(val), isEmpty: false };
}

export default function EventDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const navigate = useNavigate();
  const [event, setEvent] = useState<TrackerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const partnerUid = user ? (user.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2' ? 'YLf3pl5On7S68Nnvlh50q4TP7Dv2' : 'y22eIUbwtxdmZFRtDSKabmgXrWQ2') : null;
  const partnerName = user?.uid === 'y22eIUbwtxdmZFRtDSKabmgXrWQ2' ? 'amisha' : 'parth';

  useEffect(() => {
    if (!id || !partnerUid) {
      setError('Event ID is missing or unable to determine partner');
      setLoading(false);
      return;
    }

    async function fetchEvent() {
      try {
        const docRef = doc(db as any, 'events', id!);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data() as TrackerEvent;
          // Verify this event belongs to the partner
          if (data.syncedByUid !== partnerUid) {
            setError('This event is not from your partner');
          } else {
            setEvent({ ...data, id: snap.id });
          }
        } else {
          setError('Event not found');
        }
      } catch (err: any) {
        console.error('Error fetching event:', err);
        if (err.code === 'permission-denied') {
          setError('You are not authorized to view this event.');
        } else {
          setError(err.message || 'Failed to load event');
        }
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
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <Header />
        <main className="flex-1 pt-14 pb-8 flex items-center justify-center">
          <div className="max-w-3xl mx-auto px-4">
            <div className="card p-8 animate-in">
              <div className="space-y-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <Header />
        <main className="flex-1 pt-14 pb-8 flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center animate-in">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: 'var(--accent-red)' }}>
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Event Not Found</h2>
            <p className="text-[var(--text-secondary)] mb-6">{error || 'This event does not exist or has been removed.'}</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              <ChevronLeft className="w-4 h-4" />
              Back to Events
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />
      
      <main className="flex-1 pt-14 pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 animate-in">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost p-2 lg:p-3 rounded-xl"
              aria-label="Back to events"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <span className={`chip ${event.eventType.includes('SESSION') ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]' : 
                                event.eventType === 'NOTIFICATION_POSTED' ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]' :
                                event.eventType.includes('SMS') ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                                event.eventType === 'CALL_LOG' ? 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]' :
                                event.eventType.includes('PACKAGE') ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]' :
                                'bg-[var(--accent-gray)]/20 text-[var(--text-secondary)]'}`}>
                {event.eventType.replace(/_/g, ' ')}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] rounded-xl text-sm">
                <Users className="w-4 h-4" />
                <span>Viewing {partnerName}'s event</span>
              </span>
            </div>
          </div>

          <div className="card overflow-hidden animate-in stagger-1">
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                    {event.appLabel || event.packageName || 'Unknown Event'}
                  </h1>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] font-mono">
                    {formatDistanceToNow(new Date(event.observedAtUtc), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {event.packageName && (
                    <button
                      onClick={() => handleCopy(event.packageName!, 'packageName')}
                      className="btn-ghost p-2 rounded-lg"
                      aria-label="Copy package name"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {FIELD_CONFIG.map((fieldConfig) => {
                const { value, isEmpty } = formatValue(event, fieldConfig);
                if (fieldConfig.optional && isEmpty) return null;

                const isJson = fieldConfig.json;
                const isMultiline = fieldConfig.multiline;
                const isMonospace = fieldConfig.monospace;
                const isCopyable = fieldConfig.copyable;
                const isBadge = fieldConfig.badge;

                return (
                  <div
                    key={fieldConfig.key}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                      isEmpty ? 'bg-[var(--bg-secondary)]/50' : 'bg-[var(--bg-secondary)]'
                    } hover:bg-[var(--bg-hover)]`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-gray)' }}>
                      {fieldConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          {fieldConfig.label}
                        </span>
                        {isCopyable && !isEmpty && (
                          <button
                            onClick={() => handleCopy(value, fieldConfig.key)}
                            className={`btn-ghost p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                              copiedField === fieldConfig.key ? 'opacity-100 text-[var(--accent-green)]' : ''
                            }`}
                            aria-label={`Copy ${fieldConfig.label}`}
                          >
                            {copiedField === fieldConfig.key ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      {isBadge && !isEmpty ? (
                        <span className={`chip font-medium ${event.eventType.includes('SESSION') ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]' : 
                                event.eventType === 'NOTIFICATION_POSTED' ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]' :
                                event.eventType.includes('SMS') ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                                event.eventType === 'CALL_LOG' ? 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]' :
                                event.eventType.includes('PACKAGE') ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]' :
                                'bg-[var(--accent-gray)]/20 text-[var(--text-secondary)]'}`}>
                          {value}
                        </span>
                      ) : isJson ? (
                        <pre className={clsx(
                          'text-sm font-mono whitespace-pre-wrap break-words',
                          'text-[var(--text-secondary)]',
                          isEmpty && 'text-[var(--text-muted)]'
                        )}>
                          {value}
                        </pre>
                      ) : isMultiline ? (
                        <p className={clsx(
                          'text-sm whitespace-pre-wrap break-words',
                          isEmpty ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                        )}>
                          {value}
                        </p>
                      ) : (
                        <code className={clsx(
                          'text-sm break-all',
                          isMonospace && 'font-mono',
                          isEmpty ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                        )}>
                          {value}
                        </code>
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