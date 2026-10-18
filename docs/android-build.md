# Android-сборка (ветка `android`)

Android-версия — та же веб-игра из `main`, упакованная в Capacitor. На титульном экране два режима:

- **Wrong World** — основная игра, общая для всех платформ;
- **Android Runner MVP** — прототип вертикального раннера (`src/RunnerGame.tsx`), есть только в этой ветке.

## Как обновить игру из `main`

Сюжет и движок правятся в `main`. Чтобы Android получил свежую версию:

```powershell
git checkout android
git merge main
git push
```

После пуша GitHub Actions сам соберёт новый APK.

## Сборка APK в GitHub Actions

Workflow: `.github/workflows/android-debug-apk.yml`. Запускается при каждом пуше в ветку и вручную.

1. Откройте репозиторий на GitHub → **Actions** → **Build Android Debug APK**.
2. Для ручного запуска нажмите **Run workflow** и выберите ветку `android`.
3. Дождитесь окончания и скачайте артефакт **app-debug-apk** внизу страницы запуска.
4. Распакуйте архив — внутри `app-debug.apk`.

Что делает workflow:

1. Node.js 20, `npm ci` (Electron не скачивается — он нужен только PC-версии).
2. `npm run build` — сборка Vite в `dist/`.
3. `npx cap add android`, если папки `android/` нет, затем `npx cap sync android`.
4. Gradle wrapper 8.5, Android SDK 35, исключение дублирующихся модулей Kotlin.
5. JDK 21 и `./gradlew assembleDebug`.
6. Загрузка `android/app/build/outputs/apk/debug/app-debug.apk` как артефакта.

## Установка на телефон

Через ADB:

```powershell
adb install -r app-debug.apk
```

Или скопируйте `app-debug.apk` на телефон, откройте из «Файлов» и разрешите установку из этого источника.

## Настройки Capacitor

`capacitor.config.ts`:

- `appId`: `com.kotlew89.wrongworld`
- `appName`: `Wrong World`
- `webDir`: `dist`
- `server.androidScheme`: `https`

## Локальная сборка

Нужны JDK 21 и Android SDK. Локально загрузка `@capacitor/android` может падать с `403 Forbidden` за прокси — тогда используйте GitHub Actions.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

Сборка готова, только когда появился `android/app/build/outputs/apk/debug/app-debug.apk`.
