# Family Activity Admin Panel

Real-time admin dashboard for the Family Activity Android app. Connects to Firebase (project: `family-tracking-180a9`) and displays live event feed from Firestore.

## 🎯 Features

- **Email/Password Authentication** — Only the two authorized UIDs can sign in
- **Real-time Event Feed** — Live updates via Firestore `onSnapshot`
- **Advanced Filtering** — Search, event types, app filter, date ranges
- **Event Detail View** — Full field inspection with copy support
- **Responsive Design** — Mobile, tablet, desktop optimized
- **Dark Theme** — Matches Android app aesthetic
- **Accessible** — Proper ARIA, focus management, reduced motion support

## 📋 Prerequisites

Before running locally or deploying:

1. **Register a Web App in Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/project/family-tracking-180a9/settings/general)
   - Scroll to "Your apps" → Add app → Web (icon `</>`)
   - App nickname: `admin-panel`
   - **Do NOT** check "Firebase Hosting"
   - Copy the `firebaseConfig` object values

2. **Deploy Firestore Rules** (if not done)
   ```bash
   # From Android project root
   firebase deploy --only firestore:rules
   ```
   Or paste `firestore.rules` content into Firebase Console → Firestore → Rules → Publish

3. **Verify Auth Accounts Exist**
   - Firebase Console → Authentication → Users
   - Both accounts must exist: `parth@gmail.com` and `amisha@gmail.com`

## 🚀 Local Development

```bash
cd ~/Desktop/admin-panel

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Firebase web app config values

# Start dev server
npm run dev
```

Open http://localhost:5173

### Environment Variables (`.env.local`)

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=family-tracking-180a9
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Security Note**: These values are public by design (they end up in the JS bundle). Actual access control is enforced by Firestore rules on the server. Do NOT put secret keys in `.env.local`.

## 🏗️ Build & Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm run build
npx vercel --prod
```

### Option 2: GitHub + Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/admin-panel.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com) → Add New Project
   - Import your GitHub repository
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: `./` (default)

3. **Add Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add all 6 `VITE_FIREBASE_*` variables from `.env.local`
   - Apply to: Production, Preview, Development

4. **Deploy**
   - Click Deploy
   - Your URL will be like: `https://admin-panel-xyz.vercel.app`

## 📁 Project Structure

```
admin-panel/
├── public/
├── src/
│   ├── components/
│   │   ├── AppIcon.tsx          # Deterministic letter/emoji avatars
│   │   ├── EventCard.tsx        # Event list item with animations
│   │   ├── EventFilters.tsx     # Multi-filter bar (search, types, apps, dates)
│   │   └── Header.tsx           # Sticky header with user menu
│   ├── context/
│   │   └── AuthContext.tsx      # Firebase Auth state management
│   ├── pages/
│   │   ├── LoginPage.tsx        # Sign-in page with validation
│   │   ├── EventsPage.tsx       # Real-time event feed
│   │   └── EventDetailPage.tsx  # Full event detail view
│   ├── firebase.ts              # Firebase initialization
│   ├── types.ts                 # TypeScript types matching Android schema
│   ├── App.tsx                  # Routes + protected routes
│   ├── main.tsx                 # Entry point
│   └── index.css                # Design system + Tailwind
├── .env.local                   # Local Firebase config (gitignored)
├── .gitignore
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                  # SPA rewrites + security headers
├── package.json
└── README.md
```

## 🔐 Firestore Rules

The rules in `../android/firestore.rules` grant read/write access to exactly two UIDs:
- `y22eIUbwtxdmZFRtDSKabmgXrWQ2` (parth@gmail.com)
- `YLf3pl5On7S68Nnvlh50q4TP7Dv2` (amisha@gmail.com)

Both users see **identical data** — all events from all devices.

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | < 640px | Stacked, full-width cards, collapsible filters |
| Tablet | 640–1024px | 2-col stats, expanded filters |
| Desktop | > 1024px | 4-col stats, inline filters, side-by-side detail |

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0A` | Page background |
| `--bg-card` | `#161616` | Card surfaces |
| `--accent-green` | `#7FE07F` | Primary actions, success |
| `--accent-blue` | `#7FB0E0` | Sessions |
| `--accent-purple` | `#B090E0` | Notifications |
| `--accent-amber` | `#E0A050` | Calls/SMS |
| `--accent-teal` | `#50C0B0` | Package events |
| `--accent-red` | `#E05050` | Errors, device boot |

## 🧪 Verification Checklist

Before deploying, verify:

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Local login works for both accounts
- [ ] Events load and render correctly
- [ ] Real-time updates appear without refresh
- [ ] Filters work (search, types, apps, dates)
- [ ] Event detail page opens and shows all fields
- [ ] Copy-to-clipboard works on detail page
- [ ] Sign out redirects to login
- [ ] Mobile layout looks correct (test in DevTools)
- [ ] No console errors in production build

## 📄 License

Internal tool for Family Activity project.