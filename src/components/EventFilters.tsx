import { useState, useRef, useEffect } from 'react';
import type { EventType, TrackerEvent } from '../types';
import { ChevronDown, X, Search, Filter, SlidersHorizontal } from 'lucide-react';

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
  Calls: ['CALL_LOG'] as EventType[],
  Packages: ['PACKAGE_ADDED', 'PACKAGE_REMOVED', 'PACKAGE_UPDATED'] as EventType[],
  System: ['INVENTORY_SNAPSHOT', 'DEVICE_BOOT', 'ACCESSIBILITY_EVENT'] as EventType[],
};

const GROUP_COLORS: Record<string, string> = {
  Sessions: 'var(--accent-blue)',
  Notifications: 'var(--accent-purple)',
  Calls: 'var(--accent-amber)',
  Packages: 'var(--accent-teal)',
  System: 'var(--accent-gray)',
};

export default function EventFilters({
  filters,
  onChange,
  events,
}: EventFiltersProps) {
  const [showTypes, setShowTypes] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const typesRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const uniqueApps = Array.from(
    new Set(events.map((e) => e.appLabel).filter((v): v is string => Boolean(v)))
  ).sort();

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
    groupTypes.length > 0 && groupTypes.every((t) => filters.eventTypes.includes(t));

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
    setShowDate(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (showTypes && typesRef.current && !typesRef.current.contains(e.target as Node)) setShowTypes(false);
      if (showApps && appsRef.current && !appsRef.current.contains(e.target as Node)) setShowApps(false);
      if (showDate && dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDate(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypes, showApps, showDate]);

  return (
    <div className="sticky top-14 z-40 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--border-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Search title, body, app, package…"
              className="input pl-10 pr-10"
            />
            {filters.search && (
              <button
                onClick={() => onChange({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={typesRef}>
              <button
                type="button"
                onClick={() => { setShowTypes(!showTypes); setShowApps(false); setShowDate(false); }}
                className={`btn-secondary px-4 py-2 flex items-center gap-2 ${showTypes ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10' : ''}`}
              >
                <Filter className="w-4 h-4" />
                <span className="font-medium">Types</span>
                {filters.eventTypes.length > 0 && (
                  <span className="badge bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                    {filters.eventTypes.length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showTypes ? 'rotate-180' : ''}`} />
              </button>

              {showTypes && (
                <div className="absolute top-full left-0 mt-2 w-64 glass-strong rounded-xl border shadow-xl animate-scale-in py-2 z-50" style={{ minWidth: '260px' }}>
                  <div className="px-3 py-2 border-b border-[var(--border-primary)] flex items-center justify-between">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Event Types</p>
                    {filters.eventTypes.length > 0 && (
                      <button
                        onClick={() => onChange({ eventTypes: [] })}
                        className="text-xs text-[var(--accent-green)] hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="p-2 space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin">
                    {Object.entries(EVENT_TYPE_GROUPS).map(([label, types]) => (
                      <div key={label} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(types)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-[var(--bg-hover)]"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[label] }} />
                            <span className="font-medium text-[var(--text-primary)]">{label}</span>
                          </span>
                          {isGroupSelected(types) && (
                            <svg className="w-4 h-4 text-[var(--accent-green)]" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <div className="pl-8 space-y-1 border-l border-[var(--border-primary)]/50 ml-4">
                          {types.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleEventType(type)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-sm transition-colors ${
                                filters.eventTypes.includes(type)
                                  ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                              }`}
                            >
                              <span>{type.replace(/_/g, ' ')}</span>
                              {filters.eventTypes.includes(type) && (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={appsRef}>
              <button
                type="button"
                onClick={() => { setShowApps(!showApps); setShowTypes(false); setShowDate(false); }}
                className={`btn-secondary px-4 py-2 flex items-center gap-2 min-w-[140px] ${showApps ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10' : ''}`}
              >
                <span className="font-medium truncate">{filters.appLabel || 'All apps'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showApps ? 'rotate-180' : ''}`} />
              </button>

              {showApps && (
                <div className="absolute top-full left-0 mt-2 glass-strong rounded-xl border shadow-xl animate-scale-in py-2 z-50" style={{ minWidth: '200px', maxWidth: '280px' }}>
                  <div className="px-3 py-2 border-b border-[var(--border-primary)] flex items-center justify-between">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Application</p>
                    {filters.appLabel && (
                      <button
                        onClick={() => { onChange({ appLabel: null }); setShowApps(false); }}
                        className="text-xs text-[var(--accent-green)] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="p-1 max-h-[280px] overflow-y-auto scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => { onChange({ appLabel: null }); setShowApps(false); }}
                      className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        filters.appLabel === null
                          ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      All apps
                    </button>
                    <div className="border-t border-[var(--border-primary)]/50 my-1" />
                    {uniqueApps.map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => { onChange({ appLabel: app }); setShowApps(false); }}
                        className={`w-full px-3 py-2 rounded-lg text-left text-sm truncate transition-colors ${
                          filters.appLabel === app
                            ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                    {uniqueApps.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">No apps in current view</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={dateRef}>
              <button
                type="button"
                onClick={() => { setShowDate(!showDate); setShowTypes(false); setShowApps(false); }}
                className={`btn-secondary px-4 py-2 flex items-center gap-2 ${showDate ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10' : ''}`}
              >
                <span className="font-medium capitalize">
                  {filters.dateRange === 'all' ? 'All time' : filters.dateRange === 'today' ? 'Today' : filters.dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDate ? 'rotate-180' : ''}`} />
              </button>

              {showDate && (
                <div className="absolute top-full left-0 mt-2 glass-strong rounded-xl border shadow-xl animate-scale-in py-1 z-50" style={{ minWidth: '160px' }}>
                  {(['all', 'today', '7d', '30d'] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => { onChange({ dateRange: range }); setShowDate(false); }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        filters.dateRange === range
                          ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {range === 'all' ? 'All time' : range === 'today' ? 'Today' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="btn-ghost px-4 py-2 flex items-center gap-2 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Clear filters</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}