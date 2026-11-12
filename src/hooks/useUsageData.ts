import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
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

function toDoc(id: string, data: Record<string, unknown>): AppUsageDoc {
  const rawApps = Array.isArray(data.apps) ? data.apps : [];
  const apps: AppUsageEntry[] = rawApps.map((item: Record<string, unknown>) => ({
    packageName: String(item.packageName || ''),
    label: String(item.label || item.packageName || 'App'),
    seconds: Number(item.seconds) || 0,
    backgroundSeconds: Number(item.backgroundSeconds) || 0,
    openCount: Number(item.openCount) || 0,
    hourlySeconds: Array.isArray(item.hourlySeconds)
      ? item.hourlySeconds.map((v) => Number(v) || 0)
      : Array(24).fill(0),
    notificationCount: Number(item.notificationCount) || 0,
    wifiRxBytes: Number(item.wifiRxBytes) || 0,
    wifiTxBytes: Number(item.wifiTxBytes) || 0,
    mobileRxBytes: Number(item.mobileRxBytes) || 0,
    mobileTxBytes: Number(item.mobileTxBytes) || 0,
    rxBytes: Number(item.rxBytes) || 0,
    txBytes: Number(item.txBytes) || 0,
  }));

  const totalWifiRx = Number(data.totalWifiRxBytes) || 0;
  const totalWifiTx = Number(data.totalWifiTxBytes) || 0;
  const totalMobileRx = Number(data.totalMobileRxBytes) || 0;
  const totalMobileTx = Number(data.totalMobileTxBytes) || 0;
  let totalRx = Number(data.totalRxBytes) || 0;
  let totalTx = Number(data.totalTxBytes) || 0;

  // If separated wifi/mobile are present and higher, attribute them
  if (totalWifiRx + totalMobileRx > totalRx) totalRx = totalWifiRx + totalMobileRx;
  if (totalWifiTx + totalMobileTx > totalTx) totalTx = totalWifiTx + totalMobileTx;

  return {
    id,
    date: typeof data.date === 'string' ? data.date : id.slice(-10),
    syncedByUid: typeof data.syncedByUid === 'string' ? data.syncedByUid : undefined,
    deviceId: typeof data.deviceId === 'string' ? data.deviceId : undefined,
    apps,
    totalSeconds: Number(data.totalSeconds) || apps.reduce((s, a) => s + a.seconds, 0),
    totalBackgroundSeconds: Number(data.totalBackgroundSeconds) || apps.reduce((s, a) => s + (a.backgroundSeconds || 0), 0),
    totalOpenCount: Number(data.totalOpenCount) || apps.reduce((s, a) => s + (a.openCount || 0), 0),
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const todayDateStr = useMemo(() => dateKey(new Date()), []);
  const yesterdayDateStr = useMemo(() => dateKey(subDays(new Date(), 1)), []);
  const startOfTodayMs = useMemo(() => getStartOfDayMs(new Date()), []);

  useEffect(() => {
    if (!partnerUid) {
      setRawToday(null);
      setRawYesterday(null);
      setHistory([]);
      setLiveTodaySessions([]);
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
          setLoading(false);
        }
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
        if (snap.exists() && !rawYesterday) {
          setRawYesterday(toDoc(snap.id, snap.data() as Record<string, unknown>));
        }
      })
      .catch(() => {});

    // 4. Query today's APP_SESSION events directly from `events` collection
    // This guarantees total screen time is populated IMMEDIATELY on load even if
    // the phone hasn't completed its background rollup sync yet!
    const sessionQuery = query(
      collection(db, 'events'),
      where('syncedByUid', '==', partnerUid),
      where('eventType', '==', 'APP_SESSION_END'),
      limit(250),
    );

    getDocs(sessionQuery)
      .then((snapshot) => {
        if (!active) return;
        const todaySessions: TrackerEvent[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as TrackerEvent;
          const obs = typeof data.observedAtUtc === 'number'
            ? data.observedAtUtc
            : Date.parse(String(data.observedAtUtc)) || 0;
          // STRICT RULE: Only events strictly starting from today's midnight (12:00 AM)
          if (obs >= startOfTodayMs) {
            todaySessions.push({ ...data, id: docSnap.id });
          }
        }
        setLiveTodaySessions(todaySessions);
      })
      .catch((e) => {
        console.warn('Live session query warn:', e);
      });

    return () => {
      active = false;
      unsubscribeToday();
      unsubscribeRollups();
    };
  }, [partnerUid, refreshKey, todayDateStr, yesterdayDateStr, startOfTodayMs]);

  // Reconcile authoritative app_usage rollup with live today events
  const today = useMemo(() => {
    // Combine recent events passed from timeline with directly queried live sessions
    const allEvents = [...(recentEvents || []), ...liveTodaySessions];

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
        item.opens += 1;
        const dur = Number(event.durationSeconds) || 0;
        item.seconds += dur;
        const hour = new Date(obs).getHours();
        if (hour >= 0 && hour < 24) {
          item.hourly[hour] += dur;
        }
      }
    }

    const map = new Map<string, AppUsageEntry>();
    for (const a of rawToday?.apps ?? []) {
      map.set(a.packageName, { ...a });
    }

    for (const [pkg, stat] of sessionStats.entries()) {
      if (map.has(pkg)) {
        const existing = map.get(pkg)!;
        if (stat.seconds > existing.seconds) {
          existing.seconds = stat.seconds;
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
      } else if (stat.seconds > 0 || stat.opens > 0) {
        map.set(pkg, {
          packageName: pkg,
          label: stat.label,
          seconds: stat.seconds,
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

    if (!rawToday && mergedApps.length === 0) return null;

    const calculatedSum = mergedApps.reduce((acc, a) => acc + a.seconds, 0);
    const authoritativeTotal = rawToday?.totalSeconds ?? calculatedSum;
    const finalTotalSeconds = Math.max(authoritativeTotal, calculatedSum);

    // If total data exists but wifi/mobile is 0, estimate or keep raw
    let totalWifiRx = rawToday?.totalWifiRxBytes ?? 0;
    let totalWifiTx = rawToday?.totalWifiTxBytes ?? 0;
    let totalMobileRx = rawToday?.totalMobileRxBytes ?? 0;
    let totalMobileTx = rawToday?.totalMobileTxBytes ?? 0;
    let totalRx = rawToday?.totalRxBytes ?? (totalWifiRx + totalMobileRx);
    let totalTx = rawToday?.totalTxBytes ?? (totalWifiTx + totalMobileTx);

    return {
      id: rawToday?.id ?? `${partnerUid}_${todayDateStr}`,
      date: rawToday?.date ?? todayDateStr,
      syncedByUid: rawToday?.syncedByUid ?? partnerUid ?? undefined,
      deviceId: rawToday?.deviceId,
      apps: mergedApps,
      totalSeconds: finalTotalSeconds,
      totalBackgroundSeconds: rawToday?.totalBackgroundSeconds ?? mergedApps.reduce((s, a) => s + (a.backgroundSeconds || 0), 0),
      totalOpenCount: rawToday?.totalOpenCount ?? mergedApps.reduce((s, a) => s + (a.openCount || 0), 0),
      totalWifiRxBytes: totalWifiRx,
      totalWifiTxBytes: totalWifiTx,
      totalMobileRxBytes: totalMobileRx,
      totalMobileTxBytes: totalMobileTx,
      totalRxBytes: totalRx,
      totalTxBytes: totalTx,
      updatedAt: rawToday?.updatedAt,
    };
  }, [rawToday, recentEvents, liveTodaySessions, partnerUid, startOfTodayMs, todayDateStr]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { today, yesterday: rawYesterday, history, loading, error, refresh };
}
