import { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  PackageCheck,
  Loader2,
  RefreshCw,
  GitBranch,
  Download,
  AlertTriangle,
  FileCode2,
  Smartphone,
} from 'lucide-react';
import { formatBytes } from '../lib/format';

interface UploadApkModalProps {
  onClose: () => void;
}

interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  created_at: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

const GITHUB_REPO = 'hemanshuturf-wq/tracker';

export function UploadApkModal({ onClose }: UploadApkModalProps) {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLatestRelease = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) {
        throw new Error(`GitHub returned HTTP ${res.status} (${res.statusText})`);
      }
      const data: GitHubRelease = await res.json();
      setRelease(data);
    } catch (err: any) {
      console.error('Failed to fetch latest GitHub release:', err);
      setError(err?.message || 'Failed to fetch release information from GitHub.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestRelease();
  }, []);

  const apkAsset = release?.assets?.find((a) => a.name.endsWith('.apk'));

  const handleCopyApkUrl = () => {
    if (apkAsset?.browser_download_url) {
      navigator.clipboard.writeText(apkAsset.browser_download_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-[#ebdce3] overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#f0e7eb] px-6 py-4 bg-gradient-to-r from-[#fff5f8] via-[#fff9fb] to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c2185b] text-white shadow-xs">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1d1b18] flex items-center gap-1.5">
                GitHub App Releases & Updates
                <span className="text-[#c2185b]">🌸</span>
              </h2>
              <p className="text-xs text-[#6e6a63]">
                Zero Firebase dependency · Phone fetches APK directly from GitHub Releases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#96918a] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Architecture Banner */}
          <div className="rounded-xl border border-[#ebdce3] bg-[#fff5f8] p-3.5 flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-[#c2185b]/10 p-1.5 text-[#c2185b]">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="text-xs text-[#442c36] space-y-1">
              <p className="font-semibold text-[#1d1b18]">
                Direct GitHub Releases Integration
              </p>
              <p className="leading-relaxed text-[#6e6a63]">
                The Android app checks{' '}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#c2185b] border border-[#ebdce3]">
                  api.github.com/repos/{GITHUB_REPO}/releases/latest
                </code>{' '}
                automatically on launch and periodically. No Firebase Firestore or Storage is used.
              </p>
            </div>
          </div>

          {/* Current Live Release Card */}
          <div className="rounded-xl border border-[#ebdce3] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[#c2185b]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#6e6a63]">
                  Latest Release on GitHub
                </span>
              </div>
              <button
                type="button"
                onClick={fetchLatestRelease}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-[#c2185b] hover:text-[#ad1457] font-medium"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#96918a]">
                <Loader2 className="h-6 w-6 animate-spin text-[#c2185b]" />
                <span>Checking GitHub Releases...</span>
              </div>
            ) : error ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Could not reach GitHub Releases API</p>
                  <p className="mt-0.5 text-amber-700">{error}</p>
                </div>
              </div>
            ) : release ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#f0e7eb]">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#c2185b] px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                      {release.tag_name}
                    </span>
                    <span className="text-sm font-semibold text-[#1d1b18]">
                      {release.name || release.tag_name}
                    </span>
                  </div>
                  <span className="text-xs text-[#96918a]">
                    Published {new Date(release.published_at).toLocaleDateString()}
                  </span>
                </div>

                {/* APK Asset status */}
                {apkAsset ? (
                  <div className="rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="rounded-md bg-emerald-600 p-1.5 text-white">
                        <FileCode2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-900 truncate">
                          {apkAsset.name}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          {formatBytes(apkAsset.size)} · {apkAsset.download_count} download
                          {apkAsset.download_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyApkUrl}
                        className="rounded-md bg-white border border-[#bbf7d0] px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                      >
                        {copied ? 'Copied! ✓' : 'Copy URL'}
                      </button>
                      <a
                        href={apkAsset.browser_download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#fff8e1] border border-[#ffe082] p-3 flex items-start gap-2.5 text-xs text-[#795548]">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#5d4037]">No APK Asset Attached to {release.tag_name}</p>
                      <p className="mt-0.5 text-[#6d4c41]">
                        The release tag exists, but the <code className="font-mono">.apk</code> binary hasn't been uploaded to it yet.
                      </p>
                    </div>
                  </div>
                )}

                {/* Release Notes */}
                {release.body && (
                  <div className="rounded-lg bg-[#faf7f5] p-3 text-xs text-[#524e48]">
                    <p className="font-semibold text-[#1d1b18] mb-1">Release Notes:</p>
                    <p className="whitespace-pre-wrap font-sans text-xs text-[#6e6a63] leading-relaxed">
                      {release.body}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Quick Publishing Guide */}
          <div className="rounded-xl border border-[#ebdce3] bg-gradient-to-br from-white to-[#fffafb] p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6e6a63]">
              How to Publish a New APK Release
            </h3>

            <div className="space-y-2 text-xs text-[#6e6a63]">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff0f5] text-[11px] font-bold text-[#c2185b]">
                  1
                </span>
                <p className="leading-5">
                  Your optimized release APK is compiled and waiting on your Desktop:
                  <br />
                  <code className="font-mono text-[11px] text-[#c2185b] bg-[#fff0f5] px-1.5 py-0.5 rounded">
                    AmiChan-v1.7-release.apk
                  </code>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff0f5] text-[11px] font-bold text-[#c2185b]">
                  2
                </span>
                <p className="leading-5">
                  Click the button below to open the GitHub Release page in your browser.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff0f5] text-[11px] font-bold text-[#c2185b]">
                  3
                </span>
                <p className="leading-5">
                  Drag & drop the APK file into GitHub's binary upload box and click{' '}
                  <strong className="text-[#1d1b18]">"Update release"</strong>. The Android app will automatically notify devices!
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <a
                href={
                  release?.html_url
                    ? `${release.html_url.replace('/tag/', '/edit/')}`
                    : `https://github.com/${GITHUB_REPO}/releases/new`
                }
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#c2185b] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#ad1457] transition-colors"
              >
                <span>Open GitHub Release Editor</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              <a
                href={`https://github.com/${GITHUB_REPO}/releases`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#ebdce3] bg-white px-3.5 py-2.5 text-xs font-medium text-[#6e6a63] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
              >
                <span>All Releases</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#f0e7eb] px-6 py-3.5 bg-[#faf7f5] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#ebdce3] bg-white px-4 py-2 text-xs font-semibold text-[#6e6a63] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
