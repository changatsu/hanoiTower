// ねこだな（猫の色仕分けパズル）のゲームロジック。UI に依存しない純粋関数だけを置く。
//
// 盤面 shelves は棚の配列。棚は猫の配列で、index 0 が奥（左端）、最後の要素が「先頭」（右端）。
// 猫は { id, color, hidden }。hidden の猫は先頭に来るまで色がわからない。

export const COLOR_COUNT = 9;

// ステージ構成：レベル（初級・中級・上級）ごとに 12 ステージ、全 36 ステージ。
// 内部では通し番号 no（1〜36）で扱う。初級 1 = 1、中級 1 = 13、上級 1 = 25。
export const LEVELS = [
  // colors: 色の数（1 ステージ目 → 12 ステージ目）、hidden: ？になる割合（同）
  { name: "初級", colors: [3, 5], hidden: [0, 0.25] },
  { name: "中級", colors: [5, 7], hidden: [0.3, 0.45] },
  { name: "上級", colors: [7, 9], hidden: [0.45, 0.6] },
];
export const STAGES_PER_LEVEL = 12;
export const TOTAL_STAGES = LEVELS.length * STAGES_PER_LEVEL;

// 通し番号 → { levelIndex, levelName, stage（レベル内の 1〜12）, label }
export function stageInfo(no) {
  const n = Math.min(Math.max(1, no), TOTAL_STAGES);
  const levelIndex = Math.floor((n - 1) / STAGES_PER_LEVEL);
  const stage = n - levelIndex * STAGES_PER_LEVEL;
  const levelName = LEVELS[levelIndex].name;
  return { no: n, levelIndex, levelName, stage, label: `${levelName} ステージ${stage}` };
}

export const stageNo = (levelIndex, stage) => levelIndex * STAGES_PER_LEVEL + stage;

// ステージごとの難しさ。colors: 色の数、cap: 棚に並べる数、empty: 空き棚の数、hidden: ？になる割合
// cap はスマホでもねこが小さくなりすぎないよう、どのステージでも 4 にそろえる（難しさは色の数と？で上げる）
export function stageConfig(no) {
  const { levelIndex, stage } = stageInfo(no);
  const lv = LEVELS[levelIndex];
  const t = (stage - 1) / (STAGES_PER_LEVEL - 1);
  const colors = Math.round(lv.colors[0] + (lv.colors[1] - lv.colors[0]) * t);
  // 初級の最初の 3 ステージは？なしで、ルールに慣れてもらう
  const hidden = levelIndex === 0 && stage <= 3 ? 0 : lv.hidden[0] + (lv.hidden[1] - lv.hidden[0]) * t;
  return { colors, cap: 4, empty: 2, hidden: Math.round(hidden * 100) / 100 };
}

// 再現できる乱数（同じステージは毎回同じ盤面になる）
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const front = (shelf) => shelf[shelf.length - 1];

// 先頭から続く、色がわかっている同じ色の猫の数
export function frontRun(shelf) {
  const f = front(shelf);
  if (!f || f.hidden) return 0;
  let n = 0;
  for (let i = shelf.length - 1; i >= 0; i--) {
    const c = shelf[i];
    if (c.hidden || c.color !== f.color) break;
    n++;
  }
  return n;
}

// from の棚から to の棚へ動かせる猫の数（動かせなければ 0）
export function movableCount(shelves, cap, from, to) {
  if (from === to) return 0;
  const src = shelves[from];
  const dst = shelves[to];
  if (!src || !dst || src.length === 0) return 0;
  const room = cap - dst.length;
  if (room <= 0) return 0;
  const f = front(src);
  const d = front(dst);
  if (d && (d.hidden || d.color !== f.color)) return 0;
  return Math.min(frontRun(src), room);
}

// 先頭の猫の色を明かす
export function revealFronts(shelves) {
  return shelves.map((s) => {
    const f = front(s);
    if (!f || !f.hidden) return s;
    return [...s.slice(0, -1), { ...f, hidden: false }];
  });
}

// 1 手動かした新しい盤面を返す（動かせなければ null）
export function applyMove(shelves, cap, from, to) {
  const n = movableCount(shelves, cap, from, to);
  if (n === 0) return null;
  const next = shelves.slice();
  const moving = shelves[from].slice(-n);
  next[from] = shelves[from].slice(0, -n);
  next[to] = [...shelves[to], ...moving];
  return revealFronts(next);
}

export function isShelfComplete(shelf, cap) {
  return shelf.length === cap && shelf.every((c) => !c.hidden && c.color === shelf[0].color);
}

export function isSolved(shelves, cap) {
  return shelves.every((s) => s.length === 0 || isShelfComplete(s, cap));
}

export function hasAnyMove(shelves, cap) {
  for (let i = 0; i < shelves.length; i++)
    for (let j = 0; j < shelves.length; j++) if (movableCount(shelves, cap, i, j) > 0) return true;
  return false;
}

// ---- 面の生成と解けるかの確認 ----

const keyOf = (colorShelves) =>
  colorShelves
    .map((s) => s.join(","))
    .sort()
    .join("|");

// 全部の色が見えている前提で解けるか（？は色を隠すだけで移動のルールは同じなので、
// これが解ければ「正しく選べば必ず解ける」面になる）
export function isSolvable(colorShelves, cap, limit = 200000) {
  const seen = new Set();
  let nodes = 0;
  const solved = (st) => st.every((s) => s.length === 0 || (s.length === cap && s.every((c) => c === s[0])));
  const dfs = (st) => {
    if (solved(st)) return true;
    if (++nodes > limit) return null;
    const k = keyOf(st);
    if (seen.has(k)) return false;
    seen.add(k);
    for (let i = 0; i < st.length; i++) {
      const src = st[i];
      if (src.length === 0) continue;
      const c = src[src.length - 1];
      let run = 0;
      for (let p = src.length - 1; p >= 0 && src[p] === c; p--) run++;
      let triedEmpty = false;
      for (let j = 0; j < st.length; j++) {
        if (i === j) continue;
        const dst = st[j];
        if (dst.length >= cap) continue;
        if (dst.length === 0) {
          if (run === src.length || triedEmpty) continue; // 全部同じ色の棚を空き棚へ移すのは無意味
          triedEmpty = true;
        } else if (dst[dst.length - 1] !== c) continue;
        const n = Math.min(run, cap - dst.length);
        const next = st.slice();
        next[i] = src.slice(0, -n);
        next[j] = dst.concat(Array(n).fill(c));
        const r = dfs(next);
        if (r) return true;
        if (r === null) return null;
      }
    }
    return false;
  };
  return dfs(colorShelves) === true;
}

// ステージ（通し番号 no）の盤面を作る。戻り値 { shelves, cap, colors }
export function createStage(no) {
  const cfg = stageConfig(no);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rand = mulberry32(no * 7919 + attempt * 104729 + 17);
    // 使う色を選ぶ
    const palette = [...Array(COLOR_COUNT).keys()];
    shuffle(palette, rand);
    const colors = palette.slice(0, cfg.colors);
    const pool = [];
    for (const c of colors) for (let i = 0; i < cfg.cap; i++) pool.push(c);
    shuffle(pool, rand);
    const colorShelves = [];
    for (let s = 0; s < cfg.colors; s++) colorShelves.push(pool.slice(s * cfg.cap, (s + 1) * cfg.cap));
    for (let e = 0; e < cfg.empty; e++) colorShelves.push([]);
    // 最初から揃っている棚がある配置は避ける
    if (colorShelves.some((s) => s.length > 0 && s.every((c) => c === s[0]))) continue;
    if (!isSolvable(colorShelves, cfg.cap)) continue;
    let id = 0;
    const shelves = colorShelves.map((s) =>
      s.map((color, i) => ({
        id: id++,
        color,
        hidden: i < s.length - 1 && rand() < cfg.hidden,
      }))
    );
    return { shelves: revealFronts(shelves), cap: cfg.cap, colors: cfg.colors };
  }
  throw new Error("level generation failed");
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
