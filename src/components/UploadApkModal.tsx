import { useState } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  PackageCheck,
  Loader2,
  GitBranch,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface UploadApkModalProps {
  onClose: () => void;
}

const GITHUB_REPO = 'hemanshuturf-wq/tracker';

export function UploadApkModal({ onClose }: UploadApkModalProps) {
  const [versionName, setVersionName] = useState('1.0.2');
  const [versionCode, setVersionCode] = useState(2);
  const [notes, setNotes] = useState(
    '🌸 AmiChan feminine makeover, real-time ongoing call tracking, 24-hr Digital Wellbeing & cute love notes!',
  );
  const [githubToken, setGithubToken] = useState(
    () => (import.meta.env.VITE_GITHUB_TOKEN as string) || localStorage.getItem('gh_token') || '',
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directApkUrl, setDirectApkUrl] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'creating_release' | 'uploading_apk' | 'updating_firestore' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-extract version name from filename if possible
      const match = file.name.match(/v?(\d+\.\d+(\.\d+)?)/i);
      if (match) {
        setVersionName(match[1]);
      }
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let finalApkUrl = directApkUrl.trim();

    try {
      if (selectedFile) {
        if (!githubToken.trim()) {
          throw new Error('Please provide a GitHub Personal Access Token to upload the APK.');
        }

        localStorage.setItem('gh_token', githubToken.trim());
        const tag = `v${versionName.trim()}`;

        // 1. Create GitHub Release
        setStatus('creating_release');
        const releaseRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${githubToken.trim()}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tag_name: tag,
              name: `AmiChan ${tag} 🌸`,
              body: notes.trim(),
              draft: false,
              prerelease: false,
            }),
          },
        );

        let releaseData: any;
        if (releaseRes.status === 422) {
          // Release / tag might already exist, fetch it
          const existingRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tag}`,
            {
              headers: {
                Authorization: `Bearer ${githubToken.trim()}`,
                Accept: 'application/vnd.github+json',
              },
            },
          );
          if (!existingRes.ok) {
            throw new Error(`Tag ${tag} already exists or failed to create release.`);
          }
          releaseData = await existingRes.json();
        } else if (!releaseRes.ok) {
          const errData = await releaseRes.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to create GitHub release (${releaseRes.status})`);
        } else {
          releaseData = await releaseRes.json();
        }

        // 2. Upload APK Asset to GitHub Release
        setStatus('uploading_apk');
        const uploadUrlTemplate = releaseData.upload_url;
        const uploadUrl = uploadUrlTemplate.replace(/\{(\?.*)?\}/, `?name=AmiChan-${tag}.apk`);

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken.trim()}`,
            'Content-Type': 'application/vnd.android.package-archive',
          },
          body: selectedFile,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadErr.message || `Failed to upload APK asset to GitHub (${uploadRes.status})`);
        }

        const assetData = await uploadRes.json();
        finalApkUrl = assetData.browser_download_url;
      } else if (!finalApkUrl) {
        throw new Error('Please select an APK file to upload, or provide an APK download URL.');
      }

      // 3. Update Firestore `app_updates/latest`
      setStatus('updating_firestore');
      await setDoc(
        doc(db, 'app_updates', 'latest'),
        {
          versionCode: Number(versionCode),
          versionName: versionName.trim(),
          apkUrl: finalApkUrl,
          notes: notes.trim(),
          publishedAt: Date.now(),
        },
        { merge: true },
      );

      setPublishedUrl(finalApkUrl);
      setStatus('success');
    } catch (err: any) {
      console.error('Publish update error:', err);
      setErrorMessage(err.message || 'Failed to publish app update.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b18]/40 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-[28px] border border-[#f0e4ea] bg-white p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#f7eef2]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0f5] text-[#c2185b]">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1d1b18] flex items-center gap-1.5">
                Upload New APK & In-App Update
                <Sparkles className="w-3.5 h-3.5 text-[#ff4081]" />
              </h2>
              <p className="text-xs text-[#6e6a63]">
                Save APK to GitHub Releases & notify connected devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#96918a] hover:bg-[#fff0f5] hover:text-[#c2185b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#ecfdf3] text-[#067647] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1d1b18]">
                New Update Published! 🌸
              </h3>
              <p className="mt-1 text-xs text-[#6e6a63] max-w-sm mx-auto">
                Version <strong>{versionName}</strong> (Code: {versionCode}) is now live. Connected devices will automatically receive the update prompt!
              </p>
            </div>

            {publishedUrl && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#ff4081] font-medium hover:underline"
              >
                <span>View APK in GitHub Releases</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#c2185b] hover:bg-[#ff4081] text-white text-xs font-semibold shadow-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="mt-4 space-y-4 text-xs">
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-[#fef3f2] border border-[#fecdca] text-[#b42318]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Version Name & Code */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#1d1b18] mb-1">
                  Version Name
                </label>
                <input
                  type="text"
                  required
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g. 1.0.2"
                  className="w-full px-3 py-2 rounded-xl border border-[#ebdce3] bg-[#fffcfd] text-[#1d1b18] focus:outline-none focus:border-[#ff4081]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1d1b18] mb-1">
                  Version Code
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={versionCode}
                  onChange={(e) => setVersionCode(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ebdce3] bg-[#fffcfd] text-[#1d1b18] focus:outline-none focus:border-[#ff4081]"
                />
              </div>
            </div>

            {/* Release Notes */}
            <div>
              <label className="block font-medium text-[#1d1b18] mb-1">
                Release Notes / Changelog 🌸
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's new in this build?"
                className="w-full px-3 py-2 rounded-xl border border-[#ebdce3] bg-[#fffcfd] text-[#1d1b18] focus:outline-none focus:border-[#ff4081]"
              />
            </div>

            {/* APK File Picker */}
            <div>
              <label className="block font-medium text-[#1d1b18] mb-1">
                Select APK File
              </label>
              <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-[#ebdce3] bg-[#fff9fb] hover:bg-[#fff0f5] transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-[#c2185b] mb-1.5" />
                <span className="font-medium text-[#1d1b18] truncate max-w-[280px]">
                  {selectedFile ? selectedFile.name : 'Choose or drop .apk file here'}
                </span>
                <span className="text-[10px] text-[#96918a] mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : 'Target: app-debug.apk / app-release.apk'}
                </span>
                <input
                  type="file"
                  accept=".apk"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct APK URL Alternative */}
            <div>
              <label className="block font-medium text-[#6e6a63] mb-1">
                Or Direct APK Download URL (optional)
              </label>
              <input
                type="url"
                value={directApkUrl}
                onChange={(e) => setDirectApkUrl(e.target.value)}
                placeholder="https://.../app-release.apk"
                className="w-full px-3 py-2 rounded-xl border border-[#ebdce3] bg-[#fffcfd] text-[#1d1b18] focus:outline-none focus:border-[#ff4081]"
              />
            </div>

            {/* GitHub Token */}
            <div>
              <label className="block font-medium text-[#6e6a63] mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-[#c2185b]" />
                  GitHub Token (for release upload)
                </span>
                <span className="text-[10px] text-[#96918a]">Repo: {GITHUB_REPO}</span>
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-3 py-2 rounded-xl border border-[#ebdce3] bg-[#fffcfd] text-[#1d1b18] focus:outline-none focus:border-[#ff4081] font-mono text-[11px]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={status !== 'idle' && status !== 'error'}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#ebdce3] bg-white text-[#6e6a63] font-medium hover:bg-[#faf8f9]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={status !== 'idle' && status !== 'error'}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-[#c2185b] hover:bg-[#ff4081] text-white font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {status === 'creating_release' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Release…</span>
                  </>
                ) : status === 'uploading_apk' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading APK to GitHub…</span>
                  </>
                ) : status === 'updating_firestore' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Broadcasting Update…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Publish & Update App 🚀</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
