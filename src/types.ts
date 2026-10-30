export type EventType =
  | 'APP_SESSION_START'
  | 'APP_SESSION_END'
  | 'NOTIFICATION_POSTED'
  | 'SMS_RECEIVED'
  | 'SMS_SENT'
  | 'CALL_LOG'
  | 'PACKAGE_ADDED'
  | 'PACKAGE_REMOVED'
  | 'PACKAGE_UPDATED'
  | 'INVENTORY_SNAPSHOT'
  | 'DEVICE_BOOT'
  | 'ACCESSIBILITY_EVENT'
  | 'TRACKING_STOPPED'
  | 'TRACKING_RESUMED';

export interface TrackerEvent {
  id: string;
  eventId: string;
  deviceId: string;
  eventType: EventType;
  packageName: string | null;
  appLabel: string | null;
  observedAtUtc: number;
  sessionStartUtc: number | null;
  sessionEndUtc: number | null;
  durationSeconds: number | null;
  title: string | null;
  body: string | null;
  extraJson: string | null;
  schemaVersion: number;
  syncedByUid: string;
}

export interface RemoteImage {
  id: string;
  imageBase64: string;
  lensFacing: 'front' | 'back';
  timestamp: number;
  deviceId: string;
  capturedBy: string;
}

export interface AppUsageEntry {
  packageName: string;
  label: string;
  seconds: number;
  rxBytes: number;
  txBytes: number;
}

export interface AppUsageDoc {
  id: string;
  date: string;
  syncedByUid?: string;
  deviceId?: string;
  apps: AppUsageEntry[];
  totalSeconds: number;
  totalRxBytes: number;
  totalTxBytes: number;
  updatedAt?: unknown;
}