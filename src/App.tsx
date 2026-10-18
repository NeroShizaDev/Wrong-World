import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import menuArt from "../Arts/wrong-world-menu-v2.png";
import computerTheme from "../Music/NeroShizaDev - Ceiling Watcher.mp3";
import mainTheme from "../Music/NeroShizaDev - Layer Drop.mp3";
import deathTheme from "../Music/NeroShizaDev - Pew Error Snap.mp3";
import collectionTheme from "../Music/NeroShizaDev - Pinned Under Glass.mp3";
import victoryTheme from "../Music/NeroShizaDev - Стул на закате.mp3";
import menuTheme from "../Music/NeroShizaDev - Wrong World Boot Theme.mp3";
import {
  DEATHS,
  DIED_FLAG,
  ENDINGS,
  IDLE_CHOICE_TEXT,
  IDLE_SCENE,
  MAX_LAYER_DEPTH,
  NESTED_EXIT_SCENE,
  NESTED_START_SCENE,
  RESPAWN_SCENE,
  SCENES,
  START_SCENE,
  TOO_DEEP_SCENE,
  checkCondition,
  isInsight,
  resolveScene,
  sceneText,
} from "./story";
import type { ChoiceAction, DeathId, EndingId, MemoryKey, StoryContext } from "./story";

type MusicTrack = "menu" | "main" | "computer" | "death" | "collection" | "victory";

type VisibleChoice = {
  text: string;
  to?: string;
  action?: ChoiceAction | "wake";
  ending?: EndingId;
  insight: boolean;
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
const TOTAL_ENDINGS = Object.keys(ENDINGS).length;

const MUSIC_TRACKS: Record<MusicTrack, { src: string; volume: number; loop: boolean }> = {
  menu: { src: menuTheme, volume: 0.34, loop: true },
  main: { src: mainTheme, volume: 0.3, loop: true },
  computer: { src: computerTheme, volume: 0.36, loop: true },
  death: { src: deathTheme, volume: 0.42, loop: false },
  collection: { src: collectionTheme, volume: 0.36, loop: true },
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

function loadEndingSet() {
  try {
    const raw = window.localStorage.getItem("wrong-world-endings");
    if (!raw) return new Set<EndingId>();
    return new Set((JSON.parse(raw) as EndingId[]).filter((id) => id in ENDINGS));
  } catch {
    return new Set<EndingId>();
  }
}

function loadLastDeath(): DeathId | null {
  try {
    const raw = window.localStorage.getItem("wrong-world-last-death");
    if (raw === null) return null;
    const id = Number(raw);
    return id in DEATHS ? (id as DeathId) : null;
  } catch {
    return null;
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
  hidden?: boolean;
  memory: Set<MemoryKey>;
  lastDeath: DeathId | null;
  onDeath: (id: DeathId) => void;
  onMemory: (flag: MemoryKey) => void;
  onWin: (ending: EndingId) => void;
  onMusicCue?: (track: MusicTrack) => void;
  onExit?: () => void;
  onNestedDeath?: (id: DeathId, text: string) => void;
};

const DIVIDER = "═══════════════════════════";

function GameLayer({
  depth = 0,
  hidden = false,
  memory,
  lastDeath,
  onDeath,
  onMemory,
  onWin,
  onMusicCue,
  onExit,
  onNestedDeath,
}: GameLayerProps) {
  const [log, setLog] = useState("");
  const [choices, setChoices] = useState<VisibleChoice[]>([]);
  const [nestedGame, setNestedGame] = useState(false);
  const runRef = useRef<Set<string>>(new Set());
  const memoryRef = useRef<Set<MemoryKey>>(new Set(memory));
  const lastDeathRef = useRef<DeathId | null>(lastDeath);
  const startedRef = useRef(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  const style = GRAPHICS_LEVELS[Math.min(depth, GRAPHICS_LEVELS.length - 1)];
  const prefix = style.prefix;

  useEffect(() => {
    for (const key of memory) memoryRef.current.add(key);
  }, [memory]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, choices]);

  const format = (block: string) =>
    block
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");

  const append = (block: string, replace = false) => {
    const formatted = format(depth >= 2 ? corruptText(block, depth) : block);
    setLog((current) => (replace || !current ? formatted : current + "\n\n" + formatted));
  };

  const context = (): StoryContext => ({
    mem: memoryRef.current,
    run: runRef.current,
    depth,
    lastDeath: lastDeathRef.current,
  });

  const die = (deathId: DeathId, text: string, fromNestedGame = false) => {
    if (depth > 0) {
      onNestedDeath?.(deathId, text);
      return;
    }

    const isNew = !memoryRef.current.has(deathId);
    const death = DEATHS[deathId];
    memoryRef.current.add(deathId);
    lastDeathRef.current = deathId;
    runRef.current = new Set();
    onDeath(deathId);
    if (!memoryRef.current.has(DIED_FLAG)) {
      memoryRef.current.add(DIED_FLAG);
      onMemory(DIED_FLAG);
    }

    append(
      [
        text,
        ...(fromNestedGame ? ["Руна на системнике вспыхивает и гаснет. Смерть в игре оказалась настоящей."] : []),
        "",
        DIVIDER,
        `💀 СМЕРТЬ #${deathId}: ${death.name}`,
        death.desc,
        DIVIDER,
        "",
        "Темнота. Холод. Тишина.",
        isNew ? "Новая смерть в коллекции. Вы запомнили, как это случилось." : "Опять это. Вы ведь уже знали, чем кончится.",
      ].join("\n"),
    );
    setChoices([{ text: "Открыть глаза (опять…)", action: "wake", insight: false }]);
  };

  const enter = (sceneId: string, replace = false) => {
    const definition = SCENES[sceneId];
    if (!definition) {
      console.warn(`Wrong World: unknown scene "${sceneId}"`);
      return;
    }

    const scene = resolveScene(definition, context());
    for (const key of scene.remember ?? []) {
      if (!memoryRef.current.has(key)) {
        memoryRef.current.add(key);
        onMemory(key);
      }
    }
    for (const flag of scene.set ?? []) runRef.current.add(flag);
    for (const flag of scene.unset ?? []) runRef.current.delete(flag);

    const ctx = context();
    const text = sceneText(scene, ctx);

    if (scene.death !== undefined) {
      die(scene.death, text);
      return;
    }

    append(scene.showGraphics ? `${style.descStyle}\n\n${text}` : text, replace);
    if (depth === 0) onMusicCue?.(scene.music === "computer" ? "computer" : "main");

    const next: VisibleChoice[] = (scene.choices ?? [])
      .filter((choice) => checkCondition(choice.if, ctx))
      .map((choice) => ({
        text: choice.text,
        to: choice.to,
        action: choice.action,
        ending: choice.ending,
        insight: isInsight(choice),
      }));

    if (depth === 0 && scene.idle !== false && next.length > 0) {
      next.push({ text: IDLE_CHOICE_TEXT, to: IDLE_SCENE, insight: false });
    }

    setChoices(next);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    enter(depth === 0 ? START_SCENE : NESTED_START_SCENE, true);
    // Первая сцена открывается один раз при монтировании слоя (StrictMode вызывает эффект дважды).
  }, []);

  const choose = (choice: VisibleChoice) => {
    switch (choice.action) {
      case "wake":
        enter(RESPAWN_SCENE);
        return;
      case "launch": {
        if (depth >= MAX_LAYER_DEPTH) {
          enter(TOO_DEEP_SCENE);
          return;
        }
        const loadingMessage =
          depth === 0 ? "Красиво, с анимацией." : depth === 1 ? "Полоска дёргается." : "▓▓▓░░░ 43%... ████ ГОТОВО.";
        append(`Загрузка Wrong World Demo v0.${depth + 1}...\n${loadingMessage}`);
        setNestedGame(true);
        return;
      }
      case "exit":
        onExit?.();
        return;
      case "win":
        onWin(choice.ending ?? "survivor");
        return;
    }

    if (choice.to) enter(choice.to);
  };

  if (nestedGame) {
    const nestedStyle = GRAPHICS_LEVELS[Math.min(depth + 1, GRAPHICS_LEVELS.length - 1)];

    return (
      <div
        className="nested-layer"
        hidden={hidden}
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
          lastDeath={lastDeathRef.current}
          onDeath={onDeath}
          onMemory={onMemory}
          onWin={onWin}
          onMusicCue={onMusicCue}
          onExit={() => {
            setNestedGame(false);
            enter(NESTED_EXIT_SCENE);
          }}
          onNestedDeath={(deathId, text) => {
            setNestedGame(false);
            die(deathId, text, true);
          }}
        />
      </div>
    );
  }

  return (
    <section
      className="game-layer"
      hidden={hidden}
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
        <figure className="scene-illustration" aria-label="Комната Wrong World">
          <img src={menuArt} alt="" />
        </figure>
      )}

      <div ref={logRef} className="story-log">
        {log}
      </div>

      {choices.length > 0 && (
        <div className="choice-list">
          {choices.map((choice, index) => {
            const label = (choice.insight ? "⚡ " : "") + choice.text;
            const glitchedHint = depth >= 3 ? corruptText(label, depth) : null;

            return (
              <button
                key={`${choice.to ?? choice.action}-${index}`}
                type="button"
                className={`choice-button ${choice.insight ? "choice-button--memory" : ""}`}
                style={
                  {
                    "--choice-padding": depth > 2 ? "4px 8px" : "8px 14px",
                    "--choice-size": depth > 2 ? "12px" : "13px",
                    "--choice-radius": depth > 1 ? "0" : "4px",
                  } as CSSProperties
                }
                title={glitchedHint ?? undefined}
                aria-label={label}
                onClick={() => choose(choice)}
              >
                {prefix}
                {label}
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

export default function App() {
  const [started, setStarted] = useState(false);
  const [deaths, setDeaths] = useState<Set<DeathId>>(loadDeathSet);
  const [memoryFlags, setMemoryFlags] = useState<Set<MemoryKey>>(loadMemorySet);
  const [lastDeath, setLastDeath] = useState<DeathId | null>(loadLastDeath);
  const [endings, setEndings] = useState<Set<EndingId>>(loadEndingSet);
  const [showCollection, setShowCollection] = useState(false);
  const [ending, setEnding] = useState<EndingId | null>(null);
  const [gameTrack, setGameTrack] = useState<MusicTrack>("main");
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeMusicTrackRef = useRef<MusicTrack | null>(null);
  const musicUnlockedRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem("wrong-world-deaths", JSON.stringify([...deaths]));
  }, [deaths]);

  useEffect(() => {
    window.localStorage.setItem("wrong-world-memory", JSON.stringify([...memoryFlags]));
  }, [memoryFlags]);

  useEffect(() => {
    window.localStorage.setItem("wrong-world-endings", JSON.stringify([...endings]));
  }, [endings]);

  useEffect(() => {
    if (lastDeath === null) window.localStorage.removeItem("wrong-world-last-death");
    else window.localStorage.setItem("wrong-world-last-death", String(lastDeath));
  }, [lastDeath]);

  const playMusic = useCallback((track: MusicTrack, unlock = false) => {
    if (unlock) musicUnlockedRef.current = true;
    if (!musicUnlockedRef.current) return;

    const config = MUSIC_TRACKS[track];
    const current = musicAudioRef.current;

    if (current && activeMusicTrackRef.current === track) {
      // Короткий трек смерти не перезапускаем, когда игрок просто вернулся из коллекции.
      if (!config.loop) return;
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

  const track: MusicTrack = ending ? "victory" : !started ? "menu" : showCollection ? "collection" : gameTrack;
  const trackRef = useRef(track);
  trackRef.current = track;

  useEffect(() => {
    playMusic(track);
  }, [playMusic, track]);

  // Браузер не даёт играть звук до первого действия игрока: музыка загрузки стартует с первым кликом.
  useEffect(() => {
    const unlock = () => playMusic(trackRef.current, true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [playMusic]);

  useEffect(
    () => () => {
      musicAudioRef.current?.pause();
    },
    [],
  );

  const handleDeath = useCallback((id: DeathId) => {
    setGameTrack("death");
    setDeaths((previous) => new Set([...previous, id]));
    setMemoryFlags((previous) => new Set([...previous, id]));
    setLastDeath(id);
  }, []);

  const handleMemory = useCallback((flag: MemoryKey) => {
    setMemoryFlags((previous) => new Set([...previous, flag]));
  }, []);

  const handleStart = useCallback(() => {
    setShowCollection(false);
    setGameTrack("main");
    setStarted(true);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setShowCollection(false);
    setStarted(false);
    setEnding(null);
  }, []);

  const handleWin = useCallback((nextEnding: EndingId) => {
    setShowCollection(false);
    setEndings((previous) => new Set([...previous, nextEnding]));
    setEnding(nextEnding);
  }, []);

  const handleReset = useCallback(() => {
    window.localStorage.removeItem("wrong-world-deaths");
    window.localStorage.removeItem("wrong-world-memory");
    window.localStorage.removeItem("wrong-world-endings");
    setDeaths(new Set());
    setMemoryFlags(new Set());
    setEndings(new Set());
    setLastDeath(null);
    setEnding(null);
    setStarted(false);
    setShowCollection(false);
  }, []);

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
                setGameTrack("main");
                setStarted(true);
              }}
            >
              ИГРАТЬ ДАЛЬШЕ
            </button>
            <button type="button" className="danger-button" onClick={handleReset}>
              СБРОС
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
          <p className="eyebrow">07:00 · 220 В манны</p>
          <h1>WRONG WORLD</h1>
          <p>
            Ваш мир. Ваша комната.
            <br />
            Только за ночь в неё пришла магия — и всё стало неправильным.
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
          💀 {deaths.size} / {TOTAL_DEATHS} · 🌅 {endings.size} / {TOTAL_ENDINGS}
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

      {showCollection && (
        <section className="collection-panel" aria-label="Коллекция">
          <h2 className="collection-heading">
            Концовки · {endings.size} / {TOTAL_ENDINGS}
          </h2>
          {(Object.keys(ENDINGS) as EndingId[]).map((id) =>
            endings.has(id) ? (
              <article key={id} className="death-card ending-entry">
                <div className="death-card__name">
                  {ENDINGS[id].icon} {ENDINGS[id].title}
                </div>
                <div className="death-card__desc">{ENDINGS[id].desc}</div>
              </article>
            ) : (
              <article key={id} className="locked-death">
                🌅 КОНЦОВКА: ???
              </article>
            ),
          )}
          <h2 className="collection-heading">
            Смерти · {deaths.size} / {TOTAL_DEATHS}
          </h2>
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
      )}
      <GameLayer
        depth={0}
        hidden={showCollection}
        memory={memoryFlags}
        lastDeath={lastDeath}
        onDeath={handleDeath}
        onMemory={handleMemory}
        onWin={handleWin}
        onMusicCue={setGameTrack}
      />
    </main>
  );
}
