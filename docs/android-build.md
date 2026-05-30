# Android build path

This repository has two development directions that share the same source app:

1. **NPM/Web** — the regular Vite/React/PWA app.
2. **Android** — the same Vite build packaged with Capacitor into one Android app shell.

The Android shell is intended to expose both in-app modes from the title screen:

- **Wrong World** — the original text adventure.
- **Android Runner MVP** — the portrait absurd runner prototype.

## Package manager

Use **npm** only. The repository has `package-lock.json`; do not add Yarn or pnpm lockfiles.

## Web commands

```bash
npm install
npm run dev
npm run build
```

`npm run build` writes the web payload to `dist/`, which is the Capacitor `webDir`.

## Capacitor configuration

The root `capacitor.config.ts` is prepared for Capacitor:

- `appId`: `com.kotlew89.wrongworld`
- `appName`: `Wrong World`
- `webDir`: `dist`
- `bundledWebRuntime`: `false`
- Android background color aligned with the app theme

## First Android setup

Run these commands after the npm registry is reachable from your environment:

```bash
npm run android:install
npm run android:init
npm run android:doctor
```

`android:install` installs:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android --save
```

`android:init` runs a production web build and then creates the native Android project:

```bash
npm run build
npx --no-install cap add android
```

## Preflight / doctor

Use the doctor script to check the registry, Capacitor dependencies, `android/`, Java, Android SDK environment variables, and Gradle wrapper status:

```bash
npm run android:doctor
```

It exits non-zero until the local machine has enough Android tooling to build an APK.

## Syncing web changes into Android

After changing React/Vite code:

```bash
npm run android:sync
```

This runs `npm run build` and then `npx --no-install cap sync android`.

## Opening Android Studio

```bash
npm run android:open
```

This delegates to:

```bash
npx --no-install cap open android
```

## Building a debug APK

After `android/` exists:

```bash
npm run android:build
```

The expected debug APK path is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

You can also run Gradle directly:

```bash
cd android
./gradlew assembleDebug
```

## Portrait/fullscreen notes

The web app is already mobile-first for the runner mode:

- the PWA manifest requests `orientation: "portrait"` and `display: "fullscreen"`;
- the HTML viewport uses `viewport-fit=cover` for safe-area screens;
- runner CSS disables page gestures inside the game area with `touch-action: none`;
- both modes remain available inside the same Android app shell.

After `npx --no-install cap add android` succeeds, verify the generated Android project and, if needed, set `android:screenOrientation="portrait"` on `MainActivity` in `android/app/src/main/AndroidManifest.xml`. App icons can stay as generated placeholders for MVP; replace them in a later polish pass.

## If the registry blocks Capacitor

In this environment, npm returned `403 Forbidden` while trying to fetch Capacitor packages. If that happens locally:

1. Check registry/auth/proxy settings:

   ```bash
   npm config get registry
   npm whoami
   ```

2. Retry the install when registry access is fixed:

   ```bash
   npm run android:install
   npm run android:init
   npm run android:sync
   npm run android:doctor
   ```

3. Do not claim an APK is built until `npx --no-install cap sync android` and `./gradlew assembleDebug` have actually succeeded.

## Phase 2 option: separate APKs/flavors

The MVP path is one APK with two internal modes. If separate artifacts become useful later, add Android product flavors after the base `android/` project exists, for example:

- `wrongWorld` flavor opens the text adventure by default;
- `runner` flavor opens the runner by default.

Do this only after the single-APK Capacitor path is stable.
