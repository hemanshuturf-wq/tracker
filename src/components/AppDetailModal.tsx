import { useState } from 'react';
import { X, Clock, Smartphone, Bell, Wifi, Radio, Activity, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { AppUsageEntry } from '../types';
import AppIcon from './AppIcon';

interface AppDetailModalProps {
  app: AppUsageEntry | null;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  return `${secs}s`;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5 min-w-0">
            <AppIcon
              packageName={app.packageName}
              appLabel={app.label}
              className="w-12 h-12 rounded-2xl flex-shrink-0 shadow-md ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                {app.label}
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate">
                {app.packageName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Stat: Today Screen Time */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              Screen Time Today
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {formatDuration(app.seconds)}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium border border-indigo-500/30">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{app.openCount ? `${app.openCount} opens` : 'Active today'}</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Digital Wellbeing Chart */}
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Hourly Breakdown (24h)
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {selectedHour !== null
                ? `${formatHour(selectedHour)}: ${formatDuration(hourly[selectedHour])}`
                : 'Tap bar for details'}
            </span>
          </div>

          <div className="h-32 flex items-end gap-1 pt-4 pb-1 px-1">
            {hourly.map((sec, hour) => {
              const heightPct = maxHourSeconds > 0 ? Math.round((sec / maxHourSeconds) * 100) : 0;
              const isSelected = selectedHour === hour;
              return (
                <div
                  key={hour}
                  className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                  onClick={() => setSelectedHour(selectedHour === hour ? null : hour)}
                >
                  <div
                    className={`w-full rounded-t-sm transition-all duration-200 ${
                      isSelected
                        ? 'bg-pink-400 ring-2 ring-pink-400/50'
                        : sec > 0
                        ? 'bg-gradient-to-t from-indigo-500 to-pink-500 group-hover:from-indigo-400 group-hover:to-pink-400'
                        : 'bg-slate-700/40 group-hover:bg-slate-700'
                    }`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    title={`${formatHour(hour)}: ${formatDuration(sec)}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
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
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Foreground Time</span>
            </div>
            <div className="text-lg font-bold text-white">
              {formatDuration(app.seconds)}
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Background Time</span>
            </div>
            <div className="text-lg font-bold text-white">
              {formatDuration(app.backgroundSeconds || 0)}
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Times Opened</span>
            </div>
            <div className="text-lg font-bold text-white">
              {app.openCount || 0} times
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notifications</span>
            </div>
            <div className="text-lg font-bold text-white">
              {app.notificationCount || 0}
            </div>
          </div>
        </div>

        {/* Data Usage: Separated Wi-Fi and Mobile Data */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Network & Data Usage
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Wi-Fi Data Card */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
                  <Wifi className="w-4 h-4" />
                  <span>Wi-Fi Data</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {formatBytes(wifiTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  <span>Down: {formatBytes(wifiRx)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                  <span>Up: {formatBytes(wifiTx)}</span>
                </div>
              </div>
            </div>

            {/* Mobile Cellular Data Card */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-medium">
                  <Radio className="w-4 h-4" />
                  <span>Mobile Cellular</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {formatBytes(mobileTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  <span>Down: {formatBytes(mobileRx)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-rose-400" />
                  <span>Up: {formatBytes(mobileTx)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Total */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/20 rounded-xl text-xs text-slate-400">
            <span>Total Data Transferred:</span>
            <span className="font-semibold text-slate-200">{formatBytes(totalBytes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
