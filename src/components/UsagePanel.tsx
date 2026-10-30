import { useMemo, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Clock3,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import type { AppUsageDoc } from '../types';
import AppIcon from './AppIcon';
import { formatBytes, formatDuration } from '../lib/format';
import { dateKey } from '../hooks/useUsageData';

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

  const totalData =
    (today?.totalRxBytes ?? 0) + (today?.totalTxBytes ?? 0);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {/* Screen time / app usage */}
      <article className="surface-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f1ed] text-[#1f5c4a]">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                App usage
              </h2>
              <p className="text-xs text-[#6e6a63]">
                Screen time by application · today
              </p>
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg p-1.5 text-[#96918a] transition-colors hover:bg-[#f3f1ec] hover:text-[#1d1b18]"
              aria-label="Refresh usage data"
              title="Refresh usage data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-4xl leading-none tracking-tight">
              {loading && !today ? '—' : formatDuration(today?.totalSeconds ?? 0)}
            </p>
            <p className="mt-1.5 text-xs text-[#96918a]">
              {today
                ? `Across ${apps.length} app${apps.length === 1 ? '' : 's'}`
                : 'No sync yet today'}
            </p>
          </div>

          <div className="flex h-16 items-end gap-1.5" aria-label="Seven day screen time trend">
            {trend.map((day) => {
              const isToday = day.date === dateKey(new Date());
              return (
                <div
                  key={day.date}
                  className="flex w-6 flex-col items-center gap-1"
                  title={`${formatDuration(day.seconds)} · ${day.date}`}
                >
                  <div
                    className={`w-full rounded-t-[3px] ${
                      isToday ? 'bg-[#1f5c4a]' : 'bg-[#d8e8e1]'
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

        <div className="mt-5 border-t border-[#efede7] pt-2">
          {error ? (
            <p className="py-4 text-xs text-[#b42318]">{error}</p>
          ) : loading && !today ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-2.5 w-1/3 rounded" />
                    <div className="skeleton h-1.5 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : apps.length === 0 ? (
            <EmptyUsage
              title="No app usage yet today"
              detail="Usage rolls up from the phone every 10 minutes. Make sure Usage access is enabled on the device."
            />
          ) : (
            <div className="divide-y divide-[#f3f1ec]">
              {visibleApps.map((app) => (
                <div key={app.packageName} className="flex items-center gap-3 py-2.5">
                  <AppIcon
                    packageName={app.packageName}
                    appLabel={app.label}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-medium">
                        {app.label || app.packageName}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-[#6e6a63]">
                        {formatDuration(app.seconds)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#f0eee8]">
                      <div
                        className="h-full rounded-full bg-[#1f5c4a]"
                        style={{
                          width: `${Math.max(2, (app.seconds / maxAppSeconds) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {apps.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllApps((value) => !value)}
              className="mt-2 text-xs font-medium text-[#1f5c4a] hover:underline"
            >
              {showAllApps ? 'Show less' : `Show all ${apps.length} apps`}
            </button>
          )}
        </div>
      </article>

      {/* Data usage */}
      <article className="surface-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4fb] text-[#2f5d8a]">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                Data usage
              </h2>
              <p className="text-xs text-[#6e6a63]">
                Wi-Fi + mobile data · today
              </p>
            </div>
          </div>
          <BarChart3 className="h-4 w-4 text-[#c9c3b6]" />
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-4xl leading-none tracking-tight">
              {loading && !today ? '—' : formatBytes(totalData)}
            </p>
            <p className="mt-1.5 text-xs text-[#96918a]">
              {today
                ? `Across ${dataApps.length} app${dataApps.length === 1 ? '' : 's'}`
                : 'No sync yet today'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6e6a63]">
            <span className="inline-flex items-center gap-1">
              <ArrowDownToLine className="h-3 w-3 text-[#2f5d8a]" />
              {formatBytes(today?.totalRxBytes ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowUpFromLine className="h-3 w-3 text-[#b54708]" />
              {formatBytes(today?.totalTxBytes ?? 0)}
            </span>
          </div>
        </div>

        <div className="mt-5 border-t border-[#efede7] pt-2">
          {error ? (
            <p className="py-4 text-xs text-[#b42318]">{error}</p>
          ) : loading && !today ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-2.5 w-1/3 rounded" />
                    <div className="skeleton h-1.5 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : dataApps.length === 0 ? (
            <EmptyUsage
              title="No data usage yet today"
              detail="Network usage is measured from the phone's NetworkStats service. It appears after the next sync."
            />
          ) : (
            <div className="divide-y divide-[#f3f1ec]">
              {visibleDataApps.map((app) => (
                <div key={app.packageName} className="flex items-center gap-3 py-2.5">
                  <AppIcon
                    packageName={app.packageName}
                    appLabel={app.label}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-medium">
                        {app.label || app.packageName}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-[#6e6a63]">
                        {formatBytes(app.totalBytes)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#f0eee8]">
                      <div
                        className="h-full rounded-full bg-[#2f5d8a]"
                        style={{
                          width: `${Math.max(2, (app.totalBytes / maxAppBytes) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[#96918a]">
                      ↓ {formatBytes(app.rxBytes)} · ↑ {formatBytes(app.txBytes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dataApps.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllData((value) => !value)}
              className="mt-2 text-xs font-medium text-[#2f5d8a] hover:underline"
            >
              {showAllData ? 'Show less' : `Show all ${dataApps.length} apps`}
            </button>
          )}
        </div>
      </article>
    </section>
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
