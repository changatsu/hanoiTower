import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMove,
  createStage,
  frontRun,
  hasAnyMove,
  isSolvable,
  isSolved,
  stageConfig,
  stageInfo,
  TOTAL_STAGES,
  prevStage,
  nextStage,
  isUnlocked,
  afterClear,
  endlessOpen,
  endlessCleared,
  normalizeNo,
  skipToEndless,
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

test("初級・中級・上級・超上級が 12 ステージずつで、難しさは後ろほど上がる", () => {
  assert.equal(TOTAL_STAGES, 48);
  assert.deepEqual(stageInfo(1), { no: 1, levelIndex: 0, levelName: "初級", stage: 1, endless: false, label: "初級 ステージ1" });
  assert.equal(stageInfo(12).label, "初級 ステージ12");
  assert.equal(stageInfo(13).label, "中級 ステージ1");
  assert.equal(stageInfo(36).label, "上級 ステージ12");
  assert.equal(stageConfig(1).hidden, 0);
  for (let no = 2; no <= TOTAL_STAGES; no++) {
    assert.ok(stageConfig(no).colors >= stageConfig(no - 1).colors);
    assert.ok(stageConfig(no).hidden >= stageConfig(no - 1).hidden);
  }
  assert.equal(stageConfig(36).colors, 9);
  assert.equal(stageInfo(37).label, "超上級 ステージ1");
  assert.equal(stageInfo(48).label, "超上級 ステージ12");
  assert.equal(stageConfig(48).hidden, 1); // 超上級 12 は先頭以外ぜんぶ？
  assert.equal(stageConfig(48).empty, 2);
});

test("エンドレスは上級 13 から数え、難しさは上級 12 と同じで盤面は毎回変わる", () => {
  assert.equal(stageInfo(1013).label, "上級 ステージ13");
  assert.equal(stageInfo(1013).endless, true);
  assert.equal(stageInfo(1100).stage, 100);
  assert.deepEqual(stageConfig(1013), stageConfig(36));
  assert.deepEqual(stageConfig(1200), stageConfig(36));
  assert.notDeepEqual(colorsOf(createStage(1013).shelves), colorsOf(createStage(1014).shelves));
  assert.equal(normalizeNo(1005), 1013);
  assert.equal(normalizeNo(99), 48);
  assert.equal(normalizeNo(NaN), 1);
});

test("‹ › の移動：上級 12 の次はエンドレス、超上級 1 の前は上級 12", () => {
  assert.equal(prevStage(1), null);
  assert.equal(nextStage(12), 13);
  assert.equal(nextStage(36), 1013);
  assert.equal(prevStage(1013), 36);
  assert.equal(nextStage(1013), 1014);
  assert.equal(prevStage(1014), 1013);
  assert.equal(prevStage(37), 36);
  assert.equal(nextStage(37), 38);
  assert.equal(nextStage(48), null);
});

test("上級 12 をクリアするとエンドレスと超上級が開き、エンドレスは何回クリアしたかを数える", () => {
  let p = { unlocked: 36, endless: 13 };
  assert.equal(endlessOpen(p), false);
  assert.equal(isUnlocked(37, p), false);
  assert.equal(isUnlocked(1013, p), false);
  p = afterClear(36, p);
  assert.equal(endlessOpen(p), true);
  assert.equal(isUnlocked(37, p), true);
  assert.equal(isUnlocked(38, p), false);
  assert.equal(isUnlocked(1013, p), true);
  assert.equal(isUnlocked(1014, p), false);
  assert.equal(endlessCleared(p), 0);
  p = afterClear(1013, p);
  p = afterClear(1014, p);
  assert.equal(isUnlocked(1015, p), true);
  assert.equal(endlessCleared(p), 2);
  p = afterClear(1013, p); // 前のステージをやり直しても減らない
  assert.equal(endlessCleared(p), 2);
  assert.equal(afterClear(48, p).unlocked, 48);
});

test("どのステージも解ける面が作られ、同じステージは同じ盤面になる", () => {
  for (const level of [...Array(TOTAL_STAGES).keys()].map((i) => i + 1).concat([1013, 1014, 1050, 1200])) {
    const a = createStage(level);
    const cfg = stageConfig(level);
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
    assert.deepEqual(createStage(level), a);
  }
});

test("盤面は画面の幅と高さの両方に収まる大きさになる", async () => {
  const { fitCatWidth } = await import("../src/neko/layout.js");
  // 横長の画面では高さで決まり、縦長の画面では幅で決まる
  const wide = fitCatWidth({ width: 1000, height: 300, aisle: 80, rows: 6, cap: 4 });
  const tall = fitCatWidth({ width: 360, height: 2000, aisle: 29, rows: 6, cap: 4 });
  assert.ok(6 * (wide * (98 / 84) + 20) + 5 * 6 + 14 <= 300);
  assert.ok(2 * (tall * 4 + 8) + 29 <= 360);
  // 段が増えても画面に収まる
  for (let rows = 3; rows <= 6; rows++) {
    const w = fitCatWidth({ width: 390, height: 640, aisle: 31, rows, cap: 4 });
    assert.ok(rows * (w * (98 / 84) + 20) + (rows - 1) * 6 + 14 <= 640);
  }
});

test("隠し要素：上級 12 までクリアしたことにすると、エンドレスと超上級が開く", () => {
  const p = skipToEndless({ unlocked: 3, endless: 13 });
  assert.equal(endlessOpen(p), true);
  assert.equal(isUnlocked(36, p), true);
  assert.equal(isUnlocked(37, p), true);
  assert.equal(isUnlocked(1013, p), true);
  // すでに先へ進んでいれば減らさない
  assert.deepEqual(skipToEndless({ unlocked: 45, endless: 20 }), { unlocked: 45, endless: 20 });
});
