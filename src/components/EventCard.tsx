import React, { memo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ChevronRight,
  MessageSquare,
  Phone,
  Mail,
  Bell,
  Monitor,
  Box,
  AlertTriangle,
  Database,
  Zap,
  PauseCircle,
  PlayCircle,
  Clock,
} from 'lucide-react';
import type { TrackerEvent, EventType } from '../types';
import AppIcon from './AppIcon';
import { clsx } from 'clsx';
import { parseExtra } from '../lib/parseExtra';

interface EventCardProps {
  event: TrackerEvent;
  onClick: () => void;
  index?: number;
}

const EVENT_CONFIG: Record<
  EventType,
  {
    badge: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  APP_SESSION_START: {
    badge: 'bg-[#eff8ff] text-[#175cd3] border-[#d1e9ff]',
    icon: <Monitor className="h-3 w-3" />,
    label: 'Session start',
  },
  APP_SESSION_END: {
    badge: 'bg-[#eff8ff] text-[#175cd3] border-[#d1e9ff]',
    icon: <Monitor className="h-3 w-3" />,
    label: 'Session end',
  },
  NOTIFICATION_POSTED: {
    badge: 'bg-[#fffaeb] text-[#b54708] border-[#fedf89]',
    icon: <Bell className="h-3 w-3" />,
    label: 'Notification',
  },
  SMS_RECEIVED: {
    badge: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
    icon: <MessageSquare className="h-3 w-3" />,
    label: 'SMS received',
  },
  SMS_SENT: {
    badge: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
    icon: <Mail className="h-3 w-3" />,
    label: 'SMS sent',
  },
  CALL_LOG: {
    badge: 'bg-[#fff6ed] text-[#b54708] border-[#f9dbaf]',
    icon: <Phone className="h-3 w-3" />,
    label: 'Call',
  },
  PACKAGE_ADDED: {
    badge: 'bg-[#f4f3ff] text-[#5925dc] border-[#d9d6fe]',
    icon: <Box className="h-3 w-3" />,
    label: 'App installed',
  },
  PACKAGE_REMOVED: {
    badge: 'bg-[#fef3f2] text-[#b42318] border-[#fecdca]',
    icon: <Box className="h-3 w-3" />,
    label: 'App removed',
  },
  PACKAGE_UPDATED: {
    badge: 'bg-[#eef4fb] text-[#2f5d8a] border-[#c7d7ea]',
    icon: <Box className="h-3 w-3" />,
    label: 'App updated',
  },
  DEVICE_BOOT: {
    badge: 'bg-[#fef3f2] text-[#b42318] border-[#fecdca]',
    icon: <Zap className="h-3 w-3" />,
    label: 'Device boot',
  },
  INVENTORY_SNAPSHOT: {
    badge: 'bg-[#f3f1ec] text-[#6e6a63] border-[#e7e3db]',
    icon: <Database className="h-3 w-3" />,
    label: 'Inventory',
  },
  ACCESSIBILITY_EVENT: {
    badge: 'bg-[#f4f3ff] text-[#5925dc] border-[#d9d6fe]',
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Accessibility',
  },
  TRACKING_STOPPED: {
    badge: 'bg-[#fef3f2] text-[#b42318] border-[#fecdca]',
    icon: <PauseCircle className="h-3 w-3" />,
    label: 'Tracking stopped',
  },
  TRACKING_RESUMED: {
    badge: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
    icon: <PlayCircle className="h-3 w-3" />,
    label: 'Tracking resumed',
  },
};

function EventCardComponent({ event, onClick }: EventCardProps) {
  const config = EVENT_CONFIG[event.eventType] || {
    badge: 'bg-[#f3f1ec] text-[#6e6a63] border-[#e7e3db]',
    icon: <AlertTriangle className="h-3 w-3" />,
    label: event.eventType.replace(/_/g, ' '),
  };

  const dateObj = new Date(event.observedAtUtc);
  const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });
  const exactTime = format(dateObj, 'h:mm a');
  const hasBody = Boolean(event.body && event.body.trim().length > 0);
  const hasTitle = Boolean(event.title && event.title.trim().length > 0);
  const extra = parseExtra(event.extraJson);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        'optimized-card group relative flex w-full items-start gap-3.5 rounded-2xl border border-[#e7e3db] bg-white p-3.5',
        'transition-all duration-150 hover:border-[#d8d3c8] hover:shadow-[0_10px_28px_-20px_rgba(29,27,24,0.35)]',
        'cursor-pointer select-none active:scale-[0.995] sm:p-4',
      )}
    >
      <AppIcon
        packageName={event.packageName}
        appLabel={event.appLabel}
        size={42}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold tracking-tight text-[#1d1b18]">
              {event.appLabel || event.packageName || 'System event'}
            </span>

            <span
              className={clsx(
                'badge-soft border',
                config.badge,
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </span>

            {event.packageName && (
              <span className="hidden max-w-[180px] truncate font-mono text-[10px] text-[#96918a] lg:inline">
                {event.packageName}
              </span>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[10.5px] text-[#96918a]">
            <Clock className="h-3 w-3" />
            <span title={dateObj.toISOString()}>{relativeTime}</span>
            <span className="hidden sm:inline">· {exactTime}</span>
            <ChevronRight className="ml-0.5 h-3.5 w-3.5 text-[#c9c3b6] transition-colors group-hover:text-[#1f5c4a]" />
          </div>
        </div>

        {hasTitle && (
          <p className="mt-1 text-xs font-medium tracking-tight text-[#3f3b35] sm:text-[13px]">
            {event.title}
          </p>
        )}

        {hasBody && (
          <div className="mt-1.5 line-clamp-2 rounded-xl border border-[#f0eee8] bg-[#faf9f7] p-2 text-xs leading-relaxed text-[#6e6a63]">
            {event.body}
          </div>
        )}

        {event.durationSeconds !== null && event.durationSeconds !== undefined && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#d1e9ff] bg-[#eff8ff] px-2 py-0.5 font-mono text-[10.5px] text-[#175cd3]">
            <span>Duration</span>
            <span className="font-semibold">{event.durationSeconds}s</span>
          </div>
        )}

        {(event.eventType === 'TRACKING_STOPPED' ||
          event.eventType === 'TRACKING_RESUMED') && (
          <div className="mt-1.5 inline-block rounded-md border border-[#e7e3db] bg-[#faf9f7] px-2.5 py-1 font-mono text-[10.5px] text-[#6e6a63]">
            {event.eventType === 'TRACKING_STOPPED'
              ? `Stopped by ${extra.stoppedBy || 'admin'}`
              : `Resumed by ${extra.resumedBy || 'admin'}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EventCardComponent, (prev, next) => {
  return (
    prev.event.id === next.event.id &&
    prev.event.observedAtUtc === next.event.observedAtUtc
  );
});
