// ゼリーだっしゅつのステージ作り（開発用。ゲーム本体は使わない）
//
// 空の盤面に、出口から逆向きにゼリーを「入れて」いく。入れたゼリーは中へすべらせ、ときどき
// 先に入れたゼリーもすべらせる。逆にたどれば必ず解けるので、解けない盤面はできない。
// できた盤面の手ごたえを「同時に出せるものを出していく回数（段数）」と
// 「出すだけでは詰まり、どこかをずらす必要があるか」で測り、条件に合うものを選ぶ。
//
// 使い方: node scripts/gen-jelly-levels.mjs '<JSON の設定>'
//   { w, h, colors, fill, axis, shuffle, minRounds, needSlide, seed, count }
import { initState, reachable, exitFor, solve } from "../src/jelly/logic.js";

const cfg = JSON.parse(process.argv[2]);
const { w, h, colors: k, fill = 0.85, axis = 0, shuffle = 0.3, minRounds = 2, needSlide = false, count = 1 } = cfg;
let seed = cfg.seed || 1;
// mulberry32
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SIZES = cfg.sizes || [[1,1],[1,2],[2,1],[1,2],[2,1],[2,2],[1,3],[3,1],[2,3],[3,2]];

function makeExits() {
  const exits = [];
  const used = { top: [], bottom: [], left: [], right: [] };
  for (let c = 0; c < k; c++) {
    const n = rnd() < (cfg.twoExits ?? 0.3) ? 2 : 1;
    for (let e = 0; e < n; e++) {
      for (let t = 0; t < 40; t++) {
        const side = pick(["top", "bottom", "left", "right"]);
        const span = side === "top" || side === "bottom" ? w : h;
        const len = 1 + Math.floor(rnd() * Math.min(cfg.maxExit || 3, span - 1));
        const at = Math.floor(rnd() * (span - len + 1));
        if (used[side].some(([a, l]) => at < a + l + 1 && a < at + len + 1)) continue; // 出口どうしは 1 マスあける
        used[side].push([at, len]);
        exits.push({ side, at, len, c });
        break;
      }
    }
  }
  return exits;
}

function occupied(level, state) {
  const g = new Set();
  state.forEach((p, i) => {
    if (p.out) return;
    const b = level.blocks[i];
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) g.add((p.y + dy) * w + p.x + dx);
  });
  return g;
}

function entries(level, state, b) {
  const g = occupied(level, state);
  const res = [];
  for (const e of level.exits) {
    if (e.c !== b.c) continue;
    const horiz = e.side === "top" || e.side === "bottom";
    if (b.axis === "h" && horiz) continue;
    if (b.axis === "v" && !horiz) continue;
    const size = horiz ? b.w : b.h;
    for (let s = e.at; s + size <= e.at + e.len; s++) {
      const x = horiz ? s : e.side === "left" ? 0 : w - b.w;
      const y = horiz ? (e.side === "top" ? 0 : h - b.h) : s;
      if (x < 0 || y < 0 || x + b.w > w || y + b.h > h) continue;
      let ok = true;
      for (let dy = 0; dy < b.h && ok; dy++) for (let dx = 0; dx < b.w && ok; dx++) if (g.has((y + dy) * w + x + dx)) ok = false;
      if (ok) res.push({ x, y });
    }
  }
  return res;
}

// 同時に出せるものを出していく。段数と、出し切れたかを返す
function rounds(level) {
  let state = initState(level);
  let r = 0;
  for (;;) {
    const can = state.map((p, i) => !p.out && reachable(level, state, i).canExit);
    if (!can.some(Boolean)) break;
    r++;
    state = state.map((p, i) => (can[i] ? { ...p, out: true } : p));
  }
  return { rounds: r, stuck: state.some((p) => !p.out) };
}

function build() {
  const level = { w, h, blocks: [], exits: makeExits() };
  let state = [];
  let area = 0;
  for (let fail = 0; fail < 200 && area < w * h * fill; ) {
    const [bw, bh] = pick(SIZES);
    if (bw > w || bh > h) { fail++; continue; }
    const b = { x: 0, y: 0, w: bw, h: bh, c: Math.floor(rnd() * k) };
    if (rnd() < axis && !(bw === 1 && bh === 1)) b.axis = bw > bh ? "h" : bw < bh ? "v" : pick(["h", "v"]);
    const ent = entries(level, state, b);
    if (!ent.length) { fail++; continue; }
    const at = pick(ent);
    level.blocks.push({ ...b, x: at.x, y: at.y });
    state.push({ x: at.x, y: at.y, out: false });
    const i = state.length - 1;
    // 奥へすべらせる：出口から遠い場所ほど選ばれやすく
    const { positions } = reachable(level, state, i);
    const far = positions
      .map((p) => ({ p, d: Math.abs(p.x - at.x) + Math.abs(p.y - at.y) + rnd() * 2 }))
      .sort((a, b2) => b2.d - a.d);
    const to = far[Math.floor(rnd() * Math.min(3, far.length))].p;
    state[i] = { x: to.x, y: to.y, out: false };
    area += bw * bh;
    // ときどき先に入れたゼリーもずらす
    if (rnd() < shuffle && state.length > 1) {
      const j = Math.floor(rnd() * (state.length - 1));
      const ps = reachable(level, state, j).positions;
      const q = pick(ps);
      state[j] = { x: q.x, y: q.y, out: false };
    }
  }
  level.blocks = level.blocks.map((b, i) => ({ ...b, x: state[i].x, y: state[i].y }));
  // 使われなかった色の出口は消す
  const usedColors = new Set(level.blocks.map((b) => b.c));
  level.exits = level.exits.filter((e) => usedColors.has(e.c));
  return level;
}

const out = [];
for (let t = 0; t < 3000 && out.length < count; t++) {
  const lv = build();
  if (lv.blocks.length < (cfg.minBlocks || 4)) continue;
  if (new Set(lv.blocks.map((b) => b.c)).size < k) continue;
  const m = rounds(lv);
  if (m.rounds < minRounds || m.stuck !== needSlide) continue;
  if (cfg.maxRounds && m.rounds > cfg.maxRounds) continue;
  const r = solve(lv, { limit: cfg.limit || 30000 });
  const par = r ? r.moves : undefined;
  if (cfg.minExtra && !(par - lv.blocks.length >= cfg.minExtra)) continue;
  if (cfg.maxBlocksN && lv.blocks.length > cfg.maxBlocksN) continue;
  out.push({ ...lv, par });
  console.error(`seed-try ${t}: blocks=${lv.blocks.length} rounds=${m.rounds} stuck=${m.stuck} par=${par}`);
}
for (const o of out) console.log(JSON.stringify(o));
