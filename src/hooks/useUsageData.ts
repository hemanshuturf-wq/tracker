import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  const apps = Array.isArray(data.apps) ? (data.apps as AppUsageEntry[]) : [];
  return {
    id,
    date: typeof data.date === 'string' ? data.date : id.slice(-10),
    syncedByUid: typeof data.syncedByUid === 'string' ? data.syncedByUid : undefined,
    deviceId: typeof data.deviceId === 'string' ? data.deviceId : undefined,
    apps,
    totalSeconds: Number(data.totalSeconds) || 0,
    totalRxBytes: Number(data.totalRxBytes) || 0,
    totalTxBytes: Number(data.totalTxBytes) || 0,
    updatedAt: data.updatedAt,
  };
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Reads the daily rollup documents written by the Android app, and reconciles
 * with live session events from today for real-time Digital Wellbeing accuracy.
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

    const todayId = `${partnerUid}_${dateKey(new Date())}`;
    const unsubscribe = onSnapshot(
      doc(db, 'app_usage', todayId),
      (snapshot) => {
        if (!active) return;
        setRawToday(
          snapshot.exists()
            ? toDoc(snapshot.id, snapshot.data() as Record<string, unknown>)
            : null,
        );
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        console.error('Usage rollup stream error:', err);
        setError('Could not load app usage. Check Firestore rules for app_usage.');
        setLoading(false);
      },
    );

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

  // Reconcile raw app_usage rollup with live APP_SESSION_END events for today
  const today = useMemo(() => {
    if (!rawToday && (!recentEvents || recentEvents.length === 0)) return null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const sessionStats = new Map<string, { label: string; seconds: number }>();
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
          });
        }

        if (event.eventType === 'APP_SESSION_END' && event.durationSeconds) {
          const item = sessionStats.get(event.packageName)!;
          item.seconds += Number(event.durationSeconds) || 0;
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
        if (!existing.label || existing.label === pkg) {
          existing.label = stat.label;
        }
      } else if (stat.seconds > 0) {
        map.set(pkg, {
          packageName: pkg,
          label: stat.label,
          seconds: stat.seconds,
          rxBytes: 0,
          txBytes: 0,
        });
      }
    }

    const mergedApps = Array.from(map.values()).sort(
      (a, b) => b.seconds - a.seconds,
    );
    const totalSeconds = mergedApps.reduce((acc, a) => acc + a.seconds, 0);

    return {
      id: rawToday?.id ?? `${partnerUid}_${dateKey(new Date())}`,
      date: rawToday?.date ?? dateKey(new Date()),
      syncedByUid: rawToday?.syncedByUid ?? partnerUid ?? undefined,
      deviceId: rawToday?.deviceId,
      apps: mergedApps,
      totalSeconds: Math.max(totalSeconds, rawToday?.totalSeconds ?? 0),
      totalRxBytes: rawToday?.totalRxBytes ?? 0,
      totalTxBytes: rawToday?.totalTxBytes ?? 0,
      updatedAt: rawToday?.updatedAt,
    };
  }, [rawToday, recentEvents, partnerUid]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { today, history, loading, error, refresh };
}
