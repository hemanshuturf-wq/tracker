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

export default function EventCard({
  event,
  onClick,
  index = 0,
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
  const exactTime = format(dateObj, 'hh:mm:ss a');
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
        'group relative w-full flex items-start gap-4 p-4 sm:p-5 rounded-2xl',
        'bg-[#101827]/70 hover:bg-[#162238]/90',
        'border border-white/[0.06] hover:border-white/[0.14]',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5',
        'animate-fade-scale'
      )}
      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
    >
      {/* App Icon */}
      <AppIcon
        packageName={event.packageName}
        appLabel={event.appLabel}
        size={46}
      />

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            <span className="font-semibold text-white text-sm sm:text-base tracking-tight truncate">
              {event.appLabel || event.packageName || 'System Event'}
            </span>
            
            {/* Tag Badge */}
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                config.bg,
                config.border,
                config.text
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </span>

            {/* Sub-label / Package */}
            {event.packageName && (
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline truncate max-w-[200px]">
                {event.packageName}
              </span>
            )}
          </div>

          {/* Time Badge */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0 ml-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span title={dateObj.toISOString()}>{relativeTime}</span>
            <span className="text-slate-400 hidden sm:inline">• {exactTime}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-200 ml-1" />
          </div>
        </div>

        {/* Title */}
        {hasTitle && (
          <p className="mt-2 text-sm font-medium text-slate-200 tracking-tight">
            {event.title}
          </p>
        )}

        {/* Body Text */}
        {hasBody && (
          <div className="mt-1.5 text-xs sm:text-sm text-slate-300 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.04] line-clamp-2 leading-relaxed">
            {event.body}
          </div>
        )}

        {/* Duration / Session Extra */}
        {event.durationSeconds !== null && event.durationSeconds !== undefined && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
            <span>⏱️ Active Duration:</span>
            <span className="font-semibold">{event.durationSeconds}s</span>
          </div>
        )}

        {/* Tracking Stop / Resume Indicators */}
        {(event.eventType === 'TRACKING_STOPPED' ||
          event.eventType === 'TRACKING_RESUMED') && (
          <div className="mt-2 text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.08] inline-block">
            {event.eventType === 'TRACKING_STOPPED'
              ? `🔴 Tracking halted by: ${extra.stoppedBy || 'Admin'}`
              : `🟢 Tracking resumed by: ${extra.resumedBy || 'Admin'}`}
          </div>
        )}
      </div>
    </div>
  );
}
