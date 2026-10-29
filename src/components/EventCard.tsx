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
    bg: string;
    border: string;
    text: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  APP_SESSION_START: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    icon: <Monitor className="w-3.5 h-3.5" />,
    label: 'Session Start',
  },
  APP_SESSION_END: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    icon: <Monitor className="w-3.5 h-3.5" />,
    label: 'Session End',
  },
  NOTIFICATION_POSTED: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    icon: <Bell className="w-3.5 h-3.5" />,
    label: 'Notification',
  },
  SMS_RECEIVED: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    label: 'SMS Received',
  },
  SMS_SENT: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: <Mail className="w-3.5 h-3.5" />,
    label: 'SMS Sent',
  },
  CALL_LOG: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: <Phone className="w-3.5 h-3.5" />,
    label: 'Call Log',
  },
  PACKAGE_ADDED: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'App Installed',
  },
  PACKAGE_REMOVED: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'App Removed',
  },
  PACKAGE_UPDATED: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'App Updated',
  },
  DEVICE_BOOT: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: <Zap className="w-3.5 h-3.5" />,
    label: 'Device Boot',
  },
  INVENTORY_SNAPSHOT: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    icon: <Database className="w-3.5 h-3.5" />,
    label: 'Inventory',
  },
  ACCESSIBILITY_EVENT: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Accessibility',
  },
  TRACKING_STOPPED: {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/50',
    text: 'text-rose-300',
    icon: <PauseCircle className="w-3.5 h-3.5" />,
    label: 'Tracking Stopped',
  },
  TRACKING_RESUMED: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
    icon: <PlayCircle className="w-3.5 h-3.5" />,
    label: 'Tracking Resumed',
  },
};

function EventCardComponent({
  event,
  onClick,
}: EventCardProps) {
  const config = EVENT_CONFIG[event.eventType] || {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: event.eventType.replace(/_/g, ' '),
  };

  const dateObj = new Date(event.observedAtUtc);
  const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });
  const exactTime = format(dateObj, 'hh:mm a');
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
        'optimized-card group relative w-full flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl',
        'bg-[#0E1524] hover:bg-[#151F32]',
        'border border-white/[0.07] hover:border-white/[0.15]',
        'transition-colors duration-150 cursor-pointer',
        'active:scale-[0.99] select-none'
      )}
    >
      {/* App Icon */}
      <AppIcon
        packageName={event.packageName}
        appLabel={event.appLabel}
        size={44}
      />

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            <span className="font-semibold text-white text-sm tracking-tight truncate">
              {event.appLabel || event.packageName || 'System Event'}
            </span>
            
            <span
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                config.bg,
                config.border,
                config.text
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </span>

            {event.packageName && (
              <span className="text-[10px] text-slate-400 font-mono hidden lg:inline truncate max-w-[160px]">
                {event.packageName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono shrink-0 ml-auto">
            <Clock className="w-3 h-3 text-slate-400" />
            <span title={dateObj.toISOString()}>{relativeTime}</span>
            <span className="text-slate-400 hidden sm:inline">• {exactTime}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors ml-0.5" />
          </div>
        </div>

        {/* Title */}
        {hasTitle && (
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-200 tracking-tight">
            {event.title}
          </p>
        )}

        {/* Body Text */}
        {hasBody && (
          <div className="mt-1 text-xs text-slate-300 bg-white/[0.03] p-2 rounded-xl border border-white/[0.04] line-clamp-2 leading-relaxed">
            {event.body}
          </div>
        )}

        {/* Duration / Session Extra */}
        {event.durationSeconds !== null && event.durationSeconds !== undefined && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
            <span>Duration:</span>
            <span className="font-semibold">{event.durationSeconds}s</span>
          </div>
        )}

        {/* Tracking Stop / Resume Indicators */}
        {(event.eventType === 'TRACKING_STOPPED' ||
          event.eventType === 'TRACKING_RESUMED') && (
          <div className="mt-1.5 text-[11px] font-mono text-slate-300 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08] inline-block">
            {event.eventType === 'TRACKING_STOPPED'
              ? `🔴 Stopped by: ${extra.stoppedBy || 'Admin'}`
              : `🟢 Resumed by: ${extra.resumedBy || 'Admin'}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EventCardComponent, (prev, next) => {
  return prev.event.id === next.event.id && prev.event.observedAtUtc === next.event.observedAtUtc;
});
