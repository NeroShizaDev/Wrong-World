# Wrong World для Sega Mega Drive / Genesis

Порт той же игры, что в `main`: тот же сюжет, 26 смертей, обе концовки, память о смертях (⚡), игра в игре с порчей графики на глубоких слоях и коллекция. Сюжет не переписывается руками — он генерируется из `src/story.ts`.

| | |
|---|---|
| ![Титульный экран](docs/title.png) | ![Комната](docs/room.png) |
| ![Смерть](docs/death.png) | ![Третий слой игры в игре](docs/layer-3.png) |
| ![Озарение ⚡](docs/insight.png) | ![Концовка](docs/ending.png) |

## Управление

- Крестовина вверх/вниз — выбор.
- A или C — подтвердить; если текст не влез на экран — листать дальше.
- B — страница назад, выход из коллекции.
- START — коллекция смертей и концовок.

Прогресс (смерти, память, концовки, прошлая смерть) сохраняется в SRAM картриджа.

## Сборка ROM

### GitHub Actions

Workflow `.github/workflows/sega-rom.yml` запускается при каждом пуше в ветку `sega` и вручную (**Actions → Build Sega Mega Drive ROM → Run workflow**). Он проверяет, что данные совпадают с `src/story.ts`, собирает ROM в SGDK 2.11 и выкладывает артефакт **wrong-world-megadrive-rom** с файлом `rom.bin`.

### Локально через Docker

```bash
docker run --rm -v "$PWD/sega:/m68k" registry.gitlab.com/doragasu/docker-sgdk:v2.11
```

Готовый ROM: `sega/out/rom.bin`. Запускается в любом эмуляторе Mega Drive (BlastEm, Genesis Plus GX в RetroArch, Kega Fusion) или на флеш-картридже.

### Локально через SGDK на Windows

Установите [SGDK 2.11](https://github.com/Stephane-D/SGDK) и Java, затем в папке `sega`:

```powershell
%GDK%\bin\make -f %GDK%\makefile.gen
```

## Как обновить сюжет

Сюжет правится в `main`, в `src/story.ts`. Потом:

```powershell
git checkout sega
git merge main
node sega/tools/export-story.mjs
git add sega/src
git commit -m "Update Mega Drive story data"
```

`node sega/tools/export-story.mjs --check` (так делает CI) падает, если данные устарели. Если в тексте появился символ, которого нет в шрифте, экспорт назовёт его — глиф добавляется в `sega/tools/font.mjs`.

## Что внутри

- `src/main.c` — экран, управление, коллекция, концовки, сохранение в SRAM (SGDK).
- `src/ww_engine.c`, `src/ww_engine.h` — движок без привязки к железу: условия, сцены, смерти, игра в игре, перенос строк.
- `src/story_data.c`, `src/story_data.h`, `src/font_data.c` — **сгенерированы** `tools/export-story.mjs`, вручную не правятся.
- `src/boot/rom_head.c` — заголовок ROM с названием игры и объявленной SRAM.
- `tools/font.mjs` — шрифт 8×8: латиница, кириллица, цифры, знаки и значки игры. В ROM попадают только символы, которые встречаются в тексте.
- `tools/host_test.c`, `tools/host-test.cmd` — проверка движка обычным компилятором (Windows + Visual Studio Build Tools): обе концовки по сценарию, игра в игре, прах прошлого вас и случайное блуждание на 300 000 ходов без переполнений.
- `tools/screen_preview.c`, `tools/screen-preview.cmd` — снимки экранов из настоящего `main.c` с заглушками VDP, без эмулятора. Скриншоты выше сделаны так.
- `tools/sgdk_stub/genesis.h` — объявления SGDK 2.11 для этих проверок.

## Чего пока нет

- Музыки и звуков: MP3 на Mega Drive не играет, треки нужно переложить в XGM/VGM.
- Картинки комнаты: титульный экран и сцены текстовые.
