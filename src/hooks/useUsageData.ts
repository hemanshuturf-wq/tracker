import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { db } from '../firebase';
import type { AppUsageDoc, AppUsageEntry, TrackerEvent } from '../types';

export interface UsageData {
  today: AppUsageDoc | null;
  yesterday: AppUsageDoc | null;
  history: AppUsageDoc[];
  todayEventCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getStartOfDayMs(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getEndOfDayMs(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Tracks the current local calendar day (`yyyy-MM-dd`) and automatically triggers
 * a rollover shortly after 12:00 AM local time (and on tab focus/visibility resume)
 * so open browser tabs never stay stuck on yesterday's date.
 */
export function useLocalDayKey(): string {
  const [dayKey, setDayKey] = useState(() => dateKey(new Date()));

  useEffect(() => {
    let timerId: number | undefined;

    const syncAndSchedule = () => {
      const now = new Date();
      const current = dateKey(now);
      setDayKey((prev) => (prev === current ? prev : current));

      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 250);
      const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
      window.clearTimeout(timerId);
      timerId = window.setTimeout(syncAndSchedule, Math.min(delay, 2_147_000_000));
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncAndSchedule();
      }
    };

    syncAndSchedule();
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  return dayKey;
}

function parseExtraJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function normalizeHourly(raw: unknown): number[] {
  const out = Array(24).fill(0) as number[];
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < 24 && i < raw.length; i++) {
    out[i] = Math.max(0, Number(raw[i]) || 0);
  }
  return out;
}

function sumHourlyUpTo(hourly: number[], maxHourInclusive: number): number {
  let sum = 0;
  for (let h = 0; h <= maxHourInclusive && h < hourly.length; h++) {
    sum += hourly[h] || 0;
  }
  return sum;
}

function toDoc(
  id: string,
  data: Record<string, unknown>,
  now: Date = new Date(),
): AppUsageDoc {
  const docDate = typeof data.date === 'string' ? data.date : id.slice(-10);
  const aggregatorVersion = Number(data.aggregatorVersion) || 1;
  const isTodayDoc = docDate === dateKey(now);
  const currentHour = now.getHours();
  const elapsedTodaySec = isTodayDoc
    ? Math.max(0, Math.floor((now.getTime() - getStartOfDayMs(now)) / 1000))
    : 86400;

  const rawApps = Array.isArray(data.apps) ? data.apps : [];
  const parsedApps = rawApps.map((item: Record<string, unknown>) => {
    const hourly = normalizeHourly(item.hourlySeconds);
    const cleanHourlySum = Math.min(
      elapsedTodaySec,
      sumHourlyUpTo(hourly, isTodayDoc ? currentHour : 23),
    );
    return {
      entry: {
        packageName: String(item.packageName || ''),
        label: String(item.label || item.packageName || 'App'),
        seconds: Math.max(0, Number(item.seconds) || 0),
        backgroundSeconds: Math.max(0, Number(item.backgroundSeconds) || 0),
        openCount: Math.max(0, Number(item.openCount) || 0),
        hourlySeconds: hourly,
        notificationCount: Math.max(0, Number(item.notificationCount) || 0),
        wifiRxBytes: Math.max(0, Number(item.wifiRxBytes) || 0),
        wifiTxBytes: Math.max(0, Number(item.wifiTxBytes) || 0),
        mobileRxBytes: Math.max(0, Number(item.mobileRxBytes) || 0),
        mobileTxBytes: Math.max(0, Number(item.mobileTxBytes) || 0),
        rxBytes: Math.max(0, Number(item.rxBytes) || 0),
        txBytes: Math.max(0, Number(item.txBytes) || 0),
      } satisfies AppUsageEntry,
      cleanHourlySum,
    };
  });

  const rawTotalSeconds = Math.max(0, Number(data.totalSeconds) || 0);
  const hasAnyHourly = parsedApps.some((p) => p.cleanHourlySum > 0);
  const exceedsWallClock =
    isTodayDoc &&
    (rawTotalSeconds > elapsedTodaySec + 60 ||
      parsedApps.some((p) => p.entry.seconds > elapsedTodaySec + 60));

  // Pre-v2 Android builds merged UTC INTERVAL_DAILY buckets (05:30 IST - 05:30 IST),
  // leaking yesterday's totals into `seconds` while `hourlySeconds` only came from local UsageEvents.
  const sanitizeWithHourly = aggregatorVersion < 2 && (hasAnyHourly || exceedsWallClock);

  const apps: AppUsageEntry[] = [];
  for (const { entry, cleanHourlySum } of parsedApps) {
    if (sanitizeWithHourly) {
      entry.seconds = cleanHourlySum;
    } else if (isTodayDoc) {
      entry.seconds = Math.min(entry.seconds, elapsedTodaySec);
    }
    if (
      sanitizeWithHourly &&
      entry.seconds === 0 &&
      (entry.openCount || 0) === 0 &&
      entry.rxBytes === 0 &&
      entry.txBytes === 0
    ) {
      continue;
    }
    apps.push(entry);
  }

  const totalWifiRx = Number(data.totalWifiRxBytes) || 0;
  const totalWifiTx = Number(data.totalWifiTxBytes) || 0;
  const totalMobileRx = Number(data.totalMobileRxBytes) || 0;
  const totalMobileTx = Number(data.totalMobileTxBytes) || 0;
  let totalRx = Number(data.totalRxBytes) || 0;
  let totalTx = Number(data.totalTxBytes) || 0;

  // If separated wifi/mobile are present and higher, attribute them
  if (totalWifiRx + totalMobileRx > totalRx) totalRx = totalWifiRx + totalMobileRx;
  if (totalWifiTx + totalMobileTx > totalTx) totalTx = totalWifiTx + totalMobileTx;

  const summedAppSeconds = apps.reduce((s, a) => s + a.seconds, 0);
  const totalSeconds = sanitizeWithHourly
    ? Math.min(elapsedTodaySec, summedAppSeconds)
    : Math.min(elapsedTodaySec, rawTotalSeconds || summedAppSeconds);
  const summedOpenCount = apps.reduce((s, a) => s + (a.openCount || 0), 0);
  const totalOpenCount = sanitizeWithHourly
    ? summedOpenCount
    : Number(data.totalOpenCount) || summedOpenCount;

  return {
    id,
    date: docDate,
    syncedByUid: typeof data.syncedByUid === 'string' ? data.syncedByUid : undefined,
    deviceId: typeof data.deviceId === 'string' ? data.deviceId : undefined,
    aggregatorVersion,
    apps,
    totalSeconds,
    totalBackgroundSeconds: Number(data.totalBackgroundSeconds) || apps.reduce((s, a) => s + (a.backgroundSeconds || 0), 0),
    totalOpenCount,
    totalWifiRxBytes: totalWifiRx,
    totalWifiTxBytes: totalWifiTx,
    totalMobileRxBytes: totalMobileRx,
    totalMobileTxBytes: totalMobileTx,
    totalRxBytes: totalRx,
    totalTxBytes: totalTx,
    updatedAt: data.updatedAt,
  };
}

/**
 * Robust Digital Wellbeing usage reader.
 * 1. Streams today's and recent daily rollups directly from Firestore `app_usage`.
 * 2. Independently queries today's session events directly from `events` collection,
 *    strictly bounded between 00:00:00 local midnight and now (NEVER counting before 12 AM).
 * 3. Guarantees that app usage stats are immediately accurate and NEVER depend
 *    on pagination of the main timeline.
 */
export function useUsageData(
  partnerUid: string | null,
  recentEvents?: TrackerEvent[],
): UsageData {
  const [rawToday, setRawToday] = useState<AppUsageDoc | null>(null);
  const [rawYesterday, setRawYesterday] = useState<AppUsageDoc | null>(null);
  const [history, setHistory] = useState<AppUsageDoc[]>([]);
  const [liveTodaySessions, setLiveTodaySessions] = useState<TrackerEvent[]>([]);
  const [todayEventCount, setTodayEventCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const localDayKey = useLocalDayKey();

  const { todayDateStr, yesterdayDateStr, startOfTodayMs } = useMemo(() => {
    const now = new Date();
    return {
      todayDateStr: dateKey(now),
      yesterdayDateStr: dateKey(subDays(now, 1)),
      startOfTodayMs: getStartOfDayMs(now),
    };
  }, [localDayKey, refreshKey]);

  useEffect(() => {
    setRawToday(null);
    setRawYesterday(null);
    setLiveTodaySessions([]);
    setTodayEventCount(0);

    if (!partnerUid) {
      setHistory([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    // 1. Direct real-time stream of today's rollup document
    const todayDocRef = doc(db, 'app_usage', `${partnerUid}_${todayDateStr}`);
    const unsubscribeToday = onSnapshot(
      todayDocRef,
      (snapshot) => {
        if (!active) return;
        if (snapshot.exists()) {
          setRawToday(toDoc(snapshot.id, snapshot.data() as Record<string, unknown>));
        } else {
          setRawToday(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Today rollup stream warn:', err);
      },
    );

    // 2. Query recent app_usage docs for this partner (no composite index needed)
    const usageQuery = query(
      collection(db, 'app_usage'),
      where('syncedByUid', '==', partnerUid),
      limit(14),
    );

    const unsubscribeRollups = onSnapshot(
      usageQuery,
      (snapshot) => {
        if (!active) return;
        const docs = snapshot.docs.map((d) => toDoc(d.id, d.data() as Record<string, unknown>));
        docs.sort((a, b) => b.date.localeCompare(a.date));

        const matchedToday = docs.find((d) => d.date === todayDateStr);
        if (matchedToday) {
          setRawToday(matchedToday);
        }
        const matchedYesterday = docs.find((d) => d.date === yesterdayDateStr);
        if (matchedYesterday) {
          setRawYesterday(matchedYesterday);
        }

        const hist = docs.filter((d) => d.date !== todayDateStr);
        setHistory(hist);
        setLoading(false);
      },
      (err) => {
        console.warn('Usage query stream warn:', err);
        if (active) setLoading(false);
      },
    );

    // 3. Fallback: Fetch specific yesterday doc if not caught by query
    getDoc(doc(db, 'app_usage', `${partnerUid}_${yesterdayDateStr}`))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setRawYesterday((prev) => prev ?? toDoc(snap.id, snap.data() as Record<string, unknown>));
        }
      })
      .catch(() => {});

    // 4. Query all today's events directly using the composite index (syncedByUid, observedAtUtc DESC)
    // strictly bounded from local midnight (startOfTodayMs).
    // This guarantees screen time is 100% complete and accurate immediately on load,
    // completely independent of timeline pagination.
    const todayEventsStream = query(
      collection(db, 'events'),
      where('syncedByUid', '==', partnerUid),
      where('observedAtUtc', '>=', startOfTodayMs),
      orderBy('observedAtUtc', 'desc'),
    );

    const unsubscribeTodayEvents = onSnapshot(
      todayEventsStream,
      (snapshot) => {
        if (!active) return;
        const todaySessions: TrackerEvent[] = [];
        let count = 0;
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as TrackerEvent;
          count++;
          if (
            data.eventType === 'APP_SESSION_END' ||
            data.eventType === 'APP_SESSION_START' ||
            (data.durationSeconds && Number(data.durationSeconds) > 0)
          ) {
            todaySessions.push({ ...data, id: docSnap.id });
          }
        }
        setLiveTodaySessions(todaySessions);
        setTodayEventCount(count);
      },
      (e) => {
        console.warn('Today events stream range query error, falling back to limit query:', e);
        // Fallback without range filter if range index is missing or building
        const fallbackStream = query(
          collection(db, 'events'),
          where('syncedByUid', '==', partnerUid),
          orderBy('observedAtUtc', 'desc'),
          limit(2000),
        );
        onSnapshot(
          fallbackStream,
          (fallbackSnap) => {
            if (!active) return;
            const todaySessions: TrackerEvent[] = [];
            let count = 0;
            for (const docSnap of fallbackSnap.docs) {
              const data = docSnap.data() as TrackerEvent;
              const obs = typeof data.observedAtUtc === 'number'
                ? data.observedAtUtc
                : Date.parse(String(data.observedAtUtc)) || 0;
              if (obs < startOfTodayMs) break;
              count++;
              if (
                data.eventType === 'APP_SESSION_END' ||
                data.eventType === 'APP_SESSION_START' ||
                (data.durationSeconds && Number(data.durationSeconds) > 0)
              ) {
                todaySessions.push({ ...data, id: docSnap.id });
              }
            }
            setLiveTodaySessions(todaySessions);
            setTodayEventCount(count);
          },
          (err) => console.warn('Fallback stream error:', err),
        );
      },
    );

    return () => {
      active = false;
      unsubscribeToday();
      unsubscribeRollups();
      unsubscribeTodayEvents();
    };
  }, [partnerUid, refreshKey, todayDateStr, yesterdayDateStr, startOfTodayMs]);

  // Reconcile authoritative app_usage rollup with live today events
  const today = useMemo(() => {
    const activeRawToday = rawToday && rawToday.date === todayDateStr ? rawToday : null;
    const rawTodayIsV2 = (activeRawToday?.aggregatorVersion ?? 1) >= 2;
    const elapsedTodaySec = Math.max(0, Math.floor((Date.now() - startOfTodayMs) / 1000));

    // Combine directly streamed live today events with any timeline events, deduplicating by ID
    const seenIds = new Set<string>();
    const allEvents: TrackerEvent[] = [];
    for (const e of [...liveTodaySessions, ...(recentEvents || [])]) {
      const id = e.id || `${e.packageName}_${e.observedAtUtc}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        allEvents.push(e);
      }
    }

    const sessionStats = new Map<
      string,
      { label: string; seconds: number; opens: number; hourly: number[] }
    >();

    for (const event of allEvents) {
      if (!event.packageName) continue;
      const obs = typeof event.observedAtUtc === 'number'
        ? event.observedAtUtc
        : Date.parse(String(event.observedAtUtc)) || 0;

      // STRICT 24-HOUR FILTER: Discard any event before 12:00 AM local time today!
      if (obs < startOfTodayMs) continue;

      if (!sessionStats.has(event.packageName)) {
        sessionStats.set(event.packageName, {
          label: event.appLabel || event.packageName,
          seconds: 0,
          opens: 0,
          hourly: Array(24).fill(0),
        });
      }

      const item = sessionStats.get(event.packageName)!;
      if (event.eventType === 'APP_SESSION_START') {
        item.opens += 1;
      } else if (event.eventType === 'APP_SESSION_END') {
        const extra = parseExtraJson(event.extraJson);
        const source = typeof extra?.source === 'string' ? extra.source : '';
        const collectorVersion = Number(extra?.collectorVersion) || 1;
        const rawDur = Math.max(0, Number(event.durationSeconds) || 0);
        const sessionStart =
          typeof event.sessionStartUtc === 'number' ? event.sessionStartUtc : null;
        const elapsedToEventSec = Math.max(0, Math.floor((obs - startOfTodayMs) / 1000));

        // Legacy (<v2) usage_stats flushes right after midnight could carry yesterday's
        // UTC-bucket bleed or inflate periodic delta counts as "opens".
        if (source === 'usage_stats' && collectorVersion < 2) {
          if (
            rawTodayIsV2 ||
            (sessionStart !== null && sessionStart < startOfTodayMs - 60_000) ||
            rawDur > elapsedToEventSec + 60
          ) {
            continue;
          }
        } else if (source !== 'usage_stats') {
          item.opens += 1;
        }

        const dur =
          sessionStart !== null && sessionStart < startOfTodayMs
            ? Math.min(rawDur, elapsedToEventSec)
            : rawDur;
        if (dur <= 0) continue;

        item.seconds = Math.min(elapsedTodaySec, item.seconds + dur);
        const hour = new Date(obs).getHours();
        if (hour >= 0 && hour < 24) {
          item.hourly[hour] += dur;
        }
      }
    }

    const map = new Map<string, AppUsageEntry>();
    for (const a of activeRawToday?.apps ?? []) {
      map.set(a.packageName, {
        ...a,
        seconds: Math.min(elapsedTodaySec, Math.max(0, a.seconds)),
      });
    }

    for (const [pkg, stat] of sessionStats.entries()) {
      const boundedSeconds = Math.min(elapsedTodaySec, stat.seconds);
      if (map.has(pkg)) {
        const existing = map.get(pkg)!;
        if (boundedSeconds > existing.seconds) {
          existing.seconds = boundedSeconds;
        }
        if (stat.opens > (existing.openCount || 0)) {
          existing.openCount = stat.opens;
        }
        if (!existing.label || existing.label === pkg) {
          existing.label = stat.label;
        }
        if (!existing.hourlySeconds || existing.hourlySeconds.every((v) => v === 0)) {
          existing.hourlySeconds = stat.hourly;
        }
      } else if (boundedSeconds > 0 || stat.opens > 0) {
        map.set(pkg, {
          packageName: pkg,
          label: stat.label,
          seconds: boundedSeconds,
          backgroundSeconds: 0,
          openCount: stat.opens,
          hourlySeconds: stat.hourly,
          notificationCount: 0,
          wifiRxBytes: 0,
          wifiTxBytes: 0,
          mobileRxBytes: 0,
          mobileTxBytes: 0,
          rxBytes: 0,
          txBytes: 0,
        });
      }
    }

    const mergedApps = Array.from(map.values()).sort(
      (a, b) => b.seconds - a.seconds,
    );

    if (!activeRawToday && mergedApps.length === 0) return null;

    const calculatedSum = mergedApps.reduce((acc, a) => acc + a.seconds, 0);
    const authoritativeTotal = activeRawToday?.totalSeconds ?? calculatedSum;
    const finalTotalSeconds = Math.min(
      elapsedTodaySec,
      Math.max(authoritativeTotal, calculatedSum),
    );
    const calculatedOpens = mergedApps.reduce((s, a) => s + (a.openCount || 0), 0);
    const totalOpenCount = activeRawToday
      ? rawTodayIsV2
        ? Math.max(activeRawToday.totalOpenCount ?? 0, calculatedOpens)
        : calculatedOpens
      : calculatedOpens;

    // If total data exists but wifi/mobile is 0, estimate or keep raw
    let totalWifiRx = activeRawToday?.totalWifiRxBytes ?? 0;
    let totalWifiTx = activeRawToday?.totalWifiTxBytes ?? 0;
    let totalMobileRx = activeRawToday?.totalMobileRxBytes ?? 0;
    let totalMobileTx = activeRawToday?.totalMobileTxBytes ?? 0;
    let totalRx = activeRawToday?.totalRxBytes ?? (totalWifiRx + totalMobileRx);
    let totalTx = activeRawToday?.totalTxBytes ?? (totalWifiTx + totalMobileTx);

    return {
      id: activeRawToday?.id ?? `${partnerUid}_${todayDateStr}`,
      date: activeRawToday?.date ?? todayDateStr,
      syncedByUid: activeRawToday?.syncedByUid ?? partnerUid ?? undefined,
      deviceId: activeRawToday?.deviceId,
      aggregatorVersion: activeRawToday?.aggregatorVersion,
      apps: mergedApps,
      totalSeconds: finalTotalSeconds,
      totalBackgroundSeconds: activeRawToday?.totalBackgroundSeconds ?? mergedApps.reduce((s, a) => s + (a.backgroundSeconds || 0), 0),
      totalOpenCount,
      totalWifiRxBytes: totalWifiRx,
      totalWifiTxBytes: totalWifiTx,
      totalMobileRxBytes: totalMobileRx,
      totalMobileTxBytes: totalMobileTx,
      totalRxBytes: totalRx,
      totalTxBytes: totalTx,
      updatedAt: activeRawToday?.updatedAt,
    };
  }, [rawToday, recentEvents, liveTodaySessions, partnerUid, startOfTodayMs, todayDateStr]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return {
    today,
    yesterday: rawYesterday,
    history,
    todayEventCount,
    loading,
    error,
    refresh,
  };
}
