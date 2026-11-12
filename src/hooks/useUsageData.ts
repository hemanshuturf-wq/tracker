import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { db } from '../firebase';
import type { AppUsageDoc, AppUsageEntry, TrackerEvent } from '../types';

interface UsageData {
  today: AppUsageDoc | null;
  history: AppUsageDoc[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
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

  return {
    id,
    date: typeof data.date === 'string' ? data.date : id.slice(-10),
    syncedByUid: typeof data.syncedByUid === 'string' ? data.syncedByUid : undefined,
    deviceId: typeof data.deviceId === 'string' ? data.deviceId : undefined,
    apps,
    totalSeconds: Number(data.totalSeconds) || apps.reduce((s, a) => s + a.seconds, 0),
    totalBackgroundSeconds: Number(data.totalBackgroundSeconds) || apps.reduce((s, a) => s + (a.backgroundSeconds || 0), 0),
    totalOpenCount: Number(data.totalOpenCount) || apps.reduce((s, a) => s + (a.openCount || 0), 0),
    totalWifiRxBytes: Number(data.totalWifiRxBytes) || 0,
    totalWifiTxBytes: Number(data.totalWifiTxBytes) || 0,
    totalMobileRxBytes: Number(data.totalMobileRxBytes) || 0,
    totalMobileTxBytes: Number(data.totalMobileTxBytes) || 0,
    totalRxBytes: Number(data.totalRxBytes) || 0,
    totalTxBytes: Number(data.totalTxBytes) || 0,
    updatedAt: data.updatedAt,
  };
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Authoritative Digital Wellbeing usage reader.
 * Directly streams the daily rollup document so full day totals never depend
 * on how many events are paginated in memory.
 */
export function useUsageData(
  partnerUid: string | null,
  recentEvents?: TrackerEvent[],
): UsageData {
  const [rawToday, setRawToday] = useState<AppUsageDoc | null>(null);
  const [history, setHistory] = useState<AppUsageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!partnerUid) {
      setRawToday(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const todayDateStr = dateKey(new Date());
    const todayId = `${partnerUid}_${todayDateStr}`;

    // 1. Direct real-time stream of today's rollup document
    const unsubscribe = onSnapshot(
      doc(db, 'app_usage', todayId),
      (snapshot) => {
        if (!active) return;
        if (snapshot.exists()) {
          setRawToday(toDoc(snapshot.id, snapshot.data() as Record<string, unknown>));
          setLoading(false);
        } else {
          // Fallback: If exact today's document hasn't been created yet, query the most recent rollup for this partner
          const q = query(
            collection(db, 'app_usage'),
            where('syncedByUid', '==', partnerUid),
            orderBy('date', 'desc'),
            limit(1)
          );
          getDocs(q)
            .then((snap) => {
              if (!active) return;
              if (!snap.empty) {
                const latestDoc = snap.docs[0];
                const docDate = latestDoc.data().date;
                // If the latest document is from today or yesterday, use it so screen time is immediately visible
                if (docDate === todayDateStr || docDate === dateKey(subDays(new Date(), 1))) {
                  setRawToday(toDoc(latestDoc.id, latestDoc.data() as Record<string, unknown>));
                }
              }
              setLoading(false);
            })
            .catch((e) => {
              console.warn('Fallback usage query failed:', e);
              if (active) setLoading(false);
            });
        }
      },
      (err) => {
        if (!active) return;
        console.error('Usage rollup stream error:', err);
        setError('Could not load app usage. Check Firestore rules for app_usage.');
        setLoading(false);
      },
    );

    // 2. Fetch past 6 days history
    const olderDays = Array.from({ length: 6 }, (_, i) =>
      dateKey(subDays(new Date(), i + 1)),
    );

    Promise.all(
      olderDays.map((day) =>
        getDoc(doc(db, 'app_usage', `${partnerUid}_${day}`)),
      ),
    )
      .then((snapshots) => {
        if (!active) return;
        setHistory(
          snapshots
            .filter((snap) => snap.exists())
            .map((snap) =>
              toDoc(snap.id, snap.data() as Record<string, unknown>),
            )
            .sort((a, b) => b.date.localeCompare(a.date)),
        );
      })
      .catch((err) => {
        if (!active) return;
        console.error('Usage history read error:', err);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [partnerUid, refreshKey]);

  // Reconcile authoritative app_usage rollup with any live APP_SESSION_END events
  const today = useMemo(() => {
    if (!rawToday && (!recentEvents || recentEvents.length === 0)) return null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const sessionStats = new Map<
      string,
      { label: string; seconds: number; opens: number; hourly: number[] }
    >();

    if (recentEvents) {
      for (const event of recentEvents) {
        if (!event.packageName) continue;
        const obs = typeof event.observedAtUtc === 'number'
          ? event.observedAtUtc
          : Date.parse(String(event.observedAtUtc)) || 0;
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

    // Keep the authoritative total from the rollup if available, ensuring it never shrinks
    const calculatedSum = mergedApps.reduce((acc, a) => acc + a.seconds, 0);
    const authoritativeTotal = rawToday?.totalSeconds ?? calculatedSum;
    const finalTotalSeconds = Math.max(authoritativeTotal, calculatedSum);

    return {
      id: rawToday?.id ?? `${partnerUid}_${dateKey(new Date())}`,
      date: rawToday?.date ?? dateKey(new Date()),
      syncedByUid: rawToday?.syncedByUid ?? partnerUid ?? undefined,
      deviceId: rawToday?.deviceId,
      apps: mergedApps,
      totalSeconds: finalTotalSeconds,
      totalBackgroundSeconds: rawToday?.totalBackgroundSeconds ?? mergedApps.reduce((s, a) => s + (a.backgroundSeconds || 0), 0),
      totalOpenCount: rawToday?.totalOpenCount ?? mergedApps.reduce((s, a) => s + (a.openCount || 0), 0),
      totalWifiRxBytes: rawToday?.totalWifiRxBytes ?? 0,
      totalWifiTxBytes: rawToday?.totalWifiTxBytes ?? 0,
      totalMobileRxBytes: rawToday?.totalMobileRxBytes ?? 0,
      totalMobileTxBytes: rawToday?.totalMobileTxBytes ?? 0,
      totalRxBytes: rawToday?.totalRxBytes ?? 0,
      totalTxBytes: rawToday?.totalTxBytes ?? 0,
      updatedAt: rawToday?.updatedAt,
    };
  }, [rawToday, recentEvents, partnerUid]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { today, history, loading, error, refresh };
}
