import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN || '';
const REPO = 'hemanshuturf-wq/tracker';
const APK_PATH = path.resolve('android/app/build/outputs/apk/debug/app-debug.apk');

const firebaseConfig = {
  apiKey: 'AIzaSyCVI8Dje9DmEaq1oUq5epaQjiYLpEz4Sug',
  authDomain: 'tracking-3cfac.firebaseapp.com',
  projectId: 'tracking-3cfac',
  storageBucket: 'tracking-3cfac.firebasestorage.app',
  messagingSenderId: '651442793153',
  appId: '1:651442793153:web:4feeea5b6ebca0d253c240',
};

async function publish() {
  if (!fs.existsSync(APK_PATH)) {
    console.error('APK file not found at:', APK_PATH);
    process.exit(1);
  }

  const stat = fs.statSync(APK_PATH);
  console.log(`Found APK (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`);

  const tag = `v1.0.${Math.floor(Date.now() / 60000) % 1000}`;
  const versionName = tag.replace('v', '');
  const versionCode = Math.floor(Date.now() / 1000);

  console.log(`Creating GitHub Release ${tag}...`);
  const releaseRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tag_name: tag,
      name: `AmiChan ${tag} 🌸`,
      body: '🌸 AmiChan feminine update with cute moods, real-time call tracking, and 24-hr Digital Wellbeing!',
      draft: false,
      prerelease: false,
    }),
  });

  if (!releaseRes.ok) {
    const err = await releaseRes.json();
    throw new Error(`Release creation failed: ${JSON.stringify(err)}`);
  }

  const release = await releaseRes.json();
  const uploadUrl = release.upload_url.replace(/\{(\?.*)?\}/, `?name=AmiChan-${tag}.apk`);

  console.log('Uploading APK asset to GitHub Release...');
  const fileBuffer = fs.readFileSync(APK_PATH);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/vnd.android.package-archive',
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(`Upload asset failed: ${JSON.stringify(err)}`);
  }

  const asset = await uploadRes.json();
  const downloadUrl = asset.browser_download_url;
  console.log(`APK uploaded! Download URL: ${downloadUrl}`);

  console.log('Updating app_updates/latest in Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  await setDoc(
    doc(db, 'app_updates', 'latest'),
    {
      versionCode,
      versionName,
      apkUrl: downloadUrl,
      notes: '🌸 AmiChan feminine update with cute moods, real-time call tracking, and 24-hr Digital Wellbeing!',
      publishedAt: Date.now(),
    },
    { merge: true },
  );

  console.log(`Published update v${versionName} (code: ${versionCode}) successfully!`);
}

publish().catch((err) => {
  console.error('Publish error:', err);
  process.exit(1);
});
