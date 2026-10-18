// Скриншоты PC-версии для README: npm run screenshots (собирает игру и снимает её в окне Electron 1280×720).
// Игра проходится кликами по тексту кнопок, снимки ложатся в docs/screens/*.png.
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const outDir = path.join(__dirname, "../docs/screens");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 720, show: false, backgroundColor: "#0a0a12" });
  const run = (code) => win.webContents.executeJavaScript(code);

  const click = async (text) => {
    const found = await run(`(() => {
      const button = [...document.querySelectorAll("button")]
        .filter((b) => b.offsetParent !== null)
        .find((b) => (b.getAttribute("aria-label") || b.innerText).includes(${JSON.stringify(text)}));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!found) throw new Error(`Нет кнопки «${text}»`);
    await wait(150);
  };

  const shot = async (name) => {
    await wait(500);
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, `${name}.png`), image.toPNG());
    console.log(`docs/screens/${name}.png`);
  };

  const play = async (...steps) => {
    for (const step of steps) await click(step);
  };

  try {
    fs.mkdirSync(outDir, { recursive: true });
    await win.loadFile(path.join(__dirname, "../dist/index.html"));
    await run("localStorage.clear()");
    await win.reload();
    await wait(800);

    await shot("title");
    await play("ПРОСНУТЬСЯ", "Осторожно встать");
    await shot("room");

    await play("Подойти к компьютеру", "Сесть на стул");
    await shot("death");

    await play("Открыть глаза", "Осторожно встать", "Подойти к компьютеру", "Сесть на стул");
    await play("Запустить «Wrong World Demo»", "Запустить игру на компьютере в игре");
    await shot("game-in-game");

    await play("Запустить игру на компьютере в игре", "Запустить игру на компьютере в игре");
    await play("Открыть глаза", "Осторожно встать", "Подойти к кактусу", "Потрогать кактус");
    await play("Открыть глаза", "Осторожно встать", "Подойти к двери", "Открыть курьеру");
    await play("Открыть глаза", "Осторожно встать", "Подойти к кактусу", "Протянуть ладонь");
    await play("Заняться чайником", "пока кактус сторожит", "Подойти к двери", "Сделать вид", "довериться кактусу");
    await shot("cactus");
    await play("Выйти во двор");
    await shot("ending");

    await play("ИГРАТЬ ДАЛЬШЕ", "Коллекция");
    await shot("collection");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }

  app.quit();
});
