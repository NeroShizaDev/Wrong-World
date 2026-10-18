import { useCallback, useEffect, useRef, useState } from "react";

// «Дичь идёт» — секретная «Новая игра»: открывается, только когда собраны все смерти и все концовки.

type RunnerStatus = "ready" | "playing" | "won" | "lost";
type EnemyKind = "tourist" | "petrovich" | "babushka" | "squad" | "bossMinion";
type GateKind = "add" | "remove" | "damage" | "fireRate" | "shield" | "rocket" | "freeze";

type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  points: number;
  label: string;
  emoji: string;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  damage: number;
  rocket?: boolean;
};

type Gate = {
  id: number;
  kind: GateKind;
  x: number;
  y: number;
  label: string;
  tone: "good" | "bad" | "power";
};

type Floater = {
  id: number;
  x: number;
  y: number;
  text: string;
  age: number;
};

type RunnerSnapshot = {
  status: RunnerStatus;
  playerX: number;
  squad: number;
  score: number;
  best: number;
  newRecord: boolean;
  progress: number;
  bossHp: number;
  bossMaxHp: number;
  bossActive: boolean;
  damageBoost: number;
  fireRateBoost: number;
  shield: boolean;
  frozen: number;
  enemies: Enemy[];
  bullets: Bullet[];
  gates: Gate[];
  floaters: Floater[];
  message: string;
};

type RunnerWorld = RunnerSnapshot & {
  targetX: number;
  nextId: number;
  elapsed: number;
  enemyTimer: number;
  gateTimer: number;
  shootTimer: number;
  bossTimer: number;
};

export const RUNNER_BEST_KEY = "wrong-world-runner-best";

const BOSS_NAME = "Пакетная Королева";
const BOSS_POINTS = 500;
const PLAYER_Y = 88;
const LANES = [18, 38, 62, 82];
// Зазоры в пикселях (карточки врагов и ворот около 58 px высотой): ворота и враги не налезают друг на друга.
const GATE_GAP_PX = 62;
const ENEMY_GAP_PX = 64;
const KEYBOARD_SPEED = 95;
// Карточка отряда шире полосы: у краёв её не обрезает стенка арены.
const PLAYER_MIN_X = 15;
const PLAYER_MAX_X = 85;

const ENEMY_TEMPLATES: Record<EnemyKind, Omit<Enemy, "id" | "x" | "y">> = {
  tourist: { kind: "tourist", hp: 18, maxHp: 18, speed: 16, damage: 1, points: 10, label: "Турист", emoji: "📸" },
  petrovich: { kind: "petrovich", hp: 34, maxHp: 34, speed: 11, damage: 2, points: 20, label: "Петрович", emoji: "🧰" },
  babushka: { kind: "babushka", hp: 24, maxHp: 24, speed: 22, damage: 3, points: 15, label: "Бабка", emoji: "🛍️" },
  squad: { kind: "squad", hp: 95, maxHp: 95, speed: 9, damage: 5, points: 60, label: "Отряд Петровичей", emoji: "👷" },
  bossMinion: { kind: "bossMinion", hp: 42, maxHp: 42, speed: 18, damage: 2, points: 15, label: "Пакетный миньон", emoji: "💼" },
};

const GATE_POOL: Array<Omit<Gate, "id" | "x" | "y">> = [
  { kind: "add", label: "+5 бойцов", tone: "good" },
  { kind: "add", label: "+10 бойцов", tone: "good" },
  { kind: "remove", label: "-8 бойцов", tone: "bad" },
  { kind: "damage", label: "x2 урон", tone: "power" },
  { kind: "fireRate", label: "x2 темп", tone: "power" },
  { kind: "shield", label: "щит", tone: "good" },
  { kind: "rocket", label: "ракетница", tone: "power" },
  { kind: "freeze", label: "заморозка", tone: "power" },
];

function loadBest() {
  try {
    const best = Number(window.localStorage.getItem(RUNNER_BEST_KEY));
    return Number.isFinite(best) && best > 0 ? best : 0;
  } catch {
    return 0;
  }
}

function saveBest(best: number) {
  try {
    window.localStorage.setItem(RUNNER_BEST_KEY, String(best));
  } catch {
    // Рекорд просто не сохранится, забег от этого не ломается.
  }
}

const initialWorld = (best: number): RunnerWorld => ({
  status: "ready",
  playerX: 50,
  targetX: 50,
  squad: 12,
  score: 0,
  best,
  newRecord: false,
  progress: 0,
  bossHp: 520,
  bossMaxHp: 520,
  bossActive: false,
  damageBoost: 0,
  fireRateBoost: 0,
  shield: false,
  frozen: 0,
  enemies: [],
  bullets: [],
  gates: [],
  floaters: [],
  message: "Веди отряд пальцем, мышью или стрелками. Стрельба автоматическая.",
  nextId: 1,
  elapsed: 0,
  enemyTimer: 0.6,
  gateTimer: 2.2,
  shootTimer: 0,
  bossTimer: 0,
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeSnapshot(world: RunnerWorld): RunnerSnapshot {
  return {
    status: world.status,
    playerX: world.playerX,
    squad: world.squad,
    score: world.score,
    best: world.best,
    newRecord: world.newRecord,
    progress: world.progress,
    bossHp: world.bossHp,
    bossMaxHp: world.bossMaxHp,
    bossActive: world.bossActive,
    damageBoost: world.damageBoost,
    fireRateBoost: world.fireRateBoost,
    shield: world.shield,
    frozen: world.frozen,
    enemies: [...world.enemies],
    bullets: [...world.bullets],
    gates: [...world.gates],
    floaters: [...world.floaters],
    message: world.message,
  };
}

function addFloater(world: RunnerWorld, x: number, y: number, text: string) {
  world.floaters.push({ id: world.nextId++, x, y, text, age: 0 });
}

function spawnEnemy(world: RunnerWorld, kind: EnemyKind, x = LANES[Math.floor(Math.random() * LANES.length)], y = -8) {
  const template = ENEMY_TEMPLATES[kind];
  world.enemies.push({ ...template, id: world.nextId++, x, y });
}

function spawnGatePair(world: RunnerWorld) {
  const first = GATE_POOL[Math.floor(Math.random() * GATE_POOL.length)];
  let second = GATE_POOL[Math.floor(Math.random() * GATE_POOL.length)];

  if (first.kind === second.kind) {
    second = GATE_POOL[(GATE_POOL.indexOf(second) + 3) % GATE_POOL.length];
  }

  world.gates.push({ ...first, id: world.nextId++, x: 30, y: -10 });
  world.gates.push({ ...second, id: world.nextId++, x: 70, y: -10 });
}

function applyGate(world: RunnerWorld, gate: Gate) {
  switch (gate.kind) {
    case "add": {
      const amount = gate.label.includes("10") ? 10 : 5;
      world.squad = clamp(world.squad + amount, 0, 99);
      addFloater(world, gate.x, PLAYER_Y - 10, `+${amount}`);
      break;
    }
    case "remove":
      if (world.shield) {
        world.shield = false;
        addFloater(world, gate.x, PLAYER_Y - 10, "щит спас");
      } else {
        world.squad = clamp(world.squad - 8, 0, 99);
        addFloater(world, gate.x, PLAYER_Y - 10, "-8");
        if (world.squad <= 0) loseRun(world);
      }
      break;
    case "damage":
      world.damageBoost = 7;
      addFloater(world, gate.x, PLAYER_Y - 10, "x2 урон");
      break;
    case "fireRate":
      world.fireRateBoost = 7;
      addFloater(world, gate.x, PLAYER_Y - 10, "x2 темп");
      break;
    case "shield":
      world.shield = true;
      addFloater(world, gate.x, PLAYER_Y - 10, "ЩИТ");
      break;
    case "rocket":
      for (let i = 0; i < 5; i += 1) {
        world.bullets.push({ id: world.nextId++, x: world.playerX - 14 + i * 7, y: PLAYER_Y - 7, damage: 48, rocket: true });
      }
      addFloater(world, gate.x, PLAYER_Y - 10, "РАКЕТЫ!");
      break;
    case "freeze":
      world.frozen = 3;
      addFloater(world, gate.x, PLAYER_Y - 10, "ФРИЗ");
      break;
    default:
      break;
  }
}

function loseRun(world: RunnerWorld) {
  world.status = "lost";
  world.message = "Отряд закончился. Петровичи записали это как плановую оптимизацию.";
}

function damagePlayer(world: RunnerWorld, amount: number, x: number, y: number) {
  if (world.shield) {
    world.shield = false;
    addFloater(world, x, y, "щит!");
    return;
  }

  world.squad = clamp(world.squad - amount, 0, 99);
  addFloater(world, x, y, `-${amount}`);

  if (world.squad <= 0) loseRun(world);
}

type LaneSpot = { y: number; enemy: Enemy | null };

// В каждой полосе враги идут гуськом и ждут за воротами, а ворота толкают перед собой всех, в кого упёрлись.
function keepApart(world: RunnerWorld, arenaHeight: number) {
  const gateGap = (GATE_GAP_PX / arenaHeight) * 100;
  const enemyGap = (ENEMY_GAP_PX / arenaHeight) * 100;

  for (const lane of LANES) {
    const spots: LaneSpot[] = [
      ...world.gates.filter((gate) => Math.abs(gate.x - lane) < 20).map((gate) => ({ y: gate.y, enemy: null })),
      ...world.enemies.filter((enemy) => enemy.x === lane).map((enemy) => ({ y: enemy.y, enemy })),
    ].sort((a, b) => a.y - b.y);
    const gap = (a: LaneSpot, b: LaneSpot) => (a.enemy && b.enemy ? enemyGap : gateGap);

    for (let i = spots.length - 2; i >= 0; i -= 1) {
      const spot = spots[i];
      const front = spots[i + 1];
      if (spot.enemy && spot.y > front.y - gap(spot, front)) spot.y = front.y - gap(spot, front);
    }

    let pushed = false;
    for (let i = 0; i < spots.length; i += 1) {
      const spot = spots[i];
      const back = spots[i - 1];
      if (!spot.enemy) pushed = true;
      else if (pushed && spot.y < back.y + gap(back, spot)) spot.y = back.y + gap(back, spot);
      else pushed = false;
    }

    for (const spot of spots) {
      if (spot.enemy) spot.enemy.y = spot.y;
    }
  }
}

function tickWorld(world: RunnerWorld, dt: number, arenaHeight: number) {
  if (world.status !== "playing") {
    return;
  }

  world.elapsed += dt;
  world.progress = world.bossActive ? 100 : clamp((world.elapsed / 58) * 100, 0, 99);
  world.playerX += (world.targetX - world.playerX) * (1 - Math.exp(-18 * dt));
  world.damageBoost = Math.max(0, world.damageBoost - dt);
  world.fireRateBoost = Math.max(0, world.fireRateBoost - dt);
  world.frozen = Math.max(0, world.frozen - dt);
  world.floaters = world.floaters
    .map((floater) => ({ ...floater, y: floater.y - dt * 7, age: floater.age + dt }))
    .filter((floater) => floater.age < 1.1);

  if (!world.bossActive && world.elapsed >= 58) {
    world.bossActive = true;
    world.message = `БОСС: ${BOSS_NAME}. Она несёт скидки и проблемы.`;
    world.enemies = [];
    world.gates = [];
    addFloater(world, 50, 18, "БОСС!");
  }

  const enemySpeedScale = world.frozen > 0 ? 0.15 : 1;
  world.enemies = world.enemies
    .map((enemy) => ({ ...enemy, y: enemy.y + enemy.speed * enemySpeedScale * dt }))
    .filter((enemy) => enemy.y < 112 && enemy.hp > 0);
  world.gates = world.gates.map((gate) => ({ ...gate, y: gate.y + 18 * dt })).filter((gate) => gate.y < 112);
  keepApart(world, arenaHeight);
  world.bullets = world.bullets.map((bullet) => ({ ...bullet, y: bullet.y - (bullet.rocket ? 72 : 58) * dt })).filter((bullet) => bullet.y > -16);

  world.shootTimer -= dt;
  const fireRate = world.fireRateBoost > 0 ? 0.12 : 0.24;
  if (world.shootTimer <= 0) {
    const damage = (world.damageBoost > 0 ? 10 : 5) * Math.max(1, Math.sqrt(world.squad));
    world.bullets.push({ id: world.nextId++, x: world.playerX, y: PLAYER_Y - 8, damage });
    world.shootTimer = fireRate;
  }

  if (!world.bossActive) {
    world.enemyTimer -= dt;
    if (world.enemyTimer <= 0) {
      const roll = Math.random();
      const kind: EnemyKind = roll > 0.88 ? "squad" : roll > 0.62 ? "petrovich" : roll > 0.38 ? "babushka" : "tourist";
      spawnEnemy(world, kind);
      world.enemyTimer = clamp(1.1 - world.elapsed * 0.008, 0.42, 1.1);
    }

    world.gateTimer -= dt;
    if (world.gateTimer <= 0) {
      spawnGatePair(world);
      world.gateTimer = 5.3;
    }
  } else {
    world.bossTimer -= dt;
    if (world.bossTimer <= 0) {
      spawnEnemy(world, "bossMinion", LANES[Math.floor(Math.random() * LANES.length)], 14);
      spawnEnemy(world, Math.random() > 0.5 ? "babushka" : "tourist", LANES[Math.floor(Math.random() * LANES.length)], 8);
      world.bossTimer = 2.4;
      addFloater(world, 50, 20, "ПАКЕТНЫЙ ЗАЛП");
    }
  }

  for (const gate of world.gates) {
    if (Math.abs(gate.y - PLAYER_Y) < 7 && Math.abs(gate.x - world.playerX) < 17) {
      applyGate(world, gate);
      gate.y = 130;
    }
  }

  for (const bullet of world.bullets) {
    if (world.bossActive && bullet.y < 21 && Math.abs(bullet.x - 50) < 36) {
      world.bossHp = Math.max(0, world.bossHp - bullet.damage);
      bullet.y = -100;
      if (world.bossHp <= 0 && world.status === "playing") {
        world.status = "won";
        world.score += BOSS_POINTS;
        world.message = `${BOSS_NAME} повержена. Реклама была странной, но честной.`;
      }
      continue;
    }

    const enemy = world.enemies.find((candidate) => candidate.hp > 0 && distance(bullet, candidate) < (bullet.rocket ? 11 : 7));
    if (!enemy) {
      continue;
    }

    enemy.hp -= bullet.damage;
    bullet.y = -100;
    if (enemy.hp <= 0) {
      world.score += enemy.points;
      addFloater(world, enemy.x, enemy.y, `+${enemy.points}`);
    }
  }

  world.enemies = world.enemies.filter((enemy) => enemy.hp > 0 && enemy.y < 112);
  world.bullets = world.bullets.filter((bullet) => bullet.y > -16);

  for (const enemy of world.enemies) {
    if (world.status === "playing" && distance({ x: world.playerX, y: PLAYER_Y }, enemy) < 8) {
      damagePlayer(world, enemy.damage, enemy.x, enemy.y);
      enemy.hp = 0;
    }
  }

  world.enemies = world.enemies.filter((enemy) => enemy.hp > 0);
}

function finishRun(world: RunnerWorld) {
  if (world.score > world.best) {
    world.best = world.score;
    world.newRecord = true;
    saveBest(world.best);
  }
}

export function RunnerGame({ onExit }: { onExit: () => void }) {
  const worldRef = useRef<RunnerWorld>(initialWorld(loadBest()));
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const arenaHeightRef = useRef(600);
  const [snapshot, setSnapshot] = useState<RunnerSnapshot>(() => makeSnapshot(worldRef.current));

  const publish = useCallback(() => setSnapshot(makeSnapshot(worldRef.current)), []);

  const startRun = useCallback(() => {
    worldRef.current = initialWorld(worldRef.current.best);
    worldRef.current.status = "playing";
    worldRef.current.message = "Дичь идёт сверху. Веди отряд через жирные бонусы.";
    publish();
  }, [publish]);

  const setTargetFromPointer = useCallback((clientX: number) => {
    const arena = arenaRef.current;
    if (!arena) {
      return;
    }

    const rect = arena.getBoundingClientRect();
    worldRef.current.targetX = clamp(((clientX - rect.left) / rect.width) * 100, PLAYER_MIN_X, PLAYER_MAX_X);
  }, []);

  // На ПК отряд водят и стрелками (или A/D).
  useEffect(() => {
    const setKey = (event: KeyboardEvent, pressed: boolean) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") keysRef.current.left = pressed;
      else if (event.code === "ArrowRight" || event.code === "KeyD") keysRef.current.right = pressed;
      else return;
      event.preventDefault();
    };
    const down = (event: KeyboardEvent) => setKey(event, true);
    const up = (event: KeyboardEvent) => setKey(event, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Арена становится ниже, когда появляется полоска босса: зазоры между врагами считаются от её настоящей высоты.
  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const observer = new ResizeObserver(() => {
      if (arena.clientHeight > 0) arenaHeightRef.current = arena.clientHeight;
    });
    observer.observe(arena);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loop = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      const dt = Math.min(0.033, (time - lastTime) / 1000);
      lastTimeRef.current = time;
      const world = worldRef.current;
      const direction = Number(keysRef.current.right) - Number(keysRef.current.left);
      if (direction !== 0 && world.status === "playing") {
        world.targetX = clamp(world.targetX + direction * KEYBOARD_SPEED * dt, PLAYER_MIN_X, PLAYER_MAX_X);
      }
      const wasPlaying = world.status === "playing";
      tickWorld(world, dt, arenaHeightRef.current);
      if (wasPlaying && world.status !== "playing") finishRun(world);
      setSnapshot(makeSnapshot(world));
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const bossRatio = snapshot.bossHp / snapshot.bossMaxHp;
  const finished = snapshot.status === "won" || snapshot.status === "lost";

  return (
    <main className="runner-shell">
      <section className="runner-phone" aria-label="Дичь идёт">
        <header className="runner-hud">
          <div className="runner-stat" title="Бойцы в отряде">👥 {snapshot.squad}</div>
          <div className="runner-progress" aria-label="Прогресс забега">
            <span style={{ width: `${snapshot.progress}%` }} />
          </div>
          <div className="runner-stat" title="Очки">⭐ {snapshot.score}</div>
        </header>

        {snapshot.bossActive && (
          <div className="boss-bar" aria-label="Здоровье босса">
            <strong>{BOSS_NAME}</strong>
            <span><i style={{ width: `${bossRatio * 100}%` }} /></span>
          </div>
        )}

        <div
          ref={arenaRef}
          className="runner-arena"
          onPointerDown={(event) => {
            // Вне забега не захватываем палец: с захватом клик по кнопкам оверлея достаётся арене.
            if (worldRef.current.status !== "playing") {
              return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            setTargetFromPointer(event.clientX);
          }}
          onPointerMove={(event) => setTargetFromPointer(event.clientX)}
        >
          <div className="runner-road-lines" />

          {snapshot.gates.map((gate) => (
            <div
              key={gate.id}
              className={`runner-gate runner-gate--${gate.tone}`}
              style={{ left: `${gate.x}%`, top: `${gate.y}%` }}
            >
              {gate.label}
            </div>
          ))}

          {snapshot.bullets.map((bullet) => (
            <div
              key={bullet.id}
              className={bullet.rocket ? "runner-rocket" : "runner-bullet"}
              style={{ left: `${bullet.x}%`, top: `${bullet.y}%` }}
            >
              {bullet.rocket ? "🚀" : "•"}
            </div>
          ))}

          {snapshot.bossActive && (
            <div className="runner-boss" style={{ left: "50%", top: "10%" }}>
              <span>🛍️</span>
              <strong>{BOSS_NAME}</strong>
            </div>
          )}

          {snapshot.enemies.map((enemy) => (
            <div
              key={enemy.id}
              className={`runner-enemy runner-enemy--${enemy.kind}`}
              style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
            >
              <span>{enemy.emoji}</span>
              <small>{enemy.label}</small>
              <i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
            </div>
          ))}

          {snapshot.floaters.map((floater) => (
            <div key={floater.id} className="runner-floater" style={{ left: `${floater.x}%`, top: `${floater.y}%` }}>
              {floater.text}
            </div>
          ))}

          <div className={`runner-player ${snapshot.shield ? "runner-player--shield" : ""}`} style={{ left: `${snapshot.playerX}%` }}>
            <div className="runner-squad-cloud">
              <span>😤</span>
              <span>🔫</span>
              <span>🧢</span>
            </div>
            <strong>{snapshot.squad}</strong>
          </div>

          {snapshot.status !== "playing" && (
            <div className="runner-overlay">
              <p className="eyebrow">РЕКЛАМА · 0+</p>
              <h1>{snapshot.status === "won" ? "ПОБЕДА" : snapshot.status === "lost" ? "ОТРЯД ВСЁ" : "ДИЧЬ ИДЁТ"}</h1>
              <p>{snapshot.message}</p>
              {finished && (
                <p className="runner-score">
                  ⭐ {snapshot.score} · рекорд {snapshot.best}
                  {snapshot.newRecord && <strong>Новый рекорд!</strong>}
                </p>
              )}
              {!finished && snapshot.best > 0 && <p className="runner-score">рекорд ⭐ {snapshot.best}</p>}
              <div className="runner-overlay__actions">
                <button type="button" className="gold-button" onClick={startRun}>
                  {snapshot.status === "ready" ? "НАЧАТЬ ЗАБЕГ" : "ЕЩЁ РАЗ"}
                </button>
                <button type="button" className="danger-button" onClick={onExit}>
                  В МЕНЮ
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="runner-help">
          <span>{snapshot.damageBoost > 0 ? "🔥 x2 урон" : "🔥 базовый урон"}</span>
          <span>{snapshot.fireRateBoost > 0 ? "⚡ x2 темп" : "⚡ автоогонь"}</span>
          <span>{snapshot.frozen > 0 ? "🧊 враги в шоке" : snapshot.shield ? "🛡️ щит" : "↔️ веди отряд"}</span>
        </footer>
      </section>
    </main>
  );
}
