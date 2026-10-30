import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { db } from '../firebase';
import type { AppUsageDoc, AppUsageEntry } from '../types';

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
 * Reads the daily rollup documents written by the Android app.
 * Today's document is live; the previous six days are one-time reads.
 * That keeps the dashboard to a handful of Firestore reads.
 */
export function useUsageData(partnerUid: string | null): UsageData {
  const [today, setToday] = useState<AppUsageDoc | null>(null);
  const [history, setHistory] = useState<AppUsageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!partnerUid) {
      setToday(null);
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
        setToday(
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

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { today, history, loading, error, refresh };
}
