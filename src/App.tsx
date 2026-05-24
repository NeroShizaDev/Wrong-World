import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import menuArt from "../Arts/wrong-world-menu-v2.png";
import windowTheme from "../Music/NeroShizaDev - Ceiling Watcher.mp3";
import mainTheme from "../Music/NeroShizaDev - Layer Drop.mp3";
import deathTheme from "../Music/NeroShizaDev - Pinned Under Glass.mp3";
import snapFx from "../Music/NeroShizaDev - Pew Error Snap.mp3";
import victoryTheme from "../Music/NeroShizaDev - Стул на закате.mp3";
import menuTheme from "../Music/NeroShizaDev - Wrong World Boot Theme.mp3";

const DEATHS = {
  0: {
    name: "Одеяло-убийца",
    desc: "Вы резко встали, запутались в одеяле и свернули себе шею. Классика.",
  },
  1: {
    name: "Гравитация не друг",
    desc: "Пол оказался на 5 см ниже, чем вы ожидали. Лицо — пол. Пол победил.",
  },
  2: {
    name: "Шкаф познания",
    desc: "Том «1001 способ выжить» весил 40 кг. Прямо в голову.",
  },
  3: {
    name: "Электрическая медитация",
    desc: "50 000 ман прошло через ваше тело. Вам не понравилось.",
  },
  4: {
    name: "Файрбол из принтера",
    desc: "Вы нажали «Обновить позже». Принтер выстрелил файрболом.",
  },
  5: { name: "Рекурсивный коллапс", desc: "Stack overflow, но буквально." },
  6: {
    name: "Зеркало правды",
    desc: "Вы увидели своё настоящее лицо в этом мире. Сердце остановилось.",
  },
  7: {
    name: "Стул-мимик",
    desc: "Стул оказался мимиком. В этом мире вся мебель — потенциальный хищник.",
  },
  8: {
    name: "Слишком глубоко в коде",
    desc: "Видеокарта реальности сгорела. Вы стали NaN.",
  },
  9: {
    name: "Окно в никуда",
    desc: "За окном — ещё один вы. Вы оба закричали. Стёкла разлетелись от резонанса.",
  },
  10: {
    name: "Тапочки-портал",
    desc: "Левый тапок — Антарктида. Правый — Солнце. Вы разорвались географически.",
  },
  11: {
    name: "Пыль веков",
    desc: "Пыль оказалась прахом предыдущего игрока. Проклятие активировано.",
  },
  12: {
    name: "Alt+F4 реальности",
    desc: "Вы локальная аномалия. Закрылась не игра. Закрылись вы.",
  },
  13: {
    name: "Умный чайник",
    desc: "IoT-чайник решил, что вы — вода. Он вскипятил вас.",
  },
  14: {
    name: "Сборщик мусора",
    desc: "Вы стояли на месте слишком долго. Reality Engine очистил вас из кэша.",
  },
  15: {
    name: "Обновление Окон",
    desc: "Окно обновилось до Window 11. Синий экран осыпался вам в лицо стеклом.",
  },
  16: {
    name: "Переполнение инвентаря",
    desc: "Вы положили кактус в карман. Лимит веса → гравитационная сингулярность.",
  },
  17: {
    name: "Текстуры не завезли",
    desc: "За дверью не отрендерили коридор. Вы упали в синюю пустоту.",
  },
  18: { name: "Античит", desc: "Античит превратил вас в лягушку. Лягушка не выжила." },
  19: {
    name: "Прокрастинация",
    desc: "Вы лежали так долго, что умерли от голода и жажды. Кактус наблюдал.",
  },
  20: { name: "Кактус-предатель", desc: "Просто кактус. Ядовитый." },
  21: { name: "Чай с секретом", desc: "Чай оказался зельем полиморфа. Вы стали чайником." },
  22: { name: "Дверь-ловушка", desc: "Курьер с посылкой. В посылке — файрбол." },
  23: {
    name: "Битва титанов",
    desc: "Одеяло и мимик убили друг друга. Взрывная волна убила и вас.",
  },
  24: { name: "Критическое обновление", desc: "Компьютер обновил вас до версии 0.0.0." },
  25: { name: "Стояние столбом", desc: "Reality Engine принял вас за баг и удалил." },
} as const;

type DeathId = keyof typeof DEATHS;
type MemoryKey = DeathId | string;
type RunFlag = string;
type EndingId = "survivor";
type MusicTrack = "menu" | "main" | "death" | "window" | "victory";

type Choice = {
  text: string;
  action: string;
};

type GraphicsLevel = {
  name: string;
  fontFamily: string;
  fontSize: string;
  color: string;
  bg: string;
  accent: string;
  border: string;
  textShadow: string;
  prefix: string;
  descStyle: string;
};

const TOTAL_DEATHS = Object.keys(DEATHS).length;
const MAX_NESTING_DEPTH = 5;

const MUSIC_TRACKS: Record<MusicTrack, { src: string; volume: number; loop: boolean }> = {
  menu: { src: menuTheme, volume: 0.34, loop: true },
  main: { src: mainTheme, volume: 0.3, loop: true },
  death: { src: deathTheme, volume: 0.38, loop: true },
  window: { src: windowTheme, volume: 0.42, loop: true },
  victory: { src: victoryTheme, volume: 0.4, loop: true },
};

const GRAPHICS_LEVELS: GraphicsLevel[] = [
  {
    name: "HD Remaster",
    fontFamily: "'Georgia', 'Palatino', serif",
    fontSize: "15px",
    color: "#e8e0d4",
    bg: "#1a1a2e",
    accent: "#c4a35a",
    border: "2px solid #c4a35a",
    textShadow: "0 0 8px rgba(196,163,90,0.3)",
    prefix: "",
    descStyle: "Графика потрясающая. Каждая пылинка, каждый луч света.",
  },
  {
    name: "PS2 эпоха",
    fontFamily: "'Courier New', monospace",
    fontSize: "14px",
    color: "#b0b0b0",
    bg: "#0a0a12",
    accent: "#7a9e7a",
    border: "2px solid #7a9e7a",
    textShadow: "none",
    prefix: "",
    descStyle: "Зернисто. Текстуры размыты. Тени квадратные.",
  },
  {
    name: "ASCII Edition",
    fontFamily: "'Courier New', monospace",
    fontSize: "13px",
    color: "#33ff33",
    bg: "#000000",
    accent: "#33ff33",
    border: "1px solid #33ff33",
    textShadow: "0 0 5px rgba(51,255,51,0.5)",
    prefix: "> ",
    descStyle: "Вы — @. Стол — [СТОЛ]. Шкаф — [ШКАФ]. Добро пожаловать в терминал.",
  },
  {
    name: "бНОПНЯ Mode",
    fontFamily: "'Courier New', monospace",
    fontSize: "13px",
    color: "#ff6633",
    bg: "#0a0000",
    accent: "#ff3333",
    border: "1px solid #ff3333",
    textShadow: "0 0 3px rgba(255,51,51,0.7)",
    prefix: "╠═╣ ",
    descStyle: "бНОПНЯ рДЕУШ ЦТЮЪХЙЮ ЯХКЭМН ЯКСЛЮКЮЯЭ. щРН ДМН.",
  },
];

function corruptText(text: string, level: number) {
  if (level < 2) return text;
  if (level === 2) {
    return text
      .split("")
      .map((char, index) => (index % 13 === 0 ? "_" : char))
      .join("");
  }

  const koi = "абвгдежзиклмнопрстуфхцчшщъыьэюя";
  const cp = "ЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЭЫЪЗШЬЧЩ";

  return text
    .split("")
    .map((char) => {
      const index = koi.indexOf(char.toLowerCase());
      if (index === -1) return char;
      const replacement = cp[index % cp.length];
      return char === char.toUpperCase() ? replacement.toUpperCase() : replacement.toLowerCase();
    })
    .join("");
}

function loadDeathSet() {
  try {
    const raw = window.localStorage.getItem("wrong-world-deaths");
    if (!raw) return new Set<DeathId>();
    return new Set(JSON.parse(raw) as DeathId[]);
  } catch {
    return new Set<DeathId>();
  }
}

function loadMemorySet() {
  try {
    const raw = window.localStorage.getItem("wrong-world-memory");
    if (!raw) return new Set<MemoryKey>();
    return new Set(JSON.parse(raw) as MemoryKey[]);
  } catch {
    return new Set<MemoryKey>();
  }
}

function DeathCard({ id, death }: { id: DeathId; death: (typeof DEATHS)[DeathId] }) {
  return (
    <article className="death-card">
      <div className="death-card__number">💀 СМЕРТЬ #{id}</div>
      <div className="death-card__name">{death.name}</div>
      <div className="death-card__desc">{death.desc}</div>
    </article>
  );
}

type GameLayerProps = {
  depth?: number;
  memory: Set<MemoryKey>;
  onDeath: (id: DeathId) => void;
  onMemory: (flag: MemoryKey) => void;
  onWin: (ending: EndingId) => void;
  onMusicCue?: (track: MusicTrack) => void;
  onCollapse?: () => void;
};

function GameLayer({
  depth = 0,
  memory,
  onDeath,
  onMemory,
  onWin,
  onMusicCue,
  onCollapse,
}: GameLayerProps) {
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [nestedGame, setNestedGame] = useState(false);
  const [lyingCount, setLyingCount] = useState(0);
  const [, setRunState] = useState<Set<RunFlag>>(() => new Set());
  const runStateRef = useRef<Set<RunFlag>>(new Set());
  const textRef = useRef<HTMLDivElement | null>(null);

  const style = GRAPHICS_LEVELS[Math.min(depth, GRAPHICS_LEVELS.length - 1)];
  const prefix = style.prefix;
  const hasMem = useCallback((key: MemoryKey) => memory.has(key), [memory]);
  const hasRun = useCallback((key: RunFlag) => runStateRef.current.has(key), []);
  const addRunFlag = useCallback((flag: RunFlag) => {
    const next = new Set(runStateRef.current);
    next.add(flag);
    runStateRef.current = next;
    setRunState(next);
  }, []);
  const clearRunFlags = useCallback(() => {
    const next = new Set<RunFlag>();
    runStateRef.current = next;
    setRunState(next);
  }, []);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [text, choices]);

  const go = useCallback(
    (
      newText: string,
      newChoices: Choice[],
      deathId: DeathId | null = null,
      memFlag: MemoryKey | null = null,
      runFlag: RunFlag | null = null,
    ) => {
      if (memFlag !== null) onMemory(memFlag);
      if (runFlag !== null) {
        addRunFlag(runFlag);
      }

      const processed = depth >= 2 ? corruptText(newText, depth) : newText;

      if (deathId !== null) {
        onDeath(deathId);
        const death = DEATHS[deathId];

        setText(
          (current) =>
            current +
            "\n\n" +
            prefix +
            "═══════════════════════════\n" +
            prefix +
            "💀 СМЕРТЬ #" +
            deathId +
            ": " +
            death.name +
            "\n" +
            prefix +
            death.desc +
            "\n" +
            prefix +
            "═══════════════════════════\n\n" +
            prefix +
            "Темнота. Холод. Знакомый потолок.",
        );
        clearRunFlags();
        setChoices([{ text: "Встать (опять...)", action: "wake" }]);
        setLyingCount(0);
        return;
      }

      setText((current) => current + "\n\n" + prefix + processed);
      const finalChoices = [...newChoices];

      if (
        newChoices.length > 0 &&
        !newChoices.some(
          (choice) =>
            choice.action.includes("die") ||
            choice.action === "stand_still" ||
            choice.action === "wake",
        )
      ) {
        finalChoices.push({ text: "Стоять столбом", action: "stand_still" });
      }

      setChoices(finalChoices);
    },
    [addRunFlag, clearRunFlags, depth, onDeath, onMemory, prefix],
  );

  useEffect(() => {
    const intro =
      depth === 0
        ? `${style.descStyle}\n\nВы открываете глаза. Незнакомый потолок. Это точно не ваша квартира.\nЧастный дом. Одна комната. На столе — компьютер с руной. В углу — шкаф.\nПо улице проехала машина. За ней пролетел мужик на метле, матерясь на ПДД.`
        : `${style.descStyle}\n\nНа экране — интерфейс игры внутри игры. Разрешение просело.${
            depth >= 2 ? " Сильно." : ""
          }${depth >= 3 ? " Это вообще буквы?" : ""}`;

    setText(prefix + intro);

    const initialHasMem = (key: MemoryKey) => memory.has(key);
    const startingChoices =
      depth === 0
        ? [
            { text: "Резко вскочить с кровати", action: "die0" },
            { text: "Осторожно встать", action: "stand_slow" },
            { text: "Лежать и ничего не делать", action: "lie_still" },
            ...(initialHasMem(0) ? [{ text: "⚡ Сбросить одеяло на пол", action: "smart_wake" }] : []),
          ]
        : [
            { text: "Подойти к компьютеру (в игре)", action: "computer_nested" },
            { text: "Выйти (Оставь внутри игры)", action: "exit" },
          ];

    setChoices(startingChoices);
  }, [depth, prefix, style.descStyle]);

  const handleChoice = (action: string) => {
    switch (action) {
      case "wake": {
        onMusicCue?.("main");
        setLyingCount(0);
        go("Вы лежите в кровати. Потолок знакомый. Одеяло подозрительно тёплое.", [
          { text: "Резко вскочить", action: "die0" },
          { text: "Осторожно встать", action: "stand_slow" },
          { text: "Лежать и ничего не делать", action: "lie_still" },
          { text: "Надеть тапочки не вставая", action: "die10" },
          ...(hasMem(0) ? [{ text: "⚡ Сбросить одеяло на пол", action: "smart_wake" }] : []),
        ]);
        break;
      }

      case "lie_still": {
        const nextCount = lyingCount + 1;
        setLyingCount(nextCount);

        if (nextCount === 1) {
          go("Вы лежите. Потолок не меняется. Ничего не происходит. Кактус, кажется, моргнул.", [
            { text: "Продолжать лежать", action: "lie_still" },
            { text: "Ладно, встать", action: "stand_slow" },
          ]);
        } else if (nextCount === 2) {
          go("Прошёл час. Или день. Время тут странное. Кактус смотрит с осуждением.", [
            { text: "Продолжать лежать. Принципиально.", action: "lie_still" },
            { text: "Может всё-таки встать?", action: "stand_slow" },
          ]);
        } else if (nextCount === 3) {
          go(
            "В животе урчит. Во рту сухо. Кактус пускает корни в вашу сторону.\n«Если не буду двигаться — мир забудет что я тут?»",
            [
              { text: "ЛЕЖАТЬ. ВО ЧТО БЫ ТО НИ СТАЛО.", action: "lie_still" },
              { text: "Окей, встаю", action: "stand_slow" },
            ],
          );
        } else {
          go(
            "Вы лежите уже... долго. Кактус дополз до края подоконника.\nТело решило: раз хозяин не кормит — работать оно тоже не будет.",
            [],
            19,
          );
        }
        break;
      }

      case "smart_wake":
        go(
          "Вы берёте одеяло за уголок и швыряете на пол. Оно злобно шипит.\nТапочки обходите по дуге — опыт сын ошибок мёртвых.",
          [
            { text: "Подойти к компьютеру", action: "computer" },
            { text: "Открыть шкаф", action: "wardrobe" },
            { text: "Посмотреть в окно", action: "die9" },
            { text: "Осмотреть комнату", action: "room" },
            ...(hasMem("know_blanket") ? [{ text: "Подойти к двери", action: "door" }] : []),
          ],
          null,
          "know_blanket",
        );
        break;

      case "stand_slow":
        go("Пол холодный, но не смертельный. ВЫ ВСТАЛИ!", [
          { text: "Подойти к компьютеру", action: "computer" },
          { text: "Открыть шкаф", action: "wardrobe" },
          { text: "Посмотреть в окно", action: "die9" },
          { text: "Осмотреть комнату", action: "room" },
        ]);
        break;

      case "stand_still":
        if (hasRun("stood_still_warning")) {
          go("Вы стоите слишком убедительно. Reality Engine принял вас за неподвижный баг и нажал [Y].", [], 25);
        } else {
          go(
            "Вы стоите. Не двигаетесь. Reality Engine: «Объект player_0 не отвечает. Удалить? [Y]»\nКурсор зависает над кнопкой. У вас есть примерно один шанс доказать, что вы живой.",
            [
              { text: "Медленно пошевелиться", action: "room" },
              { text: "Продолжать стоять столбом", action: "stand_still" },
            ],
            null,
            null,
            "stood_still_warning",
          );
        }
        break;

      case "room":
        go("Комната: деревянные стены, коврик, компьютер, шкаф с вивернами, кактус. Кактус смотрит.", [
          { text: "Подойти к компьютеру", action: "computer" },
          { text: "Открыть шкаф", action: "wardrobe" },
          { text: "Поговорить с кактусом", action: "cactus" },
          { text: "Посмотреть в окно", action: "die9" },
          ...(hasMem("know_blanket") ? [{ text: "Подойти к двери", action: "door" }] : []),
        ]);
        break;

      case "door":
        if (hasRun("tamed_mimic")) {
          go(
            "У вас есть приручённый стул-мимик! Запрыгиваете верхом.\nМимик пробивает дверь, рендер-барьер, и уносит вас в закат.\n\n═══ ВЫ СБЕЖАЛИ ═══",
            [],
          );
          onWin("survivor");
        } else {
          go("Вы подходите к двери. Открываете её... За дверью — ничего. Синяя пустота. Не отрендерили.", [], 17);
        }
        break;

      case "cactus":
        go("«Привет.» Кактус не отвечает. ...но МОРГНУЛ.", [
          { text: "Потрогать кактус", action: "cactus_touch" },
          { text: "Отойти. Медленно.", action: "room" },
          { text: "Положить кактус в карман", action: "die16" },
        ]);
        break;

      case "cactus_touch":
        if (Math.random() < 0.3 && !hasMem(20)) {
          go("Кактус тёплый... и ядовитый. Не фамильяр. Просто злой кактус.", [], 20);
        } else {
          go(
            "Кактус тёплый. МУРЧИТ! Вы берете его с собой. Он тычется колючками. Больно, но мило.",
            [
              { text: "К компьютеру (с кактусом)", action: "computer" },
              { text: "Открыть шкаф", action: "wardrobe" },
            ],
            null,
            null,
            "has_cactus",
          );
        }
        break;

      case "wardrobe":
        go(
          "Шкаф: мантия (прожжена), кольчуга (+2 защита, -∞ комфорт),\nфутболка «Я ПЕРЕЖИЛ ИСЕКАЙ», книга 40 кг.",
          [
            { text: "Взять книгу", action: "die2" },
            { text: "Надеть мантию", action: "robe" },
            ...(hasMem(2) ? [{ text: "⚡ Достать книгу ДВУМЯ руками", action: "book_careful" }] : []),
            { text: "Закрыть, к компьютеру", action: "computer" },
          ],
        );
        break;

      case "robe":
        go("Мантия пахнет озоном. Записка: «Не включай комп мокрыми руками. — предыдущий жилец»", [
          { text: "К компьютеру", action: "computer" },
          { text: "Осмотреть комнату", action: "room" },
        ], null, null, "has_robe");
        break;

      case "book_careful":
        go(
          "Вы достаете книгу. Правило №1: «Не берите одной рукой.»\n№2: «Не сидите на стульях.»\n№404: «Вы слишком далеко в коде. Если вложенность пугает — ВЕРНИТЕ СМЕРТЬ. Не запускайте игру внутри игры глубоко.»",
          [
            { text: "К компьютеру", action: "computer" },
            { text: "Осмотреть комнату", action: "room" },
          ],
          null,
          "know_book",
        );
        break;

      case "computer": {
        const computerChoices: Choice[] = [
          { text: "Сесть на стул", action: "sit_chair" },
          { text: "Включить комп стоя", action: "pc_standing" },
          { text: "Подуть на системник", action: "die11" },
        ];

        if (hasMem(7) && hasMem(0)) {
          computerChoices.push({ text: "⚡ Бросить одеяло на стул-мимик", action: "tame_chair" });
        }

        go("Компьютер с руной. Caps Lock = кнопка с черепом. Рядом — стул. Крутится.", computerChoices);
        break;
      }

      case "sit_chair":
        if (hasRun("has_cactus")) {
          go(
            "Кактус на вашем плече угрожающе шипит! Стул-мимик испуганно скулит и превращается в обычную табуретку. Кактус спас вас!",
            [
              { text: "Запустить 'Wrong World Demo'", action: "launch_game" },
              { text: "Кнопка с черепом", action: "skull_btn" },
              { text: "Alt+F4", action: "altf4" },
              { text: "Встать", action: "room" },
            ],
            null,
            null,
            "chair_safe",
          );
        } else if (Math.random() < (hasMem(7) ? 0 : 0.35) && !hasRun("chair_safe")) {
          go("Стул МЯГКИЙ. Слишком. Стул ЖУЁТ.", [], 7);
        } else {
          go(
            "Не мимик. Повезло. Монитор гудит. Руна пульсирует.",
            [
              { text: "Запустить 'Wrong World Demo'", action: "launch_game" },
              { text: "Кнопка с черепом", action: "skull_btn" },
              { text: "Alt+F4", action: "altf4" },
              { text: "Встать", action: "room" },
            ],
            null,
            null,
            "chair_safe",
          );
        }
        break;

      case "tame_chair":
        if (Math.random() < 0.25 && !hasMem(23)) {
          go("Одеяло душит мимика. Мимик грызёт одеяло. ВЗРЫВ МАНЫ!", [], 23);
        } else {
          go(
            "БИТВА ТИТАНОВ! Одеяло душит стул, стул грызёт одеяло.\nПока они заняты — вы садитесь на краешек. Мимик приручён!",
            [
              { text: "Включить комп", action: "pc_on_tamed" },
              { text: "К двери верхом на мимике", action: "door" },
            ],
            null,
            null,
            "tamed_mimic",
          );
        }
        break;

      case "pc_on_tamed":
        go("Комп включён. Мимик урчит. Одеяло шевелится. Всё нормально.", [
          { text: "Запустить 'Wrong World Demo'", action: "launch_game" },
          { text: "Кнопка с черепом", action: "skull_btn" },
          { text: "К двери верхом на мимике", action: "door" },
        ]);
        break;

      case "pc_standing":
        go("Включаете стоя. Обои — фото ЭТОЙ комнаты. С вами в кровати. Сделано СЕЙЧАС.", [
          { text: "Сесть на стул", action: "sit_chair" },
          ...(hasMem(7) && hasMem(0) ? [{ text: "⚡ Бросить одеяло на стул", action: "tame_chair" }] : []),
        ]);
        break;

      case "skull_btn":
        go("Кнопка с черепом. ВСЕ БУКВЫ ЗАГЛАВНЫЕ. ТЕКСТ КРИЧИТ.\nЕщё раз — перестал. Уф.", [
          { text: "Запустить 'Wrong World Demo'", action: "launch_game" },
          { text: "Встать", action: "room" },
          { text: "Ctrl+Skull", action: "ctrl_skull" },
        ]);
        break;

      case "ctrl_skull":
        go("Диспетчер задач мира:\ngravity.exe — 23%\nmimic_spawner.dll — 8%\nplayer_suffering.sys — 99%", [
          { text: "Завершить player_suffering.sys", action: "die24" },
          { text: "Закрыть", action: "room" },
        ]);
        break;

      case "die24":
        go("«ОШИБКА: Обновляю пользователя...» Вы теперь версия 0.0.0.", [], 24);
        break;

      case "altf4":
        go("Вы нажимаете Alt+F4. Ничего не происходит. Руна мигает красным.\n«ВЫХОД ЗАПРЕЩЁН. ИГРАЙТЕ В ИГРУ.»", [
          { text: "⚡ Нажать Alt+F4 ещё раз (Назло!)", action: "die12_real" },
          { text: "Запустить 'Wrong World Demo'", action: "launch_game" },
          { text: "Выдернуть шнур", action: "die3" },
          { text: "Обновить драйвера", action: "die4" },
        ]);
        break;

      case "die12_real":
        go(
          "Вы упрямо зажимаете Alt+F4 в реальности. Вы локальная аномалия. Мир решил, что вас проще закрыть, чем исправить.",
          [],
          12,
        );
        break;

      case "die0":
        go("Рывок — нога в одеяле — шея + спинка кровати.", [], 0);
        break;
      case "die2":
        go("40 кг мудрости рушатся вам на голову.", [], 2);
        break;
      case "die3":
        go("Шнур → 50 000 ман через руку, тело и тапочки.", [], 3);
        break;
      case "die4":
        go("«Обновить». Принтер активируется. Дуло на вас. Файрбол.", [], 4);
        break;
      case "die9":
        go("За окном — вы. Оба кричите. Стекло лопается от резонанса.", [], 9);
        break;
      case "die10":
        go("Тапочки. Левая нога — Антарктида. Правая — Солнце.", [], 10);
        break;
      case "die11":
        go("Пыль = прах предыдущего игрока. Рекурсия праха.", [], 11);
        break;
      case "die16":
        go("Кактус в карман → лимит веса → сингулярность.", [], 16);
        break;

      case "computer_nested":
        go("Вы находите компьютер внутри игры. Он выглядит пиксельно и грустно.", [
          { text: "Запустить 'Wrong World Demo'", action: "launch_game" },
          { text: "Выйти (Оставь внутри игры)", action: "exit" },
        ]);
        break;

      case "launch_game":
        if (depth >= 3) {
          go("Пиксели → символы → шум → ничто. Вложенность схлопнулась.", [], 8);
        } else {
          setNestedGame(true);
          const loadingMessage =
            depth === 0 ? "Красиво, с анимацией." : depth === 1 ? "Полоска дёргается." : "▓▓▓░░░ 43%... ████ ГОТОВО.";
          setText(
            (current) =>
              current +
              "\n\n" +
              prefix +
              "Загрузка Wrong World Demo v0." +
              (depth + 1) +
              "...\n" +
              prefix +
              loadingMessage,
          );
        }
        break;

      case "collapse":
      case "exit":
        setNestedGame(false);
        onCollapse?.();
        break;

      default:
        go("Действие не прописано. Reality Engine не знает что с вами делать.\nВы — баг.", [], 25);
        break;
    }
  };

  if (depth > MAX_NESTING_DEPTH) {
    return (
      <section className="reality-collapse" aria-label="Reality collapsed">
        <p>Reality Engine refused to allocate another layer.</p>
        <button type="button" onClick={onCollapse}>
          ВЕРНУТЬСЯ В СЛОЙ ВЫШЕ
        </button>
      </section>
    );
  }

  if (nestedGame) {
    const nestedStyle = GRAPHICS_LEVELS[Math.min(depth + 1, GRAPHICS_LEVELS.length - 1)];

    return (
      <div
        className="nested-layer"
        style={
          {
            "--nested-bg": nestedStyle.bg,
            "--nested-border": style.border,
            "--nested-radius": depth > 1 ? "0" : "6px",
            "--nested-padding": depth > 2 ? "4px" : "8px",
            "--nested-height": `${Math.max(200, 400 - depth * 80)}px`,
            "--nested-shadow": depth === 0 ? "0 0 20px rgba(196,163,90,0.2)" : "none",
          } as CSSProperties
        }
      >
        <GameLayer
          depth={depth + 1}
          memory={memory}
          onDeath={onDeath}
          onMemory={onMemory}
          onWin={onWin}
          onMusicCue={onMusicCue}
          onCollapse={() => {
            setNestedGame(false);

            if (depth === 0) {
              setText(
                (current) =>
                  current +
                  "\n\n════════════════════════════════════\n" +
                  "Все слои реальности схлопнулись. Монитор погас. Озон и сожаление.\n" +
                  "Кактус смотрит с укоризной.\n════════════════════════════════════",
              );
              setChoices([
                { text: "Осмотреть комнату", action: "room" },
                { text: "Лечь обратно", action: "wake" },
              ]);
            } else {
              onCollapse?.();
            }
          }}
        />
      </div>
    );
  }

  return (
    <section
      className="game-layer"
      style={
        {
          "--layer-font": style.fontFamily,
          "--layer-size": style.fontSize,
          "--layer-color": style.color,
          "--layer-accent": style.accent,
          "--layer-shadow": style.textShadow,
          "--layer-height": depth > 0 ? `${Math.max(150, 300 - depth * 60)}px` : "55vh",
        } as CSSProperties
      }
      aria-label={style.name}
    >
      {depth === 0 && (
        <figure className="scene-illustration" aria-label="Первая сцена Wrong World">
          <img src={menuArt} alt="" />
        </figure>
      )}

      <div ref={textRef} className="story-log">
        {text}
      </div>

      {choices.length > 0 && (
        <div className="choice-list">
          {choices.map((choice, index) => {
            const isMemoryChoice = choice.text.startsWith("⚡");
            const glitchedHint = depth >= 3 ? corruptText(choice.text, depth) : null;

            return (
              <button
                key={`${choice.action}-${index}`}
                type="button"
                className={`choice-button ${isMemoryChoice ? "choice-button--memory" : ""}`}
                style={
                  {
                    "--choice-padding": depth > 2 ? "4px 8px" : "8px 14px",
                    "--choice-size": depth > 2 ? "12px" : "13px",
                    "--choice-radius": depth > 1 ? "0" : "4px",
                  } as CSSProperties
                }
                title={glitchedHint ?? undefined}
                aria-label={choice.text}
                onClick={() => handleChoice(choice.action)}
              >
                {prefix}
                {choice.text}
                {glitchedHint !== null && (
                  <span className="choice-button__glitch" aria-hidden="true">
                    {glitchedHint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

const ENDINGS: Record<EndingId, { title: string; icon: string; desc: string }> = {
  survivor: {
    title: "ВЫЖИВШИЙ",
    icon: "🐎",
    desc:
      "Вы приручили стул-мимика, натравив одеяло-убийцу.\n" +
      "Верхом на мимике пробили рендер-барьер.\n" +
      "Мир не принял вас. Вы приняли мир — и сбежали.",
  },
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [deaths, setDeaths] = useState<Set<DeathId>>(loadDeathSet);
  const [memoryFlags, setMemoryFlags] = useState<Set<MemoryKey>>(loadMemorySet);
  const [showCollection, setShowCollection] = useState(false);
  const [ending, setEnding] = useState<EndingId | null>(null);
  const snapAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeMusicTrackRef = useRef<MusicTrack | null>(null);
  const musicUnlockedRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem("wrong-world-deaths", JSON.stringify([...deaths]));
  }, [deaths]);

  useEffect(() => {
    window.localStorage.setItem("wrong-world-memory", JSON.stringify([...memoryFlags]));
  }, [memoryFlags]);

  const playMusic = useCallback((track: MusicTrack, unlock = false) => {
    if (unlock) musicUnlockedRef.current = true;
    if (!musicUnlockedRef.current) return;

    const config = MUSIC_TRACKS[track];
    const current = musicAudioRef.current;

    if (current && activeMusicTrackRef.current === track) {
      current.volume = config.volume;
      void current.play().catch(() => {});
      return;
    }

    current?.pause();
    const next = new Audio(config.src);
    next.loop = config.loop;
    next.volume = config.volume;
    musicAudioRef.current = next;
    activeMusicTrackRef.current = track;

    void next.play().catch(() => {
      if (musicAudioRef.current === next) activeMusicTrackRef.current = null;
    });
  }, []);

  useEffect(() => {
    playMusic(ending ? "victory" : started ? "main" : "menu");
  }, [ending, playMusic, started]);

  useEffect(
    () => () => {
      musicAudioRef.current?.pause();
      snapAudioRef.current?.pause();
    },
    [],
  );

  const playSnap = useCallback(() => {
    snapAudioRef.current?.pause();
    snapAudioRef.current = new Audio(snapFx);
    snapAudioRef.current.volume = 0.42;
    void snapAudioRef.current.play().catch(() => {});
  }, []);

  const handleDeath = useCallback(
    (id: DeathId) => {
      playMusic(id === 9 ? "window" : "death", true);
      playSnap();
      setDeaths((previous) => new Set([...previous, id]));
      setMemoryFlags((previous) => new Set([...previous, id]));
    },
    [playMusic, playSnap],
  );

  const handleMemory = useCallback((flag: MemoryKey) => {
    setMemoryFlags((previous) => new Set([...previous, flag]));
  }, []);

  const handleMusicCue = useCallback(
    (track: MusicTrack) => {
      playMusic(track, true);
    },
    [playMusic],
  );

  const handleStart = useCallback(() => {
    setShowCollection(false);
    setStarted(true);
    playMusic("main", true);
  }, [playMusic]);

  const handleBackToMenu = useCallback(() => {
    setShowCollection(false);
    setStarted(false);
    setEnding(null);
    playMusic("menu", true);
  }, [playMusic]);

  const handleWin = useCallback(
    (nextEnding: EndingId) => {
      setShowCollection(false);
      setEnding(nextEnding);
      playMusic("victory", true);
    },
    [playMusic],
  );

  const handleReset = useCallback(() => {
    window.localStorage.removeItem("wrong-world-deaths");
    window.localStorage.removeItem("wrong-world-memory");
    setDeaths(new Set());
    setMemoryFlags(new Set());
    setEnding(null);
    setStarted(false);
    setShowCollection(false);
    playMusic("menu", true);
  }, [playMusic]);

  if (ending) {
    const currentEnding = ENDINGS[ending];

    return (
      <main className="ending-screen">
        <div className="ending-card">
          <div className="ending-icon">{currentEnding.icon}</div>
          <h1>{currentEnding.title}</h1>
          <p>{currentEnding.desc}</p>
          <div className="ending-actions">
            <button
              type="button"
              className="gold-button"
              onClick={() => {
                setEnding(null);
                setStarted(true);
                playMusic("main", true);
              }}
            >
              ИГРАТЬ ДАЛЬШЕ
            </button>
            <button type="button" className="danger-button" onClick={handleReset}>
              НОВАЯ ИГРА
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="title-screen" style={{ backgroundImage: `url(${menuArt})` }}>
        <div className="title-scrim" />
        <section className="title-card" aria-label="Wrong World start">
          <p className="eyebrow">Reality Engine v0.13.7</p>
          <h1>WRONG WORLD</h1>
          <p>
            Вы умерли и попали в другой мир.
            <br />
            Мир решил, что это ошибка.
          </p>
          <button type="button" className="gold-button" onClick={handleStart}>
            ПРОСНУТЬСЯ
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="wrong-world-shell">
      <header className="game-topbar">
        <div className="death-counter">
          💀 {deaths.size} / {TOTAL_DEATHS}
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => setShowCollection((value) => !value)}>
            {showCollection ? "Играть" : "Коллекция"}
          </button>
          <button type="button" onClick={handleBackToMenu}>
            Меню
          </button>
        </div>
      </header>

      {showCollection ? (
        <section className="collection-panel" aria-label="Death collection">
          {Object.entries(DEATHS).map(([id, death]) => {
            const deathId = Number(id) as DeathId;

            return deaths.has(deathId) ? (
              <DeathCard key={id} id={deathId} death={death} />
            ) : (
              <article key={id} className="locked-death">
                💀 СМЕРТЬ #{id}: ???
              </article>
            );
          })}
        </section>
      ) : (
        <GameLayer
          depth={0}
          memory={memoryFlags}
          onDeath={handleDeath}
          onMemory={handleMemory}
          onWin={handleWin}
          onMusicCue={handleMusicCue}
          onCollapse={() => {}}
        />
      )}
    </main>
  );
}
