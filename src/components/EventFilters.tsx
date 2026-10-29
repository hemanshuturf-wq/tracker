import { useState, useRef, useEffect, useMemo, memo } from 'react';
import type { EventType, TrackerEvent } from '../types';
import {
  ChevronDown,
  X,
  Search,
  Filter,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

interface EventFiltersProps {
  filters: {
    eventTypes: EventType[];
    appLabel: string | null;
    dateRange: 'today' | '7d' | '30d' | 'all';
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
        events.map((e) => e.appLabel).filter((v): v is string => Boolean(v))
      )
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
    filters.dateRange !== 'all' ||
    filters.search !== '';

  const clearAllFilters = () => {
    onChange({
      eventTypes: [],
      appLabel: null,
      dateRange: 'all',
      search: '',
    });
    setShowTypes(false);
    setShowApps(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (showTypes && typesRef.current && !typesRef.current.contains(e.target as Node)) {
        setShowTypes(false);
      }
      if (showApps && appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setShowApps(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypes, showApps]);

  return (
    <div className="sticky top-16 z-30 py-2.5 mb-5 bg-[#080C14]/95 border-b border-white/[0.08]">
      <div className="flex flex-col gap-2.5">
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search events, apps, notifications…"
            className="w-full pl-10 pr-10 py-2 text-sm rounded-xl bg-[#0E1524] border border-white/[0.08] focus:border-cyan-500/50 text-white placeholder-slate-400 outline-none"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Event Types Dropdown */}
            <div className="relative" ref={typesRef}>
              <button
                type="button"
                onClick={() => {
                  setShowTypes(!showTypes);
                  setShowApps(false);
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer',
                  showTypes || filters.eventTypes.length > 0
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Categories</span>
                {filters.eventTypes.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-mono font-bold">
                    {filters.eventTypes.length}
                  </span>
                )}
                <ChevronDown
                  className={clsx(
                    'w-3 h-3 transition-transform',
                    showTypes && 'rotate-180'
                  )}
                />
              </button>

              {showTypes && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0E1524] rounded-2xl border border-white/[0.12] shadow-2xl p-2.5 z-50">
                  <div className="px-2 py-1 border-b border-white/[0.08] flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                      Categories
                    </span>
                    {filters.eventTypes.length > 0 && (
                      <button
                        onClick={() => onChange({ eventTypes: [] })}
                        className="text-xs text-cyan-400 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                    {Object.entries(EVENT_TYPE_GROUPS).map(([groupLabel, types]) => {
                      const selected = isGroupSelected(types);
                      return (
                        <div
                          key={groupLabel}
                          className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => toggleGroup(types)}
                            className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-white/[0.05] rounded-lg cursor-pointer"
                          >
                            <span>{groupLabel}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {selected ? '✓ All' : `${types.length}`}
                            </span>
                          </button>

                          <div className="mt-1 space-y-0.5 pl-3 border-l border-white/[0.06] ml-2">
                            {types.map((type) => {
                              const isChecked = filters.eventTypes.includes(type);
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => toggleEventType(type)}
                                  className={clsx(
                                    'w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-mono cursor-pointer',
                                    isChecked
                                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  )}
                                >
                                  <span>{type.replace(/_/g, ' ')}</span>
                                  {isChecked && <span>✓</span>}
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

            {/* App Filter Dropdown */}
            <div className="relative" ref={appsRef}>
              <button
                type="button"
                onClick={() => {
                  setShowApps(!showApps);
                  setShowTypes(false);
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer',
                  showApps || filters.appLabel !== null
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">
                  {filters.appLabel || 'All Apps'}
                </span>
                <ChevronDown
                  className={clsx(
                    'w-3 h-3 transition-transform',
                    showApps && 'rotate-180'
                  )}
                />
              </button>

              {showApps && (
                <div className="absolute top-full left-0 mt-2 w-60 bg-[#0E1524] rounded-2xl border border-white/[0.12] shadow-2xl p-2 z-50">
                  <div className="px-2 py-1 border-b border-white/[0.08] flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                      Select App
                    </span>
                    {filters.appLabel && (
                      <button
                        onClick={() => {
                          onChange({ appLabel: null });
                          setShowApps(false);
                        }}
                        className="text-xs text-emerald-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="max-h-[250px] overflow-y-auto pr-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ appLabel: null });
                        setShowApps(false);
                      }}
                      className={clsx(
                        'w-full px-2 py-1.5 rounded-lg text-left text-xs font-medium cursor-pointer',
                        filters.appLabel === null
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-white/[0.05]'
                      )}
                    >
                      All Applications
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
                          'w-full px-2 py-1.5 rounded-lg text-left text-xs truncate cursor-pointer',
                          filters.appLabel === app
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.05]'
                        )}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Range Tabs */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              {(['all', 'today', '7d', '30d'] as const).map((range) => {
                const labelMap = { all: 'All', today: 'Today', '7d': '7D', '30d': '30D' };
                const isActive = filters.dateRange === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => onChange({ dateRange: range })}
                    className={clsx(
                      'px-2 py-1 rounded-lg text-xs font-mono font-medium cursor-pointer',
                      isActive
                        ? 'bg-white/[0.12] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {labelMap[range]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Action */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-xl cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default memo(EventFiltersComponent);
