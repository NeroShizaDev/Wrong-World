import { useMemo, useRef, useState } from "react";
import menuArt from "../Arts/de16a547-a697-41b0-9f11-0c32f48396b9.png";
import snapFx from "../Music/NeroShizaDev - Pew Error Snap.mp3";

type Screen = "menu" | "run" | "settings";
type Action = "scan" | "patch" | "distort" | "reset";

type RealityState = {
  stability: number;
  room: number;
  signal: number;
  deaths: number;
  line: string;
};

const initialState: RealityState = {
  stability: 37,
  room: 1,
  signal: 13,
  deaths: 0,
  line: "Driver: MentalInstability.dll",
};

const actionCopy: Record<Action, string> = {
  scan: "SCAN",
  patch: "PATCH",
  distort: "DISTORT",
  reset: "RESET",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [reality, setReality] = useState<RealityState>(initialState);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const status = useMemo(() => {
    if (reality.stability >= 70) return "COHERENT";
    if (reality.stability >= 35) return "UNSTABLE";
    return "BROKEN";
  }, [reality.stability]);

  const playSnap = () => {
    if (!soundEnabled) return;

    audioRef.current?.pause();
    audioRef.current = new Audio(snapFx);
    audioRef.current.volume = 0.45;
    void audioRef.current.play();
  };

  const startGame = () => {
    playSnap();
    setReality(initialState);
    setScreen("run");
  };

  const loadGame = () => {
    const saved = window.localStorage.getItem("wrong-world-save");
    if (!saved) {
      setReality({
        ...initialState,
        line: "No saved reality found.",
      });
      setScreen("run");
      return;
    }

    setReality(JSON.parse(saved) as RealityState);
    setScreen("run");
  };

  const saveGame = (next: RealityState) => {
    window.localStorage.setItem("wrong-world-save", JSON.stringify(next));
  };

  const act = (action: Action) => {
    playSnap();

    setReality((current) => {
      const drift = Math.floor(Math.random() * 9) - 4;
      const nextByAction: Record<Action, RealityState> = {
        scan: {
          ...current,
          signal: clamp(current.signal + 9 + drift, 0, 99),
          stability: clamp(current.stability - 2, 0, 100),
          line: "Signal found behind the wall.",
        },
        patch: {
          ...current,
          stability: clamp(current.stability + 12 + drift, 0, 100),
          room: current.room + 1,
          line: "Patch accepted. The door moved.",
        },
        distort: {
          ...current,
          signal: clamp(current.signal + 18, 0, 99),
          stability: clamp(current.stability - 16 - Math.abs(drift), 0, 100),
          line: "The world rendered the wrong answer.",
        },
        reset: {
          ...initialState,
          deaths: current.deaths + 1,
          line: "Reality rebooted with errors.",
        },
      };

      const next = nextByAction[action];
      saveGame(next);
      return next;
    });
  };

  return (
    <main className={`app app-${screen}`} style={{ backgroundImage: `url(${menuArt})` }}>
      <div className="noise" />

      {screen === "menu" && (
        <section className="menu-panel" data-testid="main-menu" aria-label="Main menu">
          <p className="system-line">Reality Engine v0.13.7</p>
          <h1>Wrong World</h1>
          <div className="menu-actions">
            <button type="button" onClick={startGame}>
              NEW GAME
            </button>
            <button type="button" onClick={loadGame}>
              LOAD REALITY
            </button>
            <button type="button" onClick={() => setScreen("settings")}>
              SETTINGS
            </button>
          </div>
        </section>
      )}

      {screen === "settings" && (
        <section className="menu-panel settings-panel" aria-label="Settings">
          <p className="system-line">Settings</p>
          <label className="toggle-row">
            <span>Sound</span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
          </label>
          <button type="button" onClick={() => setScreen("menu")}>
            BACK
          </button>
        </section>
      )}

      {screen === "run" && (
        <section className="game-shell" aria-label="Reality console">
          <div className="stage">
            <div className="avatar" />
            <div className="scanline" />
          </div>

          <aside className="console">
            <div>
              <p className="system-line">Build: Broken</p>
              <h2>{status}</h2>
              <p>{reality.line}</p>
            </div>

            <dl className="stats">
              <div>
                <dt>Stability</dt>
                <dd>{reality.stability}%</dd>
              </div>
              <div>
                <dt>Room</dt>
                <dd>{reality.room}</dd>
              </div>
              <div>
                <dt>Signal</dt>
                <dd>{reality.signal}</dd>
              </div>
              <div>
                <dt>Deaths</dt>
                <dd>{reality.deaths}</dd>
              </div>
            </dl>

            <div className="command-grid">
              {(Object.keys(actionCopy) as Action[]).map((action) => (
                <button key={action} type="button" onClick={() => act(action)}>
                  {actionCopy[action]}
                </button>
              ))}
            </div>

            <button type="button" className="ghost-button" onClick={() => setScreen("menu")}>
              EXIT TO MENU
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}

export default App;
