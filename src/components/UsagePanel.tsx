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
} from 'lucide-react';
import type { AppUsageDoc, AppUsageEntry } from '../types';
import AppIcon from './AppIcon';
import { formatBytes, formatDuration } from '../lib/format';
import { dateKey } from '../hooks/useUsageData';
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

  const apps = useMemo(
    () =>
      [...(today?.apps ?? [])].sort((a, b) => b.seconds - a.seconds),
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
    const secondsByDay = new Map<string, number>();
    for (const doc of history) secondsByDay.set(doc.date, doc.totalSeconds);
    if (today) secondsByDay.set(today.date, today.totalSeconds);

    return Array.from({ length: 7 }, (_, index) => {
      const date = dateKey(subDays(new Date(), 6 - index));
      return { date, seconds: secondsByDay.get(date) ?? 0 };
    });
  }, [history, today]);

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

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Screen time / app usage */}
        <article className="surface-card p-5 sm:p-6 transition-all duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  Screen time & App usage
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap any app for Digital Wellbeing stats · today
                </p>
              </div>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
                aria-label="Refresh usage data"
                title="Refresh usage data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <div className="mt-5 flex items-end justify-between gap-2 sm:gap-4 overflow-hidden">
            <div className="min-w-0 flex-1">
              <p className="font-display text-3xl sm:text-4xl font-extrabold leading-none tracking-tight text-slate-900 dark:text-white truncate">
                {loading && !today ? '—' : formatDuration(today?.totalSeconds ?? 0)}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {today
                    ? `Across ${apps.length} app${apps.length === 1 ? '' : 's'}`
                    : 'No sync yet today'}
                </span>
                {today && (today.totalOpenCount || 0) > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                      <Smartphone className="w-3 h-3" />
                      {today.totalOpenCount} opens
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex h-16 items-end gap-1 sm:gap-1.5 shrink-0" aria-label="Seven day screen time trend">
              {trend.map((day) => {
                const isToday = day.date === dateKey(new Date());
                return (
                  <div
                    key={day.date}
                    className="flex w-4 sm:w-6 flex-col items-center gap-1"
                    title={`${formatDuration(day.seconds)} · ${day.date}`}
                  >
                    <div
                      className={`w-full rounded-t-[3px] transition-all ${
                        isToday ? 'bg-pink-600 dark:bg-pink-500' : 'bg-pink-200 dark:bg-pink-950/60'
                      }`}
                      style={{
                        height: `${Math.max(4, (day.seconds / maxTrend) * 52)}px`,
                      }}
                    />
                    <span className="text-[10px] font-medium uppercase text-slate-400">
                      {format(parseISO(day.date), 'EEEEE')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-2">
            {error ? (
              <p className="py-4 text-xs text-rose-500">{error}</p>
            ) : loading && !today ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-1/3 rounded" />
                      <div className="skeleton h-2 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : apps.length === 0 ? (
              <EmptyUsage
                title="No app usage yet today"
                detail="Digital Wellbeing usage rolls up continuously. Tap refresh above to force immediate sync."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleApps.map((app) => (
                  <button
                    key={app.packageName}
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="w-full flex items-center gap-3 py-3 px-2 rounded-xl text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                  >
                    <AppIcon
                      packageName={app.packageName}
                      appLabel={app.label}
                      className="w-9 h-9 rounded-xl flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                          {app.label || app.packageName}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {formatDuration(app.seconds)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-indigo-500"
                            style={{
                              width: `${Math.max(2, (app.seconds / maxAppSeconds) * 100)}%`,
                            }}
                          />
                        </div>
                        {app.openCount && app.openCount > 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {app.openCount} opens
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {apps.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllApps((value) => !value)}
                className="mt-3 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline inline-flex items-center gap-1"
              >
                {showAllApps ? 'Show less' : `Show all ${apps.length} apps`}
              </button>
            )}
          </div>
        </article>

        {/* Data usage: Separated Wi-Fi and Mobile */}
        <article className="surface-card p-5 sm:p-6 transition-all duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  Data tracking
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Wi-Fi & Mobile data tracked separately · today
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total data</span>
                <p className="font-display text-3xl sm:text-4xl font-extrabold leading-none tracking-tight text-slate-900 dark:text-white mt-1">
                  {loading && !today ? '—' : formatBytes(totalData)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" />
                  {formatBytes(today?.totalRxBytes ?? 0)}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <ArrowUpFromLine className="h-3.5 w-3.5 text-indigo-500" />
                  {formatBytes(today?.totalTxBytes ?? 0)}
                </span>
              </div>
            </div>

            {/* Separated Wi-Fi vs Mobile Bar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Wi-Fi</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatBytes(totalWifi)}
                </span>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Mobile Data</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatBytes(totalMobile)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-2">
            {error ? (
              <p className="py-4 text-xs text-rose-500">{error}</p>
            ) : loading && !today ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-1/3 rounded" />
                      <div className="skeleton h-2 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dataApps.length === 0 ? (
              <EmptyUsage
                title="No data usage recorded yet today"
                detail="Per-app Wi-Fi and Mobile statistics appear as network connections are used on the device."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleDataApps.map((app) => (
                  <button
                    key={app.packageName}
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="w-full flex items-center gap-3 py-3 px-2 rounded-xl text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                  >
                    <AppIcon
                      packageName={app.packageName}
                      appLabel={app.label}
                      className="w-9 h-9 rounded-xl flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {app.label || app.packageName}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {formatBytes(app.totalBytes)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                          style={{
                            width: `${Math.max(2, (app.totalBytes / maxAppBytes) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span className="inline-flex items-center gap-1 text-indigo-500">
                          <Wifi className="w-2.5 h-2.5" />
                          {formatBytes(app.wifiTotal)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-500">
                          <Radio className="w-2.5 h-2.5" />
                          {formatBytes(app.mobileTotal)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {dataApps.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllData((value) => !value)}
                className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
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
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
        {detail}
      </p>
    </div>
  );
}
