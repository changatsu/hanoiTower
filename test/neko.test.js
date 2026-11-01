import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMove,
  createLevel,
  frontRun,
  hasAnyMove,
  isSolvable,
  isSolved,
  levelConfig,
  movableCount,
} from "../src/neko/logic.js";

let nextId = 0;
const cat = (color, hidden = false) => ({ id: nextId++, color, hidden });
const colorsOf = (shelves) => shelves.map((s) => s.map((c) => (c.hidden ? "?" : String(c.color))).join(""));

test("先頭と同じ色の猫だけ動かせる", () => {
  const shelves = [[cat(0), cat(1)], [cat(2), cat(1)], [cat(2), cat(0)], []];
  assert.equal(movableCount(shelves, 4, 0, 1), 1); // 1 → 先頭 1
  assert.equal(movableCount(shelves, 4, 0, 2), 0); // 1 → 先頭 0 は不可
  assert.equal(movableCount(shelves, 4, 0, 3), 1); // 空き棚へは動かせる
  assert.equal(movableCount(shelves, 4, 3, 0), 0); // 空き棚からは動かせない
  assert.equal(movableCount(shelves, 4, 0, 0), 0);
});

test("満杯の棚には置けない", () => {
  const shelves = [[cat(1), cat(1), cat(2), cat(1)], [cat(1)]];
  assert.equal(movableCount(shelves, 4, 1, 0), 0);
});

test("先頭から続く同じ色はまとめて動き、入る分だけ動く", () => {
  const shelves = [[cat(0), cat(1), cat(1), cat(1)], [cat(2), cat(3), cat(1)]];
  assert.equal(frontRun(shelves[0]), 3);
  assert.equal(movableCount(shelves, 4, 0, 1), 1);
  const next = applyMove(shelves, 4, 0, 1);
  assert.deepEqual(colorsOf(next), ["011", "2311"]);
});

test("？の猫は先頭に来ると色がわかり、それまではまとめて動かない", () => {
  const shelves = [[cat(3), cat(1, true), cat(1)], []];
  assert.equal(frontRun(shelves[0]), 1); // 隠れている 1 は数えない
  const next = applyMove(shelves, 4, 0, 1);
  assert.deepEqual(colorsOf(next), ["31", "1"]);
  assert.equal(next[0][1].hidden, false);
});

test("隠れた猫が先頭の棚には置けない（先頭は常に見えている前提の保険）", () => {
  const shelves = [[cat(1)], [cat(2), cat(1, true)]];
  assert.equal(movableCount(shelves, 4, 0, 1), 0);
});

test("動かせないときは null", () => {
  assert.equal(applyMove([[cat(0)], [cat(1)]], 4, 0, 1), null);
});

test("クリア判定", () => {
  const done = [[cat(0), cat(0)], [cat(1), cat(1)], []];
  assert.equal(isSolved(done, 2), true);
  assert.equal(isSolved([[cat(0), cat(0, true)], [cat(1), cat(1)], []], 2), false);
  assert.equal(isSolved([[cat(0)], [cat(0), cat(1), cat(1)]], 3), false);
});

test("解けるかの判定", () => {
  assert.equal(isSolvable([[0, 1], [1, 0], []], 2), true);
  assert.equal(isSolvable([[0, 1], [1, 0]], 2), false);
});

test("どのレベルも解ける面が作られ、同じレベルは同じ盤面になる", () => {
  for (let level = 1; level <= 40; level++) {
    const a = createLevel(level);
    const cfg = levelConfig(level);
    assert.equal(a.shelves.length, cfg.colors + cfg.empty);
    // 各色ちょうど cap 匹
    const counts = {};
    for (const s of a.shelves) for (const c of s) counts[c.color] = (counts[c.color] || 0) + 1;
    assert.equal(Object.keys(counts).length, cfg.colors);
    for (const n of Object.values(counts)) assert.equal(n, cfg.cap);
    // 先頭の猫は必ず見えている
    for (const s of a.shelves) if (s.length) assert.equal(s[s.length - 1].hidden, false);
    assert.equal(isSolvable(a.shelves.map((s) => s.map((c) => c.color)), a.cap), true);
    assert.ok(hasAnyMove(a.shelves, a.cap));
    assert.deepEqual(createLevel(level), a);
  }
});
