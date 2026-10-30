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
    <div className="sticky top-[68px] z-30 -mx-3 mb-4 border-b border-[#e7e3db] bg-[#f6f5f2]/95 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-2.5">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96918a]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search activity, apps, notifications…"
            className="input-field py-2.5 pl-10 pr-10 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#96918a] hover:bg-[#f3f1ec] hover:text-[#1d1b18]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={typesRef}>
              <button
                type="button"
                onClick={() => {
                  setShowTypes(!showTypes);
                  setShowApps(false);
                }}
                className={clsx(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  showTypes || filters.eventTypes.length > 0
                    ? 'border-[#bcd6cb] bg-[#e9f1ed] text-[#1f5c4a]'
                    : 'border-[#d8d3c8] bg-white text-[#6e6a63] hover:border-[#c9c3b6] hover:text-[#1d1b18]',
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Categories</span>
                {filters.eventTypes.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1f5c4a] text-[9px] font-semibold text-white">
                    {filters.eventTypes.length}
                  </span>
                )}
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 transition-transform',
                    showTypes && 'rotate-180',
                  )}
                />
              </button>

              {showTypes && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 animate-slide-down-fade rounded-2xl border border-[#e7e3db] bg-white p-2.5 shadow-[0_24px_60px_-24px_rgba(29,27,24,0.35)]">
                  <div className="mb-2 flex items-center justify-between border-b border-[#f0eee8] px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#96918a]">
                      Categories
                    </span>
                    {filters.eventTypes.length > 0 && (
                      <button
                        onClick={() => onChange({ eventTypes: [] })}
                        className="text-[11px] font-medium text-[#1f5c4a] hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
                    {Object.entries(EVENT_TYPE_GROUPS).map(([groupLabel, types]) => {
                      const selected = isGroupSelected(types);
                      return (
                        <div
                          key={groupLabel}
                          className="rounded-xl border border-[#f0eee8] bg-[#faf9f7] p-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => toggleGroup(types)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold text-[#3f3b35] hover:bg-white"
                          >
                            <span>{groupLabel}</span>
                            <span className="font-mono text-[10px] text-[#96918a]">
                              {selected ? 'All' : types.length}
                            </span>
                          </button>

                          <div className="ml-2 mt-1 space-y-0.5 border-l border-[#e7e3db] pl-3">
                            {types.map((type) => {
                              const isChecked = filters.eventTypes.includes(type);
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => toggleEventType(type)}
                                  className={clsx(
                                    'flex w-full items-center justify-between rounded-md px-2 py-1 font-mono text-[10.5px]',
                                    isChecked
                                      ? 'bg-[#e9f1ed] font-semibold text-[#1f5c4a]'
                                      : 'text-[#6e6a63] hover:bg-white hover:text-[#1d1b18]',
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

            <div className="relative" ref={appsRef}>
              <button
                type="button"
                onClick={() => {
                  setShowApps(!showApps);
                  setShowTypes(false);
                }}
                className={clsx(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  showApps || filters.appLabel !== null
                    ? 'border-[#c7d7ea] bg-[#eef4fb] text-[#2f5d8a]'
                    : 'border-[#d8d3c8] bg-white text-[#6e6a63] hover:border-[#c9c3b6] hover:text-[#1d1b18]',
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
                <div className="absolute left-0 top-full z-50 mt-2 w-60 animate-slide-down-fade rounded-2xl border border-[#e7e3db] bg-white p-2 shadow-[0_24px_60px_-24px_rgba(29,27,24,0.35)]">
                  <div className="mb-1 flex items-center justify-between border-b border-[#f0eee8] px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#96918a]">
                      Apps
                    </span>
                    {filters.appLabel && (
                      <button
                        onClick={() => {
                          onChange({ appLabel: null });
                          setShowApps(false);
                        }}
                        className="text-[11px] font-medium text-[#2f5d8a] hover:underline"
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
                          ? 'bg-[#eef4fb] font-semibold text-[#2f5d8a]'
                          : 'text-[#6e6a63] hover:bg-[#faf9f7]',
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
                            ? 'bg-[#eef4fb] font-semibold text-[#2f5d8a]'
                            : 'text-[#6e6a63] hover:bg-[#faf9f7]',
                        )}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-0.5 rounded-xl border border-[#e7e3db] bg-white p-0.5">
              {(['all', 'today', '7d', '30d'] as const).map((range) => {
                const labelMap = { all: 'All', today: 'Today', '7d': '7D', '30d': '30D' };
                const isActive = filters.dateRange === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => onChange({ dateRange: range })}
                    className={clsx(
                      'rounded-[9px] px-2.5 py-1 text-[11px] font-medium',
                      isActive
                        ? 'bg-[#1d1b18] text-white shadow-sm'
                        : 'text-[#6e6a63] hover:bg-[#f3f1ec]',
                    )}
                  >
                    {labelMap[range]}
                  </button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-2.5 py-1 text-[11px] font-medium text-[#b42318] hover:bg-[#fee4e2]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(EventFiltersComponent);
