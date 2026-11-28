import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/jelly/levels.js";
import { dragToward, exitFor, initState, isCleared, reachable, solve } from "../src/jelly/logic.js";

test("ステージのゼリーは盤面の中にあり、重ならない", () => {
  LEVELS.forEach((lv, n) => {
    const seen = new Set();
    for (const b of lv.blocks) {
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= lv.w && b.y + b.h <= lv.h, `ステージ${n + 1}`);
      for (let dy = 0; dy < b.h; dy++)
        for (let dx = 0; dx < b.w; dx++) {
          const k = `${b.x + dx},${b.y + dy}`;
          assert.ok(!seen.has(k), `ステージ${n + 1} で ${k} が重なっている`);
          seen.add(k);
        }
    }
  });
});

test("出口は辺の中にあり、同じ辺で重ならない", () => {
  LEVELS.forEach((lv, n) => {
    for (const e of lv.exits) {
      const span = e.side === "top" || e.side === "bottom" ? lv.w : lv.h;
      assert.ok(e.at >= 0 && e.len >= 1 && e.at + e.len <= span, `ステージ${n + 1}`);
      for (const f of lv.exits)
        if (f !== e && f.side === e.side) assert.ok(e.at + e.len <= f.at || f.at + f.len <= e.at);
    }
  });
});

test("どのステージも解けて、最短手数が目標（par）と一致する", () => {
  LEVELS.forEach((lv, n) => {
    const r = solve(lv, { limit: 400000 });
    assert.ok(r, `ステージ${n + 1} が解けない`);
    assert.equal(r.moves, lv.par, `ステージ${n + 1}`);
  });
});

test("出口より大きいゼリーや、ちがう色のゼリーは出られない", () => {
  const lv = {
    w: 3,
    h: 3,
    blocks: [
      { x: 0, y: 0, w: 2, h: 1, c: 0 },
      { x: 0, y: 2, w: 1, h: 1, c: 1 },
    ],
    exits: [{ side: "top", at: 0, len: 1, c: 0 }, { side: "bottom", at: 0, len: 1, c: 0 }],
  };
  assert.equal(exitFor(lv, lv.blocks[0], 0, 0, "up"), null); // 幅 2 は幅 1 の出口を通れない
  assert.equal(exitFor(lv, lv.blocks[1], 0, 2, "down"), null); // 色がちがう
  const one = { ...lv.blocks[0], w: 1 };
  assert.ok(exitFor(lv, one, 0, 0, "up"));
  assert.equal(solve(lv), null);
});

test("横だけのゼリーは縦の出口から出られず、縦に動かない", () => {
  const lv = {
    w: 3,
    h: 3,
    blocks: [{ x: 0, y: 1, w: 2, h: 1, c: 0, axis: "h" }],
    exits: [{ side: "top", at: 0, len: 3, c: 0 }],
  };
  const st = initState(lv);
  const { positions, canExit } = reachable(lv, st, 0);
  assert.equal(canExit, false);
  assert.ok(positions.every((p) => p.y === 1));
  assert.equal(solve(lv), null);
});

test("ドラッグすると壁やほかのゼリーの手前で止まり、出口からは外へ出る", () => {
  const lv = {
    w: 4,
    h: 3,
    blocks: [
      { x: 0, y: 0, w: 1, h: 1, c: 0 },
      { x: 2, y: 0, w: 1, h: 1, c: 1 },
    ],
    exits: [{ side: "right", at: 2, len: 1, c: 0 }],
  };
  const st = initState(lv);
  assert.deepEqual(dragToward(lv, st, 0, 3, 0), { x: 1, y: 0, exit: null }); // 右のゼリーで止まる
  assert.deepEqual(dragToward(lv, st, 0, 0, 9), { x: 0, y: 2, exit: null }); // 下の壁で止まる
  assert.equal(dragToward(lv, st, 0, 5, 2).exit, "right"); // 右下の出口から出る
  assert.equal(isCleared(st), false);
});
