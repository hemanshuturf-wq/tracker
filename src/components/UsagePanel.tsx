import { useMemo, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Clock3,
  RefreshCw,
  Wifi,
  Radio,
  ChevronRight,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { AppUsageDoc, AppUsageEntry } from '../types';
import AppIcon from './AppIcon';
import { formatBytes, formatDuration } from '../lib/format';
import { dateKey, useLocalDayKey } from '../hooks/useUsageData';
import { AppDetailModal } from './AppDetailModal';

interface UsagePanelProps {
  today: AppUsageDoc | null;
  history: AppUsageDoc[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export default function UsagePanel({
  today,
  history,
  loading,
  error,
  onRefresh,
}: UsagePanelProps) {
  const [showAllApps, setShowAllApps] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppUsageEntry | null>(null);
  const localDayKey = useLocalDayKey();

  const apps = useMemo(
    () =>
      [...(today?.apps ?? [])]
        .filter((a) => a.seconds > 0 || (a.openCount || 0) > 0)
        .sort((a, b) => b.seconds - a.seconds),
    [today],
  );

  const dataApps = useMemo(
    () =>
      [...(today?.apps ?? [])]
        .map((app) => ({
          ...app,
          wifiTotal: (app.wifiRxBytes || 0) + (app.wifiTxBytes || 0),
          mobileTotal: (app.mobileRxBytes || 0) + (app.mobileTxBytes || 0),
          totalBytes: (app.rxBytes || 0) + (app.txBytes || 0),
        }))
        .filter((app) => app.totalBytes > 0)
        .sort((a, b) => b.totalBytes - a.totalBytes),
    [today],
  );

  const trend = useMemo(() => {
    void localDayKey;
    const secondsByDay = new Map<string, number>();
    for (const doc of history) secondsByDay.set(doc.date, doc.totalSeconds);
    if (today) secondsByDay.set(today.date, today.totalSeconds);

    return Array.from({ length: 7 }, (_, index) => {
      const date = dateKey(subDays(new Date(), 6 - index));
      return { date, seconds: secondsByDay.get(date) ?? 0 };
    });
  }, [history, today, localDayKey]);

  const maxTrend = Math.max(1, ...trend.map((day) => day.seconds));
  const maxAppSeconds = Math.max(1, ...apps.map((app) => app.seconds));
  const maxAppBytes = Math.max(1, ...dataApps.map((app) => app.totalBytes));

  const visibleApps = showAllApps ? apps : apps.slice(0, 6);
  const visibleDataApps = showAllData ? dataApps : dataApps.slice(0, 6);

  const totalWifi =
    (today?.totalWifiRxBytes ?? 0) + (today?.totalWifiTxBytes ?? 0);
  const totalMobile =
    (today?.totalMobileRxBytes ?? 0) + (today?.totalMobileTxBytes ?? 0);
  const totalData =
    (today?.totalRxBytes ?? 0) + (today?.totalTxBytes ?? 0);

  const hasSeparatedData = totalWifi + totalMobile > 0;

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2 w-full max-w-full min-w-0">
        {/* Screen time / app usage */}
        <article className="surface-card p-4 sm:p-6 border border-[#f0e7eb] rounded-[22px] bg-white shadow-xs w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0f5] text-[#c2185b]">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1b18] flex items-center gap-1.5">
                  Screen time & App usage
                  <span className="text-xs text-[#c2185b]">🌸</span>
                </h2>
                <p className="text-xs text-[#6e6a63]">
                  Digital Wellbeing · strictly from 12 AM today
                </p>
              </div>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-xl p-1.5 text-[#96918a] transition-colors hover:bg-[#fff0f5] hover:text-[#c2185b]"
                aria-label="Refresh usage data"
                title="Refresh usage data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <div className="mt-5 flex items-end justify-between gap-2 sm:gap-4 overflow-hidden">
            <div className="min-w-0 flex-1">
              <p className="font-display text-3xl sm:text-4xl leading-none tracking-tight text-[#1d1b18] truncate">
                {loading && !today ? '—' : formatDuration(today?.totalSeconds ?? 0)}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-[#96918a]">
                <span>
                  {today
                    ? `Across ${apps.length} app${apps.length === 1 ? '' : 's'}`
                    : 'No sync yet today'}
                </span>
                {today && (today.totalOpenCount || 0) > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-[#c2185b] font-medium">
                      <Smartphone className="w-3 h-3" />
                      {today.totalOpenCount} opens
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex h-16 items-end gap-1 sm:gap-1.5 shrink-0" aria-label="Seven day screen time trend">
              {trend.map((day) => {
                const isToday = day.date === localDayKey;
                return (
                  <div
                    key={day.date}
                    className="flex w-4 sm:w-6 flex-col items-center gap-1"
                    title={`${formatDuration(day.seconds)} · ${day.date}`}
                  >
                    <div
                      className={`w-full rounded-t-[4px] ${
                        isToday ? 'bg-[#ff4081]' : 'bg-[#ffd3e2]'
                      }`}
                      style={{
                        height: `${Math.max(4, (day.seconds / maxTrend) * 52)}px`,
                      }}
                    />
                    <span className="text-[9px] font-medium uppercase text-[#96918a]">
                      {format(parseISO(day.date), 'EEEEE')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-[#f7eef2] pt-2">
            {error ? (
              <p className="py-4 text-xs text-[#b42318]">{error}</p>
            ) : loading && !today ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-8 w-8 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                      <div className="skeleton h-1.5 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : apps.length === 0 ? (
              <EmptyUsage
                title="No app usage recorded yet today"
                detail="Activity resets at 12 AM. New app sessions appear as apps are opened on the phone."
              />
            ) : (
              <div className="divide-y divide-[#fdf8f9]">
                {visibleApps.map((app) => (
                  <button
                    key={app.packageName}
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl text-left transition-colors hover:bg-[#fff9fa] group"
                  >
                    <AppIcon
                      packageName={app.packageName}
                      appLabel={app.label}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-[#1d1b18] group-hover:text-[#c2185b] transition-colors">
                          {app.label || app.packageName}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[#6e6a63]">
                          {formatDuration(app.seconds)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[#faeff3]">
                          <div
                            className="h-full rounded-full bg-[#ff4081]"
                            style={{
                              width: `${Math.max(2, (app.seconds / maxAppSeconds) * 100)}%`,
                            }}
                          />
                        </div>
                        {app.openCount && app.openCount > 0 ? (
                          <span className="text-[10px] text-[#96918a] font-mono">
                            {app.openCount} opens
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#e0cfd6] group-hover:text-[#c2185b] transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {apps.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllApps((value) => !value)}
                className="mt-2 text-xs font-medium text-[#c2185b] hover:underline inline-flex items-center gap-1"
              >
                {showAllApps ? 'Show less' : `Show all ${apps.length} apps`}
              </button>
            )}
          </div>
        </article>

        {/* Data tracking: Separated Wi-Fi and Mobile */}
        <article className="surface-card p-4 sm:p-6 border border-[#f0e7eb] rounded-[22px] bg-white shadow-xs w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2f5d8a]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1b18] flex items-center gap-1.5">
                  Data usage
                  <Sparkles className="w-3.5 h-3.5 text-[#ff7597]" />
                </h2>
                <p className="text-xs text-[#6e6a63]">
                  {hasSeparatedData
                    ? 'Wi-Fi & Mobile data tracked separately · today'
                    : 'Total device data transferred · today'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-display text-4xl leading-none tracking-tight text-[#1d1b18]">
                  {loading && !today ? '—' : formatBytes(totalData)}
                </p>
                <p className="mt-1 text-xs text-[#96918a]">
                  Total data transferred today (since 12 AM)
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6e6a63] font-mono">
                <span className="inline-flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3 text-[#2f5d8a]" />
                  {formatBytes(today?.totalRxBytes ?? 0)}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <ArrowUpFromLine className="h-3 w-3 text-[#b54708]" />
                  {formatBytes(today?.totalTxBytes ?? 0)}
                </span>
              </div>
            </div>

            {/* Separated Wi-Fi vs Mobile Inset Cards */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {hasSeparatedData ? (
                <>
                  <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e8edf5] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#1d1b18]">
                      <Wifi className="w-3.5 h-3.5 text-[#2f5d8a]" />
                      <span>Wi-Fi</span>
                    </div>
                    <span className="text-xs font-bold text-[#1d1b18] font-mono">
                      {formatBytes(totalWifi)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#fcf8fa] border border-[#f5e9ee] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#1d1b18]">
                      <Radio className="w-3.5 h-3.5 text-[#c2185b]" />
                      <span>Mobile</span>
                    </div>
                    <span className="text-xs font-bold text-[#1d1b18] font-mono">
                      {formatBytes(totalMobile)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e8edf5] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#1d1b18]">
                      <ArrowDownToLine className="w-3.5 h-3.5 text-[#2f5d8a]" />
                      <span>Download</span>
                    </div>
                    <span className="text-xs font-bold text-[#1d1b18] font-mono">
                      {formatBytes(today?.totalRxBytes ?? 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#fffaf5] border border-[#faeee3] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#1d1b18]">
                      <ArrowUpFromLine className="w-3.5 h-3.5 text-[#b54708]" />
                      <span>Upload</span>
                    </div>
                    <span className="text-xs font-bold text-[#1d1b18] font-mono">
                      {formatBytes(today?.totalTxBytes ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-[#f7eef2] pt-2">
            {error ? (
              <p className="py-4 text-xs text-[#b42318]">{error}</p>
            ) : loading && !today ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-8 w-8 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                      <div className="skeleton h-1.5 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dataApps.length === 0 ? (
              <EmptyUsage
                title="No data usage recorded yet today"
                detail="Per-app network statistics appear as connections are used on the device."
              />
            ) : (
              <div className="divide-y divide-[#fdf8f9]">
                {visibleDataApps.map((app) => (
                  <button
                    key={app.packageName}
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl text-left transition-colors hover:bg-[#fff9fa] group"
                  >
                    <AppIcon
                      packageName={app.packageName}
                      appLabel={app.label}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-[#1d1b18] group-hover:text-[#2f5d8a] transition-colors">
                          {app.label || app.packageName}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[#6e6a63]">
                          {formatBytes(app.totalBytes)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0eee8]">
                        <div
                          className="h-full rounded-full bg-[#2f5d8a]"
                          style={{
                            width: `${Math.max(2, (app.totalBytes / maxAppBytes) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-[#96918a] font-mono">
                        {app.wifiTotal > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#2f5d8a]">
                            <Wifi className="w-2.5 h-2.5" />
                            {formatBytes(app.wifiTotal)}
                          </span>
                        )}
                        {app.mobileTotal > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#c2185b]">
                            <Radio className="w-2.5 h-2.5" />
                            {formatBytes(app.mobileTotal)}
                          </span>
                        )}
                        {app.wifiTotal === 0 && app.mobileTotal === 0 && app.totalBytes > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#6e6a63]">
                            ↓ {formatBytes(app.rxBytes || 0)} · ↑ {formatBytes(app.txBytes || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#e0cfd6] group-hover:text-[#2f5d8a] transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {dataApps.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllData((value) => !value)}
                className="mt-2 text-xs font-medium text-[#2f5d8a] hover:underline inline-flex items-center gap-1"
              >
                {showAllData ? 'Show less' : `Show all ${dataApps.length} apps`}
              </button>
            )}
          </div>
        </article>
      </section>

      {/* Digital Wellbeing Detail Modal */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </>
  );
}

function EmptyUsage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm font-medium text-[#6e6a63]">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#96918a]">
        {detail}
      </p>
    </div>
  );
}
