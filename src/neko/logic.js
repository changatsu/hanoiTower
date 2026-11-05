// ねこだな（猫の色仕分けパズル）のゲームロジック。UI に依存しない純粋関数だけを置く。
//
// 盤面 shelves は棚の配列。棚は猫の配列で、index 0 が奥（左端）、最後の要素が「先頭」（右端）。
// 猫は { id, color, hidden }。hidden の猫は先頭に来るまで色がわからない。

export const COLOR_COUNT = 9;

// ステージ構成：レベル（初級・中級・上級・超上級）ごとに 12 ステージ。
// 内部では通し番号 no で扱う。初級 1 = 1、中級 1 = 13、上級 1 = 25、超上級 1 = 37。
// 超上級 12 をクリアすると「エンドレス」（超上級 13, 14, … と続く）が開放される。
// エンドレスの通し番号は ENDLESS_BASE + ステージ（超上級 13 = 1013）。
export const LEVELS = [
  // colors: 色の数（1 ステージ目 → 12 ステージ目）、hidden: ？になる割合（同）
  { name: "初級", colors: [3, 5], hidden: [0, 0.25] },
  { name: "中級", colors: [5, 7], hidden: [0.3, 0.45] },
  { name: "上級", colors: [7, 9], hidden: [0.45, 0.6] },
  // 超上級：空き棚を 1 つに減らすと解けない配置ばかりになるので、空き棚は 2 のまま
  // ？を増やして、12 ステージ目では先頭以外ぜんぶ？にする
  { name: "超上級", colors: [9, 9], hidden: [0.7, 1] },
];
export const STAGES_PER_LEVEL = 12;
export const TOTAL_STAGES = LEVELS.length * STAGES_PER_LEVEL;
export const ENDLESS_LEVEL = LEVELS.length - 1; // 超上級の続き
export const ENDLESS_FIRST = STAGES_PER_LEVEL + 1; // 超上級 13 から
export const ENDLESS_BASE = 1000;
const LAST_REGULAR = TOTAL_STAGES; // 超上級 12（= 48）

// 今日の1問（デイリー）の通し番号は日付そのもの（2026 年 11 月 6 日 = 20261106）
export const DAILY_BASE = 20000000;
export const isDaily = (no) => no >= DAILY_BASE;
export const isEndless = (no) => no > ENDLESS_BASE && !isDaily(no);
export const endlessNo = (stage) => ENDLESS_BASE + stage;

// ---- 今日の1問 ----
// 日付（端末のその日）から決まる 1 日 1 問。曜日で難しさが変わる（月曜がやさしく、日曜がいちばん難しい）
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const DAILY_CONFIG = {
  1: { colors: 5, hidden: 0.3 },
  2: { colors: 6, hidden: 0.35 },
  3: { colors: 6, hidden: 0.4 },
  4: { colors: 7, hidden: 0.45 },
  5: { colors: 7, hidden: 0.5 },
  6: { colors: 8, hidden: 0.55 },
  0: { colors: 9, hidden: 0.6 },
};
export const dailyNo = (date = new Date()) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
export function dailyDate(no) {
  const d = new Date(Math.floor(no / 10000), Math.floor(no / 100) % 100 - 1, no % 100);
  return dailyNo(d) === no ? d : null; // 存在しない日付は null
}
// 何日続けて今日の1問を解いたか。isCleared(no) はその日を解いたかどうか。今日をまだ解いていなければ昨日から数える
export function dailyStreak(isCleared, today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!isCleared(dailyNo(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (n < 3650 && isCleared(dailyNo(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// 通し番号 → { levelIndex, levelName, barName（操作行の表示）, stage（レベル内の番号）, endless, daily, label }
export function stageInfo(no) {
  if (isDaily(no) && dailyDate(no)) {
    const d = dailyDate(no);
    const md = `${d.getMonth() + 1}/${d.getDate()}`;
    return { no, levelIndex: -1, levelName: "今日の1問", barName: "今日", stage: md, endless: false, daily: true, weekday: WEEKDAYS[d.getDay()], label: `今日の1問（${md}）` };
  }
  if (isEndless(no)) {
    const stage = Math.max(ENDLESS_FIRST, no - ENDLESS_BASE);
    const levelName = LEVELS[ENDLESS_LEVEL].name;
    return { no: endlessNo(stage), levelIndex: ENDLESS_LEVEL, levelName, barName: levelName, stage, endless: true, daily: false, label: `${levelName} ステージ${stage}` };
  }
  const n = Math.min(Math.max(1, no), TOTAL_STAGES);
  const levelIndex = Math.floor((n - 1) / STAGES_PER_LEVEL);
  const stage = n - levelIndex * STAGES_PER_LEVEL;
  const levelName = LEVELS[levelIndex].name;
  return { no: n, levelIndex, levelName, barName: levelName, stage, endless: false, daily: false, label: `${levelName} ステージ${stage}` };
}

export const stageNo = (levelIndex, stage) => levelIndex * STAGES_PER_LEVEL + stage;

// 正しい通し番号に直す（保存された値が壊れていても遊べるように）
export const normalizeNo = (no) => (isDaily(no) && !dailyDate(no) ? 1 : stageInfo(Number.isFinite(no) ? no : 1).no);

// ‹ › で移る先。超上級 12 の次はエンドレス（超上級 13）、超上級 13 の前は超上級 12。
export function prevStage(no) {
  if (isDaily(no)) return null;
  if (isEndless(no)) return no - ENDLESS_BASE <= ENDLESS_FIRST ? LAST_REGULAR : no - 1;
  return no > 1 ? no - 1 : null;
}
export function nextStage(no) {
  if (isDaily(no)) return null;
  if (isEndless(no)) return no + 1;
  if (no === LAST_REGULAR) return endlessNo(ENDLESS_FIRST);
  return no + 1;
}

// 進み具合 progress = { unlocked: 遊べる最後の通し番号（1〜48、超上級 12 をクリアすると 49）, endless: 遊べる最後のエンドレスのステージ（13〜） }
export const endlessOpen = (progress) => progress.unlocked > LAST_REGULAR;
export function isUnlocked(no, progress) {
  if (isDaily(no)) return true;
  if (isEndless(no)) return endlessOpen(progress) && no - ENDLESS_BASE <= progress.endless;
  return no <= progress.unlocked;
}
// no をクリアしたあとの進み具合
export function afterClear(no, progress) {
  if (isDaily(no)) return progress;
  if (isEndless(no)) return { ...progress, endless: Math.max(progress.endless, no - ENDLESS_BASE + 1) };
  // unlocked は超上級 12 をクリアすると TOTAL_STAGES + 1 になり、それでエンドレスが開く
  return { ...progress, unlocked: Math.max(progress.unlocked, Math.min(no + 1, TOTAL_STAGES + 1)) };
}
// 隠し要素：全ステージを開放する（超上級 12 まで遊べて、エンドレスも開く。すでに先へ進んでいれば変えない）
export const unlockAll = (progress) => ({ ...progress, unlocked: TOTAL_STAGES + 1 });

// エンドレスで何ステージ続けてクリアしたか
export const endlessCleared = (progress) => Math.max(0, progress.endless - ENDLESS_FIRST);

// ステージごとの難しさ。colors: 色の数、cap: 棚に並べる数、empty: 空き棚の数、hidden: ？になる割合
// cap はスマホでもねこが小さくなりすぎないよう、どのステージでも 4 にそろえる（難しさは色の数と？で上げる）
// エンドレスは超上級 12 と同じ難しさ（先頭以外ぜんぶ？）で、盤面だけが毎回変わる
export function stageConfig(no) {
  if (isEndless(no)) return stageConfig(LAST_REGULAR);
  if (isDaily(no)) return { ...DAILY_CONFIG[dailyDate(no).getDay()], cap: 4, empty: 2 };
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

// ---- ★の評価 ----

// 全部の色が見えている前提での最短手数（A*）。見つからなければ null
// 下限の見積もり：棚の中の「同じ色のかたまり」は、棚の底にあって
// その色の置き場になれるもの（色ごとに 1 つ）以外は少なくとも 1 回動かす必要がある
function blocksBound(st) {
  let blocks = 0;
  const bottoms = new Set();
  for (const s of st) {
    if (!s.length) continue;
    bottoms.add(s[0]);
    blocks++;
    for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) blocks++;
  }
  return blocks - bottoms.size;
}
export function minMoves(colorShelves, cap, limit = 100000) {
  const solved = (st) => st.every((s) => s.length === 0 || (s.length === cap && s.every((c) => c === s[0])));
  const best = new Map([[keyOf(colorShelves), 0]]);
  const buckets = [[{ st: colorShelves, g: 0 }]];
  let nodes = 0;
  for (let f = 0; f < buckets.length; f++) {
    const bucket = buckets[f];
    while (bucket && bucket.length) {
      const { st, g } = bucket.pop();
      if (best.get(keyOf(st)) < g) continue;
      if (solved(st)) return g;
      if (++nodes > limit) return null;
      for (let i = 0; i < st.length; i++) {
        const src = st[i];
        if (!src.length) continue;
        const c = src[src.length - 1];
        let run = 0;
        for (let p = src.length - 1; p >= 0 && src[p] === c; p--) run++;
        let triedEmpty = false;
        for (let j = 0; j < st.length; j++) {
          if (i === j) continue;
          const dst = st[j];
          if (dst.length >= cap) continue;
          if (!dst.length) {
            if (run === src.length || triedEmpty) continue;
            triedEmpty = true;
          } else if (dst[dst.length - 1] !== c) continue;
          const n = Math.min(run, cap - dst.length);
          const next = st.slice();
          next[i] = src.slice(0, -n);
          next[j] = dst.concat(Array(n).fill(c));
          const k = keyOf(next);
          if (best.has(k) && best.get(k) <= g + 1) continue;
          best.set(k, g + 1);
          const nf = Math.max(f, g + 1 + blocksBound(next));
          (buckets[nf] ||= []).push({ st: next, g: g + 1 });
        }
      }
    }
  }
  return null;
}

// ★の目標手数。？の色は先頭に来るまでわからないので、最短手数に？の数の 1/3 だけ余裕をもたせる
export function starTargets(min, hiddenCount) {
  if (min === null) return null;
  const three = min + Math.ceil(hiddenCount / 3);
  return { min, three, two: three + Math.ceil(min * 0.3) };
}
export function starsFor(moves, targets) {
  if (!targets) return 3;
  return moves <= targets.three ? 3 : moves <= targets.two ? 2 : 1;
}
export const starText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

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
    const hiddenCount = shelves.flat().filter((c) => c.hidden).length;
    return { shelves: revealFronts(shelves), cap: cfg.cap, colors: cfg.colors, targets: starTargets(minMoves(colorShelves, cfg.cap), hiddenCount) };
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
