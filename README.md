# Wrong World

Wrong World is a small React game prototype built with Vite. It contains two in-app modes from the title screen:

- **Wrong World** — the original branching text adventure about dying, remembering why you died, and escaping a bugged isekai room.
- **Android Runner MVP** — a mobile-first portrait runner prototype inside the same React app shell.

## Web / NPM

Use npm for the web build. Do not add Yarn or pnpm lockfiles.

```powershell
npm install
npm run dev
npm run build
```

`npm run build` writes the Vite output to `dist/`.

## Android APK through GitHub Actions

Local Android setup may fail in proxied environments with `403 Forbidden` while downloading `@capacitor/android`. The supported APK path for that case is the GitHub Actions workflow:

1. Push the branch to GitHub.
2. Open the repository on GitHub.
3. Go to **Actions**.
4. Select **Android Debug APK**.
5. Click **Run workflow** and choose the branch.
6. Wait for the workflow to finish.
7. Open the completed workflow run and download the artifact named **app-debug-apk** from the artifacts section at the bottom of the page.
8. Unzip the artifact; it contains `app-debug.apk`.

The workflow is defined in `.github/workflows/android-debug-apk.yml`. It installs npm dependencies, builds the Vite app, creates `android/` with Capacitor if missing, runs `npx cap sync android`, builds `./gradlew assembleDebug`, and uploads:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Install APK on Android 15

Use either ADB:

```powershell
adb install -r app-debug.apk
```

Or copy `app-debug.apk` to the phone, open it from Files, and allow installs from that source when Android asks. After installation, open **Wrong World**; the Android shell contains both **Wrong World** and **Android Runner MVP**.

## Project start rules

- Keep source, config, docs, and small text files in normal Git.
- Keep large binary assets in Git LFS: art, audio, video, layered source files.
- Do not commit generated folders like `node_modules/` or `dist/`.
- Make a commit before large agent edits, then another commit after a working build.
