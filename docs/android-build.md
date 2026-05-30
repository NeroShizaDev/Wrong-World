# Android debug APK build

Android APK builds are handled by GitHub Actions because this local environment can return `403 Forbidden` when downloading `@capacitor/android`.

## Capacitor settings

The app uses `capacitor.config.ts`:

- `appId`: `com.kotlew89.wrongworld`
- `appName`: `Wrong World`
- `webDir`: `dist`
- `server.androidScheme`: `https`

## CI workflow

Workflow file:

```text
.github/workflows/android-debug-apk.yml
```

It runs on manual dispatch and pushes to `main`, `master`, and `android`. The job:

1. checks out the repository;
2. sets up Node.js 20 with npm cache;
3. runs `npm install`;
4. runs `npm run build`;
5. ensures `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android` are installed;
6. runs `npx cap add android` when `android/` is absent;
7. runs `npx cap sync android`;
8. sets up JDK 17 and Android SDK;
9. runs `chmod +x gradlew && ./gradlew assembleDebug` in `android/`;
10. uploads `android/app/build/outputs/apk/debug/app-debug.apk` as the artifact `app-debug-apk`.

## Manual GitHub run

1. Open **Actions** in GitHub.
2. Select **Android Debug APK**.
3. Click **Run workflow**.
4. Download **app-debug-apk** from the completed run.
5. Install `app-debug.apk` with `adb install -r app-debug.apk` or from the phone file manager.

## Local commands when registry is available

If your local machine can download Capacitor packages and has Android SDK/JDK installed, the equivalent local commands are:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleDebug
```

Do not treat local Android as ready until `android/app/build/outputs/apk/debug/app-debug.apk` exists.
