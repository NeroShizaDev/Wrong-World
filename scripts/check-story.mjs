// Проверка связности сюжета: битые переходы, недостижимые сцены и смерти,
// флаги, которые требуются, но нигде не выдаются. Запуск: npm run check:story (Node 22.18+).
import {
  DEATHS,
  DIED_FLAG,
  ENDINGS,
  NESTED_EXIT_SCENE,
  NESTED_START_SCENE,
  RESPAWN_SCENE,
  SCENES,
  START_SCENE,
  TOO_DEEP_SCENE,
  IDLE_SCENE,
  MAX_LAYER_DEPTH,
  checkCondition,
  resolveScene,
  sceneVariants,
} from "../src/story.ts";

const errors = [];
const sceneIds = new Set(Object.keys(SCENES));
const deathIds = Object.keys(DEATHS).map(Number);

const usedDeaths = new Set();
// Номера смертей и флаг «уже умирал» выдаёт сам движок.
const grantedMemory = new Set([...deathIds, DIED_FLAG]);
const requiredMemory = new Map();
const grantedRun = new Set();
const requiredRun = new Map();
const edges = new Map();

function need(map, key, where) {
  if (!map.has(key)) map.set(key, where);
}

function collectCondition(condition, where) {
  if (!condition) return;
  for (const key of [...(condition.mem ?? []), ...(condition.noMem ?? [])]) need(requiredMemory, key, where);
  for (const flag of [...(condition.run ?? []), ...(condition.noRun ?? [])]) need(requiredRun, flag, where);
}

for (const [id, scene] of Object.entries(SCENES)) {
  const targets = new Set();
  sceneVariants(scene).forEach((variant, index) => {
    const where = `${id}[${index}]`;
    collectCondition(variant.if, where);
    for (const note of variant.notes ?? []) collectCondition(note.if, where);
    for (const key of variant.remember ?? []) grantedMemory.add(key);
    for (const flag of variant.set ?? []) grantedRun.add(flag);

    if (variant.death !== undefined) {
      if (!(variant.death in DEATHS)) errors.push(`${where}: неизвестная смерть #${variant.death}`);
      usedDeaths.add(variant.death);
      if (variant.choices?.length) errors.push(`${where}: у смертельной сцены не должно быть выборов`);
    } else if (!variant.choices?.length) {
      errors.push(`${where}: сцена без выборов и без смерти — тупик`);
    }

    for (const choice of variant.choices ?? []) {
      collectCondition(choice.if, `${where} → «${choice.text}»`);
      if (choice.to) {
        if (!sceneIds.has(choice.to)) errors.push(`${where}: выбор «${choice.text}» ведёт в несуществующую сцену "${choice.to}"`);
        targets.add(choice.to);
      } else if (!choice.action) {
        errors.push(`${where}: выбор «${choice.text}» никуда не ведёт`);
      }
      if (choice.action === "launch") targets.add(NESTED_START_SCENE).add(TOO_DEEP_SCENE).add(NESTED_EXIT_SCENE);
      if (choice.action === "win" && !(choice.ending in ENDINGS)) errors.push(`${where}: неизвестная концовка "${choice.ending}"`);
    }
  });
  edges.set(id, targets);
}

// Движок сам переходит в эти сцены: старт, воскрешение после смерти и «Стоять столбом».
const roots = [START_SCENE, RESPAWN_SCENE, IDLE_SCENE];
for (const id of [...roots, NESTED_START_SCENE, NESTED_EXIT_SCENE, TOO_DEEP_SCENE]) {
  if (!sceneIds.has(id)) errors.push(`служебная сцена "${id}" отсутствует`);
}

const reachable = new Set(roots);
const queue = [...roots];
while (queue.length) {
  for (const next of edges.get(queue.shift()) ?? []) {
    if (!reachable.has(next)) {
      reachable.add(next);
      queue.push(next);
    }
  }
}

for (const id of sceneIds) if (!reachable.has(id)) errors.push(`сцена "${id}" недостижима`);
for (const id of deathIds) if (!usedDeaths.has(id)) errors.push(`смерть #${id} «${DEATHS[id].name}» ни к чему не привязана`);
for (const [key, where] of requiredMemory) if (!grantedMemory.has(key)) errors.push(`${where}: память "${key}" нигде не выдаётся`);
for (const [flag, where] of requiredRun) if (!grantedRun.has(flag)) errors.push(`${where}: флаг "${flag}" нигде не ставится`);

// Симуляция с учётом условий: игрок начинает без памяти, проходит все ветки одной жизни,
// умирает, запоминает и пробует снова — пока память не перестанет расти.
function exploreLife(memory) {
  const deaths = new Map();
  const won = new Set();
  const seen = new Set();
  const queue = [
    { scene: START_SCENE, run: new Set(), mem: new Set(memory), depth: 0 },
    { scene: RESPAWN_SCENE, run: new Set(), mem: new Set(memory), depth: 0 },
  ];

  while (queue.length) {
    const state = queue.shift();
    const key = `${state.scene}|${state.depth}|${[...state.run].sort()}|${[...state.mem].sort()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const variant = resolveScene(SCENES[state.scene], { mem: state.mem, run: state.run, depth: state.depth });
    const mem = new Set([...state.mem, ...(variant.remember ?? [])]);
    const run = new Set(state.run);
    for (const flag of variant.set ?? []) run.add(flag);
    for (const flag of variant.unset ?? []) run.delete(flag);

    if (variant.death !== undefined) {
      if (!deaths.has(variant.death)) deaths.set(variant.death, mem);
      continue;
    }

    const ctx = { mem, run, depth: state.depth };
    const choices = (variant.choices ?? []).filter((choice) => checkCondition(choice.if, ctx));
    if (state.depth === 0 && variant.idle !== false && choices.length) choices.push({ to: IDLE_SCENE });

    for (const choice of choices) {
      if (choice.action === "win") won.add(choice.ending);
      else if (choice.action === "launch") {
        queue.push(
          state.depth >= MAX_LAYER_DEPTH
            ? { scene: TOO_DEEP_SCENE, run, mem, depth: state.depth }
            : { scene: NESTED_START_SCENE, run: new Set(), mem, depth: state.depth + 1 },
        );
      } else if (choice.action === "exit") queue.push({ scene: NESTED_EXIT_SCENE, run: new Set(), mem, depth: state.depth - 1 });
      else if (choice.to) queue.push({ scene: choice.to, run, mem, depth: state.depth });
    }
  }

  return { deaths, won };
}

let memory = new Set();
const reachedDeaths = new Set();
const winLife = new Map();
for (let life = 1; life <= 40; life += 1) {
  const { deaths, won } = exploreLife(memory);
  for (const ending of won) if (!winLife.has(ending)) winLife.set(ending, life);
  const next = new Set(memory);
  for (const [id, mem] of deaths) {
    reachedDeaths.add(id);
    next.add(id).add(DIED_FLAG);
    for (const key of mem) next.add(key);
  }
  if (next.size === memory.size) break;
  memory = next;
}

for (const id of deathIds) {
  if (usedDeaths.has(id) && !reachedDeaths.has(id)) errors.push(`смерть #${id} «${DEATHS[id].name}» недостижима с учётом условий`);
}
for (const ending of Object.keys(ENDINGS)) {
  if (!winLife.has(ending)) errors.push(`концовка "${ending}" недостижима с учётом условий`);
}

if (errors.length) {
  console.error(`Сюжет сломан (${errors.length}):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Сюжет связан. Сцен: ${sceneIds.size}, достижимых смертей: ${reachedDeaths.size}/${deathIds.length}, ` +
    `концовки открываются на уровне знаний: ${[...winLife].map(([ending, life]) => `${ending} — ${life}`).join(", ")}.`,
);
