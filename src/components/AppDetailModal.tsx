import { useState } from 'react';
import { X, Clock, Smartphone, Bell, Wifi, Radio, Activity, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { AppUsageEntry } from '../types';
import AppIcon from './AppIcon';
import { formatBytes, formatDuration } from '../lib/format';

interface AppDetailModalProps {
  app: AppUsageEntry | null;
  onClose: () => void;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function AppDetailModal({ app, onClose }: AppDetailModalProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  if (!app) return null;

  const hourly = app.hourlySeconds && app.hourlySeconds.length === 24
    ? app.hourlySeconds
    : Array(24).fill(0);

  const maxHourSeconds = Math.max(...hourly, 1);

  const wifiRx = app.wifiRxBytes || 0;
  const wifiTx = app.wifiTxBytes || 0;
  const wifiTotal = wifiRx + wifiTx;

  const mobileRx = app.mobileRxBytes || 0;
  const mobileTx = app.mobileTxBytes || 0;
  const mobileTotal = mobileRx + mobileTx;

  const totalRx = app.rxBytes || (wifiRx + mobileRx);
  const totalTx = app.txBytes || (wifiTx + mobileTx);
  const totalBytes = totalRx + totalTx;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white border border-[#e7e3db] rounded-2xl shadow-xl p-5 sm:p-6 space-y-5 text-[#1d1b18]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#efede7]">
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon
              packageName={app.packageName}
              appLabel={app.label}
              size={40}
            />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#1d1b18] truncate">
                {app.label}
              </h3>
              <p className="text-xs text-[#96918a] font-mono truncate">
                {app.packageName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#96918a] hover:text-[#1d1b18] hover:bg-[#f3f1ec] rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Stat: Today Screen Time */}
        <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#6e6a63] uppercase tracking-wider mb-1">
              Screen Time Today
            </div>
            <div className="font-display text-3xl font-extrabold text-[#1d1b18] tracking-tight">
              {formatDuration(app.seconds)}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#efede7] text-[#6e6a63] rounded-md text-xs font-medium">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{app.openCount ? `${app.openCount} opens` : 'Active today'}</span>
            </span>
          </div>
        </div>

        {/* 24-Hour Digital Wellbeing Chart */}
        <div className="border border-[#e7e3db] rounded-xl p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1f5c4a]" />
              <span className="text-xs font-semibold text-[#1d1b18] uppercase tracking-wider">
                Hourly Breakdown (24h)
              </span>
            </div>
            <span className="text-xs text-[#6e6a63] font-mono">
              {selectedHour !== null
                ? `${formatHour(selectedHour)}: ${formatDuration(hourly[selectedHour])}`
                : 'Tap bar for details'}
            </span>
          </div>

          <div className="h-28 flex items-end gap-1 pt-3 pb-1">
            {hourly.map((sec, hour) => {
              const heightPct = maxHourSeconds > 0 ? Math.round((sec / maxHourSeconds) * 100) : 0;
              const isSelected = selectedHour === hour;
              return (
                <div
                  key={hour}
                  className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                  onClick={() => setSelectedHour(selectedHour === hour ? null : hour)}
                  title={`${formatHour(hour)}: ${formatDuration(sec)}`}
                >
                  <div
                    className={`w-full rounded-t-[2px] transition-colors ${
                      isSelected
                        ? 'bg-[#174538]'
                        : sec > 0
                        ? 'bg-[#1f5c4a] group-hover:bg-[#174538]'
                        : 'bg-[#efede7] group-hover:bg-[#d8d3c8]'
                    }`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-[#96918a] font-mono px-0.5">
            <span>12a</span>
            <span>3a</span>
            <span>6a</span>
            <span>9a</span>
            <span>12p</span>
            <span>3p</span>
            <span>6p</span>
            <span>9p</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[#6e6a63] text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-[#1f5c4a]" />
              <span>Foreground Time</span>
            </div>
            <div className="text-base font-bold text-[#1d1b18]">
              {formatDuration(app.seconds)}
            </div>
          </div>

          <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[#6e6a63] text-xs mb-1">
              <Activity className="w-3.5 h-3.5 text-[#2f5d8a]" />
              <span>Background Time</span>
            </div>
            <div className="text-base font-bold text-[#1d1b18]">
              {formatDuration(app.backgroundSeconds || 0)}
            </div>
          </div>

          <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[#6e6a63] text-xs mb-1">
              <Smartphone className="w-3.5 h-3.5 text-[#6e6a63]" />
              <span>Times Opened</span>
            </div>
            <div className="text-base font-bold text-[#1d1b18]">
              {app.openCount || 0} times
            </div>
          </div>

          <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[#6e6a63] text-xs mb-1">
              <Bell className="w-3.5 h-3.5 text-[#b54708]" />
              <span>Notifications</span>
            </div>
            <div className="text-base font-bold text-[#1d1b18]">
              {app.notificationCount || 0}
            </div>
          </div>
        </div>

        {/* Data Usage: Separated Wi-Fi and Mobile Data */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-[#6e6a63] uppercase tracking-wider">
            Network & Data Usage
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Wi-Fi Data Card */}
            <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d1b18]">
                  <Wifi className="w-3.5 h-3.5 text-[#2f5d8a]" />
                  <span>Wi-Fi</span>
                </div>
                <span className="text-xs font-bold text-[#1d1b18] font-mono">
                  {formatBytes(wifiTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-[#6e6a63] font-mono pt-1 border-t border-[#e7e3db]">
                <div className="flex items-center gap-1">
                  <ArrowDownToLine className="w-3 h-3 text-[#2f5d8a]" />
                  <span>↓ {formatBytes(wifiRx)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpFromLine className="w-3 h-3 text-[#b54708]" />
                  <span>↑ {formatBytes(wifiTx)}</span>
                </div>
              </div>
            </div>

            {/* Mobile Cellular Data Card */}
            <div className="bg-[#f8f7f4] border border-[#e7e3db] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d1b18]">
                  <Radio className="w-3.5 h-3.5 text-[#1f5c4a]" />
                  <span>Mobile Cellular</span>
                </div>
                <span className="text-xs font-bold text-[#1d1b18] font-mono">
                  {formatBytes(mobileTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-[#6e6a63] font-mono pt-1 border-t border-[#e7e3db]">
                <div className="flex items-center gap-1">
                  <ArrowDownToLine className="w-3 h-3 text-[#1f5c4a]" />
                  <span>↓ {formatBytes(mobileRx)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpFromLine className="w-3 h-3 text-[#b54708]" />
                  <span>↑ {formatBytes(mobileTx)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-[#f8f7f4] border border-[#e7e3db] rounded-lg text-xs text-[#6e6a63]">
            <span>Total Combined Data:</span>
            <span className="font-bold text-[#1d1b18] font-mono">{formatBytes(totalBytes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
