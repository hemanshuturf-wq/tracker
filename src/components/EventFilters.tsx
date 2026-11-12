import { useState, useRef, useEffect, useMemo, memo } from 'react';
import type { EventType, TrackerEvent } from '../types';
import {
  ChevronDown,
  X,
  Search,
  SlidersHorizontal,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface EventFiltersProps {
  filters: {
    eventTypes: EventType[];
    appLabel: string | null;
    dateRange: 'today' | 'yesterday' | '7d' | '30d' | 'all';
    search: string;
  };
  onChange: (filters: Partial<EventFiltersProps['filters']>) => void;
  events: TrackerEvent[];
}

const EVENT_TYPE_GROUPS = {
  Sessions: ['APP_SESSION_START', 'APP_SESSION_END'] as EventType[],
  Notifications: ['NOTIFICATION_POSTED'] as EventType[],
  'Calls & SMS': ['CALL_LOG', 'SMS_RECEIVED', 'SMS_SENT'] as EventType[],
  Packages: ['PACKAGE_ADDED', 'PACKAGE_REMOVED', 'PACKAGE_UPDATED'] as EventType[],
  System: ['INVENTORY_SNAPSHOT', 'DEVICE_BOOT', 'ACCESSIBILITY_EVENT'] as EventType[],
};

function EventFiltersComponent({
  filters,
  onChange,
  events,
}: EventFiltersProps) {
  const [showTypes, setShowTypes] = useState(false);
  const [showApps, setShowApps] = useState(false);

  const typesRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);

  const uniqueApps = useMemo(() => {
    return Array.from(
      new Set(
        events.map((e) => e.appLabel).filter((v): v is string => Boolean(v)),
      ),
    ).sort();
  }, [events]);

  const toggleEventType = (type: EventType) => {
    const next = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter((t) => t !== type)
      : [...filters.eventTypes, type];
    onChange({ eventTypes: next });
  };

  const toggleGroup = (groupTypes: EventType[]) => {
    const allSelected = groupTypes.every((t) => filters.eventTypes.includes(t));
    const next = allSelected
      ? filters.eventTypes.filter((t) => !groupTypes.includes(t))
      : [...new Set([...filters.eventTypes, ...groupTypes])];
    onChange({ eventTypes: next });
  };

  const isGroupSelected = (groupTypes: EventType[]) =>
    groupTypes.length > 0 &&
    groupTypes.every((t) => filters.eventTypes.includes(t));

  const hasActiveFilters =
    filters.eventTypes.length > 0 ||
    filters.appLabel !== null ||
    filters.dateRange !== 'today' ||
    filters.search !== '';

  const clearAllFilters = () => {
    onChange({
      eventTypes: [],
      appLabel: null,
      dateRange: 'today',
      search: '',
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typesRef.current && !typesRef.current.contains(e.target as Node)) {
        setShowTypes(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setShowApps(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#96918a]" />
          <input
            type="text"
            placeholder="Search activity, notifications, apps…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full rounded-xl border border-[#ebdce3] bg-white py-2 pl-9 pr-8 text-xs text-[#1d1b18] placeholder-[#96918a] transition-colors focus:border-[#ff4081] focus:outline-none"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#96918a] hover:bg-[#fff0f5] hover:text-[#c2185b]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter dropdowns and date range */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Event types */}
          <div className="relative" ref={typesRef}>
            <button
              type="button"
              onClick={() => setShowTypes(!showTypes)}
              className={clsx(
                'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors',
                filters.eventTypes.length > 0
                  ? 'border-[#ff80ab] bg-[#fff0f5] text-[#c2185b]'
                  : 'border-[#ebdce3] bg-white text-[#6e6a63] hover:bg-[#faf8f9]',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                {filters.eventTypes.length === 0
                  ? 'All types'
                  : `${filters.eventTypes.length} type${filters.eventTypes.length > 1 ? 's' : ''}`}
              </span>
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform',
                  showTypes && 'rotate-180',
                )}
              />
            </button>

            {showTypes && (
              <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-slide-down-fade rounded-2xl border border-[#ebdce3] bg-white p-3 shadow-[0_24px_60px_-24px_rgba(194,24,91,0.25)]">
                <div className="mb-2 flex items-center justify-between border-b border-[#fdf0f4] pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#96918a]">
                    Event types
                  </span>
                  {filters.eventTypes.length > 0 && (
                    <button
                      onClick={() => onChange({ eventTypes: [] })}
                      className="text-[11px] font-medium text-[#c2185b] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
                  {Object.entries(EVENT_TYPE_GROUPS).map(([group, types]) => {
                    const isSelected = isGroupSelected(types);
                    return (
                      <div key={group} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(types)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs font-semibold text-[#1d1b18] hover:bg-[#fff0f5]"
                        >
                          <span>{group}</span>
                          <span
                            className={clsx(
                              'text-[10px] font-medium',
                              isSelected ? 'text-[#c2185b]' : 'text-[#96918a]',
                            )}
                          >
                            {isSelected ? 'Selected' : 'Select all'}
                          </span>
                        </button>
                        <div className="pl-2 space-y-0.5">
                          {types.map((type) => {
                            const active = filters.eventTypes.includes(type);
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => toggleEventType(type)}
                                className={clsx(
                                  'flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] transition-colors',
                                  active
                                    ? 'bg-[#fff0f5] font-medium text-[#c2185b]'
                                    : 'text-[#6e6a63] hover:bg-[#faf8f9]',
                                )}
                              >
                                <span>{type.replace(/_/g, ' ').toLowerCase()}</span>
                                {active && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#c2185b]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Apps filter */}
          <div className="relative" ref={appsRef}>
            <button
              type="button"
              onClick={() => setShowApps(!showApps)}
              className={clsx(
                'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors',
                filters.appLabel
                  ? 'border-[#ff80ab] bg-[#fff0f5] text-[#c2185b]'
                  : 'border-[#ebdce3] bg-white text-[#6e6a63] hover:bg-[#faf8f9]',
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">
                {filters.appLabel || 'All apps'}
              </span>
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform',
                  showApps && 'rotate-180',
                )}
              />
            </button>

            {showApps && (
              <div className="absolute left-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] animate-slide-down-fade rounded-2xl border border-[#ebdce3] bg-white p-2 shadow-[0_24px_60px_-24px_rgba(194,24,91,0.25)]">
                <div className="mb-1 flex items-center justify-between border-b border-[#fdf0f4] px-2 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#96918a]">
                    Apps
                  </span>
                  {filters.appLabel && (
                    <button
                      onClick={() => {
                        onChange({ appLabel: null });
                        setShowApps(false);
                      }}
                      className="text-[11px] font-medium text-[#c2185b] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-[250px] space-y-0.5 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ appLabel: null });
                      setShowApps(false);
                    }}
                    className={clsx(
                      'w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium',
                      filters.appLabel === null
                        ? 'bg-[#fff0f5] font-semibold text-[#c2185b]'
                        : 'text-[#6e6a63] hover:bg-[#faf8f9]',
                    )}
                  >
                    All applications
                  </button>

                  {uniqueApps.map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => {
                        onChange({ appLabel: app });
                        setShowApps(false);
                      }}
                      className={clsx(
                        'w-full truncate rounded-lg px-2 py-1.5 text-left text-xs',
                        filters.appLabel === app
                          ? 'bg-[#fff0f5] font-semibold text-[#c2185b]'
                          : 'text-[#6e6a63] hover:bg-[#faf8f9]',
                      )}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date range segmented buttons */}
          <div className="flex items-center gap-0.5 rounded-xl border border-[#ebdce3] bg-white p-0.5">
            {(['today', 'yesterday', '7d', 'all'] as const).map((range) => {
              const labelMap = {
                today: 'Today 🌸',
                yesterday: 'Yesterday 📅',
                '7d': '7D',
                all: 'All Time',
              };
              const isActive = filters.dateRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => onChange({ dateRange: range })}
                  className={clsx(
                    'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
                    isActive
                      ? 'bg-[#c2185b] text-white shadow-2xs'
                      : 'text-[#6e6a63] hover:bg-[#fff0f5] hover:text-[#c2185b]',
                  )}
                >
                  {labelMap[range]}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-xl border border-transparent px-2 py-1.5 text-xs text-[#96918a] hover:bg-[#fef3f2] hover:text-[#b42318] transition-colors"
              title="Reset to Today"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const EventFilters = memo(EventFiltersComponent);
