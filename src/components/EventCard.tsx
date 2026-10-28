import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, MessageSquare, Phone, Mail, Bell, Monitor, Box, AlertTriangle, Database, Zap, PauseCircle, PlayCircle } from 'lucide-react';
import type { TrackerEvent, EventType } from '../types';
import AppIcon from './AppIcon';
import { clsx } from 'clsx';
import { parseExtra } from '../lib/parseExtra';

interface EventCardProps {
  event: TrackerEvent;
  onClick: () => void;
  index?: number;
}

const EVENT_TYPE_CONFIG: Record<EventType, { 
  bg: string; 
  text: string; 
  icon: React.ReactNode;
  label: string;
}> = {
  APP_SESSION_START: { 
    bg: 'var(--accent-blue)', 
    text: '#0A0A0A', 
    icon: <Monitor className="w-3.5 h-3.5" />,
    label: 'Session Start'
  },
  APP_SESSION_END: { 
    bg: 'var(--accent-blue)', 
    text: '#0A0A0A', 
    icon: <Monitor className="w-3.5 h-3.5" />,
    label: 'Session End'
  },
  NOTIFICATION_POSTED: { 
    bg: 'var(--accent-purple)', 
    text: '#0A0A0A', 
    icon: <Bell className="w-3.5 h-3.5" />,
    label: 'Notification'
  },
  SMS_RECEIVED: { 
    bg: 'var(--accent-green)', 
    text: '#0A0A0A', 
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    label: 'SMS Received'
  },
  SMS_SENT: { 
    bg: 'var(--accent-green)', 
    text: '#0A0A0A', 
    icon: <Mail className="w-3.5 h-3.5" />,
    label: 'SMS Sent'
  },
  CALL_LOG: { 
    bg: 'var(--accent-amber)', 
    text: '#0A0A0A', 
    icon: <Phone className="w-3.5 h-3.5" />,
    label: 'Call Log'
  },
  PACKAGE_ADDED: { 
    bg: 'var(--accent-teal)', 
    text: '#0A0A0A', 
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'App Installed'
  },
  PACKAGE_REMOVED: { 
    bg: 'var(--accent-teal)', 
    text: '#0A0A0A', 
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'App Removed'
  },
  PACKAGE_UPDATED: { 
    bg: 'var(--accent-teal)', 
    text: '#0A0A0A', 
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'App Updated'
  },
  DEVICE_BOOT: { 
    bg: 'var(--accent-red)', 
    text: '#FFFFFF', 
    icon: <Zap className="w-3.5 h-3.5" />,
    label: 'Device Boot'
  },
  INVENTORY_SNAPSHOT: { 
    bg: 'var(--accent-gray)', 
    text: 'var(--text-primary)', 
    icon: <Database className="w-3.5 h-3.5" />,
    label: 'Inventory'
  },
  ACCESSIBILITY_EVENT: { 
    bg: 'var(--accent-gray)', 
    text: 'var(--text-primary)', 
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Accessibility'
  },
  TRACKING_STOPPED: { 
    bg: '#3A1E1E', 
    text: '#E05050', 
    icon: <PauseCircle className="w-3.5 h-3.5" />,
    label: 'Tracking Stopped'
  },
  TRACKING_RESUMED: { 
    bg: '#1E3A5C', 
    text: '#7FB0E0', 
    icon: <PlayCircle className="w-3.5 h-3.5" />,
    label: 'Tracking Resumed'
  },
};

export default function EventCard({ event, onClick, index = 0 }: EventCardProps) {
  const config = EVENT_TYPE_CONFIG[event.eventType] || { 
    bg: 'var(--accent-gray)', 
    text: 'var(--text-primary)', 
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: event.eventType.replace(/_/g, ' ')
  };
  
  const relativeTime = formatDistanceToNow(new Date(event.observedAtUtc), { addSuffix: true });
  const hasBody = event.body && event.body.trim().length > 0;
  const hasTitle = event.title && event.title.trim().length > 0;
  const extra = parseExtra(event.extraJson);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'card-interactive w-full flex items-start gap-3 p-4',
        'transition-all duration-200',
        'group',
        'animate-in'
      )}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <AppIcon packageName={event.packageName} appLabel={event.appLabel} size={48} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline flex-wrap gap-2 mb-1.5">
              <span className="font-medium text-[var(--text-primary)] truncate block sm:inline">
                {event.appLabel || event.packageName || 'Unknown'}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono whitespace-nowrap shrink-0">
                {relativeTime}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <span
                className={clsx(
                  'chip chip-sm flex items-center gap-1.5',
                  'border-none',
                  'font-medium'
                )}
                style={{ backgroundColor: config.bg, color: config.text }}
              >
                {config.icon}
                <span>{config.label}</span>
              </span>
              {event.packageName && (
                <span className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[200px] hidden sm:inline-block">
                  {event.packageName}
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
        </div>

        {hasTitle && (
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)] truncate">
            {event.title}
          </p>
        )}

        {hasBody && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)] truncate-2">
            {event.body}
          </p>
        )}

        {(event.eventType === 'TRACKING_STOPPED' || event.eventType === 'TRACKING_RESUMED') && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {event.eventType === 'TRACKING_STOPPED' 
              ? `Stopped by: ${extra.stoppedBy || 'unknown'}` 
              : `Resumed by: ${extra.resumedBy || 'unknown'}`}
          </p>
        )}

        {event.extraJson && !hasBody && !hasTitle && !(event.eventType === 'TRACKING_STOPPED' || event.eventType === 'TRACKING_RESUMED') && (
          <p className="mt-2 text-xs text-[var(--text-muted)] font-mono truncate">
            {event.extraJson.slice(0, 120)}{event.extraJson.length > 120 ? '…' : ''}
          </p>
        )}
      </div>
    </button>
  );
}