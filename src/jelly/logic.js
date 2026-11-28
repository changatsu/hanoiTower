// ゼリーだっしゅつ：盤面のルールと解答探索
//
// 盤面は w × h マス。ゼリー（ブロック）は長方形で、上下左右に 1 マスずつすべって動く。
// 壁には色つきの「出口」があり、同じ色のゼリーが出口の幅に収まるとき、そこから外へ出られる。
// 全部のゼリーを外へ出すとクリア。
//
// level = {
//   w, h,
//   blocks: [{ x, y, w, h, c, axis? }]   // axis: "h" は横だけ、"v" は縦だけ動ける
//   exits:  [{ side, at, len, c }]       // side: "top" | "bottom" | "left" | "right"
// }                                      // at: 上下の辺なら列、左右の辺なら行（出口の始まり）

export const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const SIDE_OF_DIR = { up: "top", down: "bottom", left: "left", right: "right" };

export function initState(level) {
  return level.blocks.map((b) => ({ x: b.x, y: b.y, out: false }));
}

// 占有マップ：各マスにいるブロックの番号（いなければ -1）
export function occupancy(level, state, skip = -1) {
  const grid = new Int16Array(level.w * level.h).fill(-1);
  state.forEach((p, i) => {
    if (p.out || i === skip) return;
    const b = level.blocks[i];
    for (let dy = 0; dy < b.h; dy++)
      for (let dx = 0; dx < b.w; dx++) grid[(p.y + dy) * level.w + p.x + dx] = i;
  });
  return grid;
}

function fits(level, grid, b, x, y) {
  if (x < 0 || y < 0 || x + b.w > level.w || y + b.h > level.h) return false;
  for (let dy = 0; dy < b.h; dy++)
    for (let dx = 0; dx < b.w; dx++) if (grid[(y + dy) * level.w + x + dx] !== -1) return false;
  return true;
}

function axisAllows(b, dir) {
  if (b.axis === "h") return dir === "left" || dir === "right";
  if (b.axis === "v") return dir === "up" || dir === "down";
  return true;
}

// (x, y) にいるブロック b が dir の方向へ壁を抜けて外へ出られる出口（なければ null）
export function exitFor(level, b, x, y, dir) {
  if (!axisAllows(b, dir)) return null;
  const side = SIDE_OF_DIR[dir];
  if (side === "top" && y !== 0) return null;
  if (side === "bottom" && y + b.h !== level.h) return null;
  if (side === "left" && x !== 0) return null;
  if (side === "right" && x + b.w !== level.w) return null;
  const horizontalWall = side === "top" || side === "bottom";
  const start = horizontalWall ? x : y;
  const size = horizontalWall ? b.w : b.h;
  return (
    level.exits.find(
      (e) => e.side === side && e.c === b.c && e.at <= start && start + size <= e.at + e.len
    ) || null
  );
}

// 1 マス動かせるか（grid は動かすブロック自身を除いた占有マップ）
export function canStep(level, grid, i, x, y, dir) {
  const b = level.blocks[i];
  if (!axisAllows(b, dir)) return false;
  const [dx, dy] = DIRS[dir];
  return fits(level, grid, b, x + dx, y + dy);
}

// ブロック i が今の位置から行ける場所（キー "x,y"）と、そこから出られるかどうか
export function reachable(level, state, i) {
  const b = level.blocks[i];
  const grid = occupancy(level, state, i);
  const start = state[i];
  const seen = new Map([[`${start.x},${start.y}`, { x: start.x, y: start.y }]]);
  const queue = [[start.x, start.y]];
  let canExit = false;
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const dir of Object.keys(DIRS)) {
      if (!canExit && exitFor(level, b, x, y, dir)) canExit = true;
      if (!canStep(level, grid, i, x, y, dir)) continue;
      const [dx, dy] = DIRS[dir];
      const k = `${x + dx},${y + dy}`;
      if (seen.has(k)) continue;
      seen.set(k, { x: x + dx, y: y + dy });
      queue.push([x + dx, y + dy]);
    }
  }
  return { positions: [...seen.values()], canExit };
}

export function isCleared(state) {
  return state.every((p) => p.out);
}

// ---- 最短手数の探索（ステージ作りとテスト用） ----
// 1 手 = ブロック 1 つを 1 回ドラッグ（行ける所へすべらせる／そのまま外へ出す）。
// 出られるブロックはすぐ出しても損にならないので、出せるものは先に全部出してから次の手を考える。
// すると最短手数 = すべらせる手の最少回数 + ブロックの数 になる。
function prepare(level) {
  const W = level.w;
  const H = level.h;
  const n = level.blocks.length;
  // exitable[i][セル] : ブロック i がそのセル（左上）にいれば外へ出られる
  const exitable = level.blocks.map((b) => {
    const a = new Uint8Array(W * H);
    for (let y = 0; y + b.h <= H; y++)
      for (let x = 0; x + b.w <= W; x++)
        for (const dir of Object.keys(DIRS)) if (exitFor(level, b, x, y, dir)) a[y * W + x] = 1;
    return a;
  });
  const steps = level.blocks.map((b) =>
    Object.keys(DIRS)
      .filter((d) => axisAllows(b, d))
      .map((d) => DIRS[d])
  );
  return { W, H, n, exitable, steps };
}

function buildGrid(level, P, pos) {
  const g = new Int16Array(P.W * P.H).fill(-1);
  for (let i = 0; i < P.n; i++) {
    if (pos[i] < 0) continue;
    const b = level.blocks[i];
    const x0 = pos[i] % P.W;
    const y0 = (pos[i] / P.W) | 0;
    for (let dy = 0; dy < b.h; dy++)
      for (let dx = 0; dx < b.w; dx++) g[(y0 + dy) * P.W + x0 + dx] = i;
  }
  return g;
}

function free(level, P, g, i, x, y) {
  const b = level.blocks[i];
  if (x < 0 || y < 0 || x + b.w > P.W || y + b.h > P.H) return false;
  for (let dy = 0; dy < b.h; dy++)
    for (let dx = 0; dx < b.w; dx++) {
      const v = g[(y + dy) * P.W + x + dx];
      if (v !== -1 && v !== i) return false;
    }
  return true;
}

// ブロック i の行き先（セル番号の配列、先頭は今の位置）と、出られるか
function reach(level, P, g, pos, i) {
  const seen = new Uint8Array(P.W * P.H);
  const list = [pos[i]];
  seen[pos[i]] = 1;
  let canExit = false;
  for (let q = 0; q < list.length; q++) {
    const c = list[q];
    if (P.exitable[i][c]) canExit = true;
    const x = c % P.W;
    const y = (c / P.W) | 0;
    for (const [dx, dy] of P.steps[i]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= P.W || ny >= P.H) continue;
      const nc = ny * P.W + nx;
      if (seen[nc] || !free(level, P, g, i, nx, ny)) continue;
      seen[nc] = 1;
      list.push(nc);
    }
  }
  return { list, canExit };
}

function clearExits(level, P, pos) {
  for (let changed = true; changed; ) {
    changed = false;
    const g = buildGrid(level, P, pos);
    for (let i = 0; i < P.n; i++) {
      if (pos[i] >= 0 && reach(level, P, g, pos, i).canExit) {
        pos[i] = -1;
        changed = true;
        break;
      }
    }
  }
  return pos;
}

const keyOfPos = (pos) => String.fromCharCode(...pos.map((v) => v + 1));

// 最短手数を返す（{ moves, slides }）。解けなければ null、探索がしきい値を超えたら undefined
export function solve(level, { limit = 300000, from } = {}) {
  const P = prepare(level);
  const st = from || initState(level);
  const remaining = st.filter((p) => !p.out).length;
  const start = clearExits(
    level,
    P,
    st.map((p) => (p.out ? -1 : p.y * P.W + p.x))
  );
  if (start.every((v) => v < 0)) return { moves: remaining, slides: 0 };
  const seen = new Set([keyOfPos(start)]);
  let frontier = [start];
  let slides = 0;
  while (frontier.length) {
    slides++;
    const next = [];
    for (const pos of frontier) {
      const g = buildGrid(level, P, pos);
      for (let i = 0; i < P.n; i++) {
        if (pos[i] < 0) continue;
        const { list } = reach(level, P, g, pos, i);
        for (let k = 1; k < list.length; k++) {
          const np = pos.slice();
          np[i] = list[k];
          clearExits(level, P, np);
          if (np.every((v) => v < 0)) return { moves: slides + remaining, slides };
          const key = keyOfPos(np);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(np);
        }
      }
      if (seen.size > limit) return undefined;
    }
    frontier = next;
  }
  return null;
}

// 指の位置（マス単位）に向かって、ブロックを 1 マスずつ動かせるだけ動かす。
// 動いた先と、外へ出たかどうかを返す。
export function dragToward(level, state, i, tx, ty) {
  const b = level.blocks[i];
  const grid = occupancy(level, state, i);
  let { x, y } = state[i];
  for (let guard = 0; guard < 64; guard++) {
    const ddx = tx - x;
    const ddy = ty - y;
    const order = [];
    const hx = ddx > 0.5 ? "right" : ddx < -0.5 ? "left" : null;
    const hy = ddy > 0.5 ? "down" : ddy < -0.5 ? "up" : null;
    if (Math.abs(ddx) >= Math.abs(ddy)) {
      if (hx) order.push(hx);
      if (hy) order.push(hy);
    } else {
      if (hy) order.push(hy);
      if (hx) order.push(hx);
    }
    let moved = false;
    for (const dir of order) {
      if (exitFor(level, b, x, y, dir)) return { x, y, exit: dir };
      if (canStep(level, grid, i, x, y, dir)) {
        x += DIRS[dir][0];
        y += DIRS[dir][1];
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  return { x, y, exit: null };
}

// 手早く解ける手順を探す（最短とは限らない）。残りのブロックが少ない局面を優先して調べる。
// 見つかれば { moves, slides }、解けなければ null、しきい値を超えたら undefined
export function solveQuick(level, { limit = 200000 } = {}) {
  const P = prepare(level);
  const st = initState(level);
  const start = clearExits(
    level,
    P,
    st.map((p) => (p.out ? -1 : p.y * P.W + p.x))
  );
  const n = st.length;
  const left = (pos) => pos.reduce((a, v) => a + (v >= 0 ? 1 : 0), 0);
  if (left(start) === 0) return { moves: n, slides: 0 };
  // バケツ：残り数ごとの待ち行列（残りの少ない順に、同じ残り数なら手数の少ない順に取り出す）
  const buckets = Array.from({ length: n + 1 }, () => []);
  const heads = new Array(n + 1).fill(0);
  buckets[left(start)].push([start, 0]);
  const seen = new Set([keyOfPos(start)]);
  for (;;) {
    const bi = buckets.findIndex((q, j) => heads[j] < q.length);
    if (bi < 0) return null;
    const [pos, s] = buckets[bi][heads[bi]++];
    const g = buildGrid(level, P, pos);
    for (let i = 0; i < n; i++) {
      if (pos[i] < 0) continue;
      const { list } = reach(level, P, g, pos, i);
      for (let k = 1; k < list.length; k++) {
        const np = pos.slice();
        np[i] = list[k];
        clearExits(level, P, np);
        const l = left(np);
        if (l === 0) return { moves: s + 1 + n, slides: s + 1 };
        const key = keyOfPos(np);
        if (seen.has(key)) continue;
        seen.add(key);
        buckets[l].push([np, s + 1]);
      }
    }
    if (seen.size > limit) return undefined;
  }
}
