// Экспорт сюжета из src/story.ts в данные для Mega Drive:
//   sega/src/story_data.h, sega/src/story_data.c — сцены, условия, выборы и строки;
//   sega/src/font_data.c — тайлы шрифта 8×8 только для символов, которые есть в тексте.
// Запуск: node sega/tools/export-story.mjs (Node 22.18+). С флагом --check только проверяет, что файлы актуальны.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEATHS,
  DIED_FLAG,
  ENDINGS,
  IDLE_CHOICE_TEXT,
  IDLE_SCENE,
  LAST_DEATH_TOKEN,
  MAX_LAYER_DEPTH,
  NESTED_EXIT_SCENE,
  NESTED_START_SCENE,
  RESPAWN_SCENE,
  SCENES,
  START_SCENE,
  TOO_DEEP_SCENE,
  isInsight,
  lastDeathLabel,
  sceneVariants,
} from "../../src/story.ts";
import { glyphRows } from "./font.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../src");
const checkOnly = process.argv.includes("--check");

/** Ширина строки на экране: 40 клеток минус поля по одной клетке. */
const TEXT_WIDTH = 38;

// Строки интерфейса Mega Drive. Описания слоёв повторяют GRAPHICS_LEVELS из src/App.tsx.
const UI = {
  TITLE: "WRONG WORLD",
  EYEBROW: "07:00 · 220 В манны",
  SUBTITLE_1: "Ваш мир. Ваша комната.",
  SUBTITLE_2: "Только за ночь в неё пришла магия —",
  SUBTITLE_3: "и всё стало неправильным.",
  MENU_WAKE: "Проснуться",
  MENU_COLLECTION: "Коллекция",
  STATUS_HINT: "START — коллекция",
  COLLECTION: "Коллекция",
  BACK: "B — назад",
  ENDINGS: "Концовки",
  DEATHS: "Смерти",
  LOCKED: "???",
  DEATH_PREFIX: "💀 СМЕРТЬ #",
  COLON_SPACE: ": ",
  DIVIDER: "═".repeat(TEXT_WIDTH),
  DARKNESS: "Темнота. Холод. Тишина.",
  NEW_DEATH: "Новая смерть в коллекции. Вы запомнили, как это случилось.",
  OLD_DEATH: "Опять это. Вы ведь уже знали, чем кончится.",
  NESTED_DEATH: "Руна на системнике вспыхивает и гаснет. Смерть в игре оказалась настоящей.",
  WAKE: "Открыть глаза (опять…)",
  MORE: "▼ A — дальше",
  ENDING_CONTINUE: "A — играть дальше",
  ENDING_NEW_GAME: "B — новая игра (стереть прогресс)",
  LAST_DEATH_NONE: lastDeathLabel(null),
  LAYER_1: "Зернисто. Текстуры размыты. Тени квадратные.",
  LAYER_2: "Вы — @. Стол — [СТОЛ]. Шкаф — [ШКАФ]. Добро пожаловать в терминал.",
  LAYER_3: "бНОПНЯ рДЕУШ ЦТЮЪХЙЮ ЯХКЭМН ЯКСЛЮКЮЯЭ. щРН ДМН.",
  ICON_DEATH: "💀",
  ICON_ENDING: "🌅",
  ICON_INSIGHT: "⚡",
  CURSOR: "▶",
  PROMPT: ">",
  QUOTE_OPEN: "«",
  QUOTE_CLOSE: "»",
};

// Порча текста в игре внутри игры — как corruptText() в src/App.tsx.
const CORRUPT_FROM = "абвгдежзиклмнопрстуфхцчшщъыьэюя";
const CORRUPT_TO = "ЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЭЫЪЗШЬЧЩ";

const CODE_END = 0;
const CODE_NEWLINE = 1;
const CODE_LAST_DEATH = 2;
const CODE_FIRST_GLYPH = 3;

// ── Сбор строк ──────────────────────────────────────────────────────────────
const strings = [];
const stringIndex = new Map();
function str(text) {
  if (!stringIndex.has(text)) {
    stringIndex.set(text, strings.length);
    strings.push(text);
  }
  return stringIndex.get(text);
}

const uiIndex = Object.fromEntries(Object.entries(UI).map(([key, text]) => [key, str(text)]));
const idleText = str(IDLE_CHOICE_TEXT);

// ── Память и флаги ──────────────────────────────────────────────────────────
const deathIds = Object.keys(DEATHS).map(Number);
const memoryFlags = new Set([DIED_FLAG]);
const runFlags = new Set();
const sceneIds = Object.keys(SCENES);

function scanCondition(condition) {
  if (!condition) return;
  for (const key of [...(condition.mem ?? []), ...(condition.noMem ?? [])]) if (typeof key === "string") memoryFlags.add(key);
  for (const flag of [...(condition.run ?? []), ...(condition.noRun ?? [])]) runFlags.add(flag);
}
for (const scene of Object.values(SCENES)) {
  for (const variant of sceneVariants(scene)) {
    scanCondition(variant.if);
    for (const note of variant.notes ?? []) scanCondition(note.if);
    for (const choice of variant.choices ?? []) scanCondition(choice.if);
    for (const key of variant.remember ?? []) if (typeof key === "string") memoryFlags.add(key);
    for (const flag of [...(variant.set ?? []), ...(variant.unset ?? [])]) runFlags.add(flag);
  }
}

const memoryBit = new Map(deathIds.map((id) => [id, id]));
[...memoryFlags].sort().forEach((flag, index) => memoryBit.set(flag, deathIds.length + index));
const runBit = new Map([...runFlags].sort().map((flag, index) => [flag, index]));
if (memoryBit.size > 32) throw new Error(`Память не влезает в 32 бита: ${memoryBit.size}`);
if (runBit.size > 16) throw new Error(`Флаги жизни не влезают в 16 бит: ${runBit.size}`);

const memMask = (keys = []) => keys.reduce((mask, key) => (mask | (1 << memoryBit.get(key))) >>> 0, 0);
const runMask = (flags = []) => flags.reduce((mask, flag) => mask | (1 << runBit.get(flag)), 0);

// ── Условия ─────────────────────────────────────────────────────────────────
const conds = [];
const condIndex = new Map();
function cond(condition) {
  const row = [
    memMask(condition?.mem),
    memMask(condition?.noMem),
    runMask(condition?.run),
    runMask(condition?.noRun),
    condition?.minDepth ?? 0,
    condition?.maxDepth ?? 127,
  ];
  const key = row.join(",");
  if (!condIndex.has(key)) {
    condIndex.set(key, conds.length);
    conds.push(row);
  }
  return condIndex.get(key);
}
cond(undefined); // 0 — «всегда».

// ── Сцены ───────────────────────────────────────────────────────────────────
const ACTION = { goto: 0, launch: 1, exit: 2, win: 3 };
const endingIds = Object.keys(ENDINGS);
const sceneNumber = new Map(sceneIds.map((id, index) => [id, index]));
const sceneRows = [];
const variantRows = [];
const noteRows = [];
const choiceRows = [];
let maxChoices = 0;
let maxText = 0;
const maxDeathName = Math.max(...deathIds.map((id) => DEATHS[id].name.length));
const layerText = Math.max(UI.LAYER_1.length, UI.LAYER_2.length, UI.LAYER_3.length) + 2;
const deathBlock =
  UI.NESTED_DEATH.length + UI.DIVIDER.length * 2 + UI.DEATH_PREFIX.length + 4 + maxDeathName +
  Math.max(...deathIds.map((id) => DEATHS[id].desc.length)) + UI.DARKNESS.length + UI.NEW_DEATH.length + 12;

for (const id of sceneIds) {
  const variants = sceneVariants(SCENES[id]);
  sceneRows.push([variantRows.length, variants.length, id]);
  for (const variant of variants) {
    const firstNote = noteRows.length;
    for (const note of variant.notes ?? []) noteRows.push([str(note.text), cond(note.if)]);
    const firstChoice = choiceRows.length;
    for (const choice of variant.choices ?? []) {
      if (choice.to && !sceneNumber.has(choice.to)) throw new Error(`${id}: нет сцены ${choice.to}`);
      choiceRows.push([
        str(choice.text),
        cond(choice.if),
        choice.to ? sceneNumber.get(choice.to) : 0xffff,
        ACTION[choice.action ?? "goto"],
        choice.ending ? endingIds.indexOf(choice.ending) : 0,
        isInsight(choice) ? 1 : 0,
      ]);
    }
    const flags = (variant.idle !== false ? 1 : 0) | (variant.showGraphics ? 2 : 0) | (variant.music === "computer" ? 4 : 0);
    variantRows.push([
      cond(variant.if),
      str(variant.text),
      firstNote,
      firstChoice,
      (variant.notes ?? []).length,
      (variant.choices ?? []).length,
      variant.death ?? -1,
      flags,
      runMask(variant.set),
      runMask(variant.unset),
      memMask(variant.remember),
    ]);
    maxChoices = Math.max(maxChoices, (variant.choices ?? []).length + 1);
    const tokens = variant.text.split(LAST_DEATH_TOKEN).length - 1;
    const notes = (variant.notes ?? []).reduce((sum, note) => sum + note.text.length + 1, 0);
    const length = variant.text.length + notes + tokens * (maxDeathName + 2) + layerText + (variant.death !== undefined ? deathBlock : 0);
    maxText = Math.max(maxText, length);
  }
}

const deathRows = deathIds.map((id) => [str(DEATHS[id].name), str(DEATHS[id].desc)]);
const endingRows = endingIds.map((id) => [str(ENDINGS[id].title), str(ENDINGS[id].desc)]);

// ── Кодировка символов ──────────────────────────────────────────────────────
const prepared = strings.map((text) => text.replaceAll(LAST_DEATH_TOKEN, "\u0002"));
const charset = new Set(["_", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "/", " "]);
for (const text of prepared) for (const char of text) if (char !== "\n" && char !== "\u0002") charset.add(char);
for (const char of CORRUPT_TO) {
  charset.add(char);
  charset.add(char.toLowerCase());
}
const glyphs = [...charset].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const missing = glyphs.filter((char) => !glyphRows(char));
if (missing.length) throw new Error(`Нет глифов в sega/tools/font.mjs: ${missing.map((c) => JSON.stringify(c)).join(" ")}`);
if (glyphs.length + CODE_FIRST_GLYPH > 255) throw new Error(`Слишком много символов: ${glyphs.length}`);
const codeOf = new Map(glyphs.map((char, index) => [char, CODE_FIRST_GLYPH + index]));

function encode(text) {
  return [...text].map((char) => (char === "\n" ? CODE_NEWLINE : char === "\u0002" ? CODE_LAST_DEATH : codeOf.get(char)));
}

const corruptMap = [];
for (let code = 0; code < CODE_FIRST_GLYPH + glyphs.length; code += 1) {
  const char = glyphs[code - CODE_FIRST_GLYPH];
  const index = char ? CORRUPT_FROM.indexOf(char.toLowerCase()) : -1;
  if (index === -1) {
    corruptMap.push(code);
    continue;
  }
  const replacement = CORRUPT_TO[index % CORRUPT_TO.length];
  corruptMap.push(codeOf.get(char === char.toUpperCase() ? replacement.toUpperCase() : replacement.toLowerCase()));
}

// ── Вывод C ─────────────────────────────────────────────────────────────────
const cBytes = (bytes) => `"${bytes.map((byte) => `\\${byte.toString(8).padStart(3, "0")}`).join("")}"`;
const cIdent = (id) => id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
const hex32 = (value) => `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
const header = "/* Сгенерировано sega/tools/export-story.mjs из src/story.ts. Не править вручную: node sega/tools/export-story.mjs */\n";

const h = [
  header,
  "#ifndef WW_STORY_DATA_H",
  "#define WW_STORY_DATA_H",
  "",
  '#include "ww_data.h"',
  "",
  `#define WW_TEXT_WIDTH ${TEXT_WIDTH}`,
  `#define WW_MAX_TEXT ${maxText + 64}`,
  `#define WW_MAX_CHOICES ${maxChoices}`,
  `#define WW_MAX_LAYER_DEPTH ${MAX_LAYER_DEPTH}`,
  `#define WW_SCENE_COUNT ${sceneRows.length}`,
  `#define WW_CHOICE_DEF_COUNT ${choiceRows.length}`,
  `#define WW_DEATH_COUNT ${deathRows.length}`,
  `#define WW_ENDING_COUNT ${endingRows.length}`,
  `#define WW_GLYPH_COUNT ${glyphs.length}`,
  `#define WW_CODE_COUNT ${CODE_FIRST_GLYPH + glyphs.length}`,
  "",
  `#define WW_SCENE_START ${sceneNumber.get(START_SCENE)}`,
  `#define WW_SCENE_RESPAWN ${sceneNumber.get(RESPAWN_SCENE)}`,
  `#define WW_SCENE_NESTED_START ${sceneNumber.get(NESTED_START_SCENE)}`,
  `#define WW_SCENE_NESTED_EXIT ${sceneNumber.get(NESTED_EXIT_SCENE)}`,
  `#define WW_SCENE_TOO_DEEP ${sceneNumber.get(TOO_DEEP_SCENE)}`,
  `#define WW_SCENE_IDLE ${sceneNumber.get(IDLE_SCENE)}`,
  "",
  `#define WW_MEM_DIED ${hex32(1 << memoryBit.get(DIED_FLAG))}`,
  ...[...memoryBit].filter(([key]) => typeof key === "string").map(([key, bit]) => `/* память "${key}" — бит ${bit} */`),
  ...[...runBit].map(([flag, bit]) => `/* флаг жизни "${flag}" — бит ${bit} */`),
  "",
  `#define WW_STR_IDLE ${idleText}`,
  ...Object.entries(uiIndex).map(([key, index]) => `#define WW_UI_${key} ${index}`),
  "",
  `#define WW_CODE_SPACE ${codeOf.get(" ")}`,
  `#define WW_CODE_UNDERSCORE ${codeOf.get("_")}`,
  `#define WW_CODE_SLASH ${codeOf.get("/")}`,
  `#define WW_CODE_DIGIT_0 ${codeOf.get("0")}`,
  "",
  "extern const char* const ww_strings[];",
  "extern const WWCond ww_conds[];",
  "extern const WWSceneDef ww_scenes[];",
  "extern const WWVariantDef ww_variants[];",
  "extern const WWNoteDef ww_notes[];",
  "extern const WWChoiceDef ww_choices[];",
  "extern const WWDeathDef ww_deaths[];",
  "extern const WWEndingDef ww_endings[];",
  "extern const u8 ww_corrupt[];",
  "extern const u32 ww_font_tiles[];",
  "#ifdef WW_HOST",
  "extern const char* const ww_glyph_utf8[];",
  "#endif",
  "",
  "#endif",
  "",
].join("\n");

const c = [
  header,
  '#include "story_data.h"',
  "",
  "const char* const ww_strings[] = {",
  ...strings.map((text, index) => `    ${cBytes(encode(prepared[index]))}, /* ${index} */`),
  "};",
  "",
  "const WWCond ww_conds[] = {",
  ...conds.map(([all, none, runAll, runNone, min, max]) => `    { ${hex32(all)}, ${hex32(none)}, 0x${runAll.toString(16)}, 0x${runNone.toString(16)}, ${min}, ${max} },`),
  "};",
  "",
  "const WWSceneDef ww_scenes[] = {",
  ...sceneRows.map(([first, count, id]) => `    { ${first}, ${count} }, /* ${id} */`),
  "};",
  "",
  "const WWVariantDef ww_variants[] = {",
  ...variantRows.map(
    ([cnd, text, firstNote, firstChoice, notes, choices, death, flags, set, unset, remember]) =>
      `    { ${cnd}, ${text}, ${firstNote}, ${firstChoice}, ${notes}, ${choices}, ${death}, ${flags}, 0x${set.toString(16)}, 0x${unset.toString(16)}, ${hex32(remember)} },`,
  ),
  "};",
  "",
  "const WWNoteDef ww_notes[] = {",
  ...(noteRows.length ? noteRows.map(([text, cnd]) => `    { ${text}, ${cnd} },`) : ["    { 0, 0 },"]),
  "};",
  "",
  "const WWChoiceDef ww_choices[] = {",
  ...choiceRows.map(([text, cnd, target, action, ending, insight]) => `    { ${text}, ${cnd}, ${target}, ${action}, ${ending}, ${insight} },`),
  "};",
  "",
  "const WWDeathDef ww_deaths[] = {",
  ...deathRows.map(([name, desc], id) => `    { ${name}, ${desc} }, /* ${id} */`),
  "};",
  "",
  "const WWEndingDef ww_endings[] = {",
  ...endingRows.map(([title, desc], index) => `    { ${title}, ${desc} }, /* ${endingIds[index]} */`),
  "};",
  "",
  "const u8 ww_corrupt[] = {",
  ...chunk(corruptMap, 16).map((row) => `    ${row.join(", ")},`),
  "};",
  "",
  "#ifdef WW_HOST",
  "const char* const ww_glyph_utf8[] = {",
  '    "", "\\n", "{lastDeath}",',
  ...glyphs.map((char) => `    ${cBytes([...Buffer.from(char, "utf8")])}, /* ${cIdent(char.codePointAt(0).toString(16))} */`),
  "};",
  "#endif",
  "",
].join("\n");

const font = [
  header,
  '#include "story_data.h"',
  "",
  "/* Тайлы 8×8 в 4 бит на пиксель: цвет 1 — чернила, 0 — прозрачный. Глиф i рисуется кодом i + 3. */",
  "const u32 ww_font_tiles[] = {",
  ...glyphs.map((char) => {
    // Строка «10110000» как шестнадцатеричное число — это ровно 8 пикселей по 4 бита с цветом 1.
    const rows = glyphRows(char).map((bits) => hex32(parseInt(bits, 16)));
    const label = char === "*" || char === "/" ? `U+${char.codePointAt(0).toString(16)}` : char;
    return `    ${rows.join(", ")}, /* ${label} */`;
  }),
  "};",
  "",
].join("\n");

function chunk(items, size) {
  const rows = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

const outputs = {
  "story_data.h": h,
  "story_data.c": c,
  "font_data.c": font,
};

let stale = false;
for (const [name, content] of Object.entries(outputs)) {
  const file = path.join(outDir, name);
  if (checkOnly) {
    let current = "";
    try {
      current = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    } catch {
      current = "";
    }
    if (current !== content) {
      console.error(`Устарел ${path.relative(process.cwd(), file)} — запустите node sega/tools/export-story.mjs`);
      stale = true;
    }
  } else {
    writeFileSync(file, content);
  }
}

if (stale) process.exit(1);
console.log(
  `${checkOnly ? "Данные Mega Drive актуальны" : "Данные Mega Drive обновлены"}: ` +
    `${sceneRows.length} сцен, ${variantRows.length} вариантов, ${choiceRows.length} выборов, ` +
    `${strings.length} строк, ${glyphs.length} глифов, буфер текста ${maxText + 64} байт.`,
);
