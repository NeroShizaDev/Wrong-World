# Wrong World

Wrong World is a small React game prototype built with Vite. It currently runs as a branching text adventure about dying, remembering why you died, and using that knowledge to break out of a bugged isekai room.

## Commands

```powershell
npm install
npm run dev
npm run build
```

## Project start rules

- Keep source, config, docs, and small text files in normal Git.
- Keep large binary assets in Git LFS: art, audio, video, layered source files.
- Do not commit generated folders like `node_modules/` or `dist/`.
- Make a commit before large agent edits, then another commit after a working build.

## Current loop

- `ПРОСНУТЬСЯ` starts the run.
- Each death unlocks memory and adds an entry to the death collection.
- Some choices appear only after the player has learned from previous deaths.
- The computer can launch nested copies of the game with degrading graphics modes.
- Death and memory collection progress is saved in browser `localStorage`.
- `Arts/wrong-world-menu-v2.png` is used for both the title screen and the first room scene.
- Music cues are mapped by scene: boot menu, main game loop, window death, regular deaths, and victory.


## Web / NPM direction

Use npm for the existing React/Vite prototype:

```powershell
npm install
npm run dev
npm run build
```

The title screen now presents two in-app modes:

- **Wrong World** — the original branching text adventure.
- **Android Runner MVP** — the mobile-first portrait runner prototype.

## Android direction

Android packaging is prepared through Capacitor in `capacitor.config.ts` with:

- app id: `com.kotlew89.wrongworld`
- app name: `Wrong World`
- web output: `dist`

Recommended local setup after registry access is available:

```powershell
npm run android:install
npm run android:init
npm run android:sync
npm run android:build
```

The expected debug APK path after a successful Gradle build is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

If npm returns `403 Forbidden` for `@capacitor/*`, fix registry/proxy/auth access and rerun `npm run android:install`. This environment blocked Capacitor package downloads, so `android/` and an APK may need to be generated locally. Full instructions are in `docs/android-build.md`.
