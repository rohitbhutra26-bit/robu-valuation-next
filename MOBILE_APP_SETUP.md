# Robu Mobile App — Setup (Android)

## The simple idea

Think of the app as a **picture frame**. The frame (the Robu icon on your phone)
stays the same. The photo inside the frame is your live website,
`https://robu.up.railway.app`. Every time you `git push` and Railway redeploys,
the photo changes — so the app shows the new version **automatically**. You never
rebuild the app for normal updates. That is your auto-update.

You only build the APK **once**. After that, just keep pushing your web code like normal.

---

## What I added to your repo

| Thing | Where | What it does |
|---|---|---|
| Installable PWA | `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html`, `public/icons/` | Makes the website behave like an app (home-screen icon, offline screen). |
| Android wrapper | `mobile/` | A thin native app that shows your live site. |
| Cloud build | `.github/workflows/build-android.yml` | GitHub builds + signs the real `.apk` for you (no Android tools on your laptop). |
| Signing key | `mobile/robu-release.keystore` (kept out of git) | The stamp that signs your app so phones trust updates. **Keep it safe.** |

> Why a cloud build? Android's build tools only run on Intel chips. This machine
> is ARM, so the final `.apk` is built on GitHub's Intel servers instead.

---

## One-time setup (about 5 minutes)

### Step 1 — Add 3 secrets to GitHub

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**.
Add these three:

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_B64` | Paste the entire contents of `mobile/robu-release.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | `RobuValuation@2026` |
| `ANDROID_KEY_ALIAS` | `robu` |

> Open `mobile/robu-release.keystore.b64`, select all, copy, paste as the first secret.

### Step 2 — Push these files to GitHub

```bash
cd robu-valuation-next
git add public mobile .github src/app/layout.tsx MOBILE_APP_SETUP.md
git commit -m "Add installable PWA + Android app + cloud APK build"
git push
```

### Step 3 — Build the APK

The push above touches `mobile/`, so the build runs on its own. To build any time
manually: repo → **Actions → Build Android APK → Run workflow**.

When it finishes (~5 min), your APK is in two places:
- **Releases** (right sidebar of your repo) → download `robu-latest.apk`
- **Actions run → Artifacts → robu-apk**

---

## Install on your Android phone

1. Email/AirDrop/Drive the `.apk` to your phone, or open the Release page on the phone.
2. Tap the file. Android asks to **allow installing from this source** → allow it once.
3. Install. The Robu icon appears. Done.

Updating the app later: only needed if the **app shell** changes (rare). Because it's
signed with the same key, a new APK installs **right over** the old one — no uninstall.

---

## Day-to-day (the important part)

For normal changes (new features, fixes, data, design) you do **nothing extra**:

```
edit code  →  git push  →  Railway redeploys  →  phone shows new version
```

No new APK. No store. It just updates.

---

## iPhone (for later)

A free iPhone version takes 10 seconds, no build needed:
open `https://robu.up.railway.app` in **Safari → Share → Add to Home Screen**.
That gives a full-screen Robu icon that also auto-updates. (A real App Store app
needs a Mac + Apple Developer account, $99/year — skip unless you want store listing.)

---

## If a build ever fails

Open the failed run under **Actions** and read the red step. Most common causes:
a missing/renamed secret, or you edited `mobile/android/app/build.gradle`. The web
app and PWA are unaffected — your site keeps working regardless.
