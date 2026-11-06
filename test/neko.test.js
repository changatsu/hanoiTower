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
  unlockAll,
  wakeFront,
  hintMove,
  taNo,
  isTimeAttack,
  ACCESSORIES,
  isAccessoryOpen,
  minMoves,
  starTargets,
  starsFor,
  starText,
  dailyNo,
  dailyDate,
  dailyStreak,
  isDaily,
  isEndless,
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
  assert.deepEqual(stageInfo(1), { no: 1, levelIndex: 0, levelName: "初級", barName: "初級", stage: 1, endless: false, daily: false, label: "初級 ステージ1" });
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

test("エンドレスは超上級 13 から数え、難しさは超上級 12 と同じで盤面は毎回変わる", () => {
  assert.equal(stageInfo(1013).label, "超上級 ステージ13");
  assert.equal(stageInfo(1013).endless, true);
  assert.equal(stageInfo(1100).stage, 100);
  assert.deepEqual(stageConfig(1013), stageConfig(48));
  assert.deepEqual(stageConfig(1200), stageConfig(48));
  assert.notDeepEqual(colorsOf(createStage(1013).shelves), colorsOf(createStage(1014).shelves));
  assert.equal(normalizeNo(1005), 1013);
  assert.equal(normalizeNo(99), 48);
  assert.equal(normalizeNo(NaN), 1);
});

test("‹ › の移動：上級 12 の次は超上級 1、超上級 12 の次はエンドレス", () => {
  assert.equal(prevStage(1), null);
  assert.equal(nextStage(12), 13);
  assert.equal(nextStage(36), 37);
  assert.equal(prevStage(37), 36);
  assert.equal(nextStage(48), 1013);
  assert.equal(prevStage(1013), 48);
  assert.equal(nextStage(1013), 1014);
  assert.equal(prevStage(1014), 1013);
});

test("超上級 12 をクリアするとエンドレスが開き、エンドレスは何回クリアしたかを数える", () => {
  let p = { unlocked: 36, endless: 13 };
  assert.equal(isUnlocked(37, p), false);
  p = afterClear(36, p);
  assert.equal(isUnlocked(37, p), true); // 上級 12 のあとは超上級
  assert.equal(endlessOpen(p), false);
  assert.equal(isUnlocked(1013, p), false);
  p = { unlocked: 48, endless: 13 };
  assert.equal(endlessOpen(p), false);
  p = afterClear(48, p);
  assert.equal(endlessOpen(p), true);
  assert.equal(isUnlocked(48, p), true);
  assert.equal(isUnlocked(1013, p), true);
  assert.equal(isUnlocked(1014, p), false);
  assert.equal(endlessCleared(p), 0);
  p = afterClear(1013, p);
  p = afterClear(1014, p);
  assert.equal(isUnlocked(1015, p), true);
  assert.equal(endlessCleared(p), 2);
  p = afterClear(1013, p); // 前のステージをやり直しても減らない
  assert.equal(endlessCleared(p), 2);
  assert.equal(afterClear(48, p).unlocked, p.unlocked);
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

test("隠し要素：超上級 12 まで全ステージとエンドレスが開く", () => {
  const p = unlockAll({ unlocked: 3, endless: 13 });
  assert.equal(endlessOpen(p), true);
  for (let no = 1; no <= TOTAL_STAGES; no++) assert.equal(isUnlocked(no, p), true);
  assert.equal(isUnlocked(1013, p), true);
  assert.equal(isUnlocked(1014, p), false); // エンドレスは順番に進む
  assert.deepEqual(unlockAll({ unlocked: 49, endless: 20 }), { unlocked: 49, endless: 20 }); // すでに進んでいれば変えない
});

test("最短手数：全部見えていれば何手で解けるか", () => {
  assert.equal(minMoves([[0, 1], [1, 0], []], 2), 3);
  assert.equal(minMoves([[0, 0], [1, 1], []], 2), 0);
  assert.equal(minMoves([[0, 1], [1, 0]], 2), null);
  // どのステージも最短手数が求まり、★の目標はその手数以上
  for (const no of [1, 12, 24, 36, 48, 1013, 1100]) {
    const { targets } = createStage(no);
    assert.ok(targets && targets.min > 0, `stage ${no}`);
    assert.ok(targets.min <= targets.three && targets.three < targets.two);
  }
});

test("★は手数で 3 段階", () => {
  const t = starTargets(20, 6); // 最短 20 手、？が 6 匹
  assert.deepEqual(t, { min: 20, three: 22, two: 28 });
  assert.equal(starsFor(22, t), 3);
  assert.equal(starsFor(23, t), 2);
  assert.equal(starsFor(28, t), 2);
  assert.equal(starsFor(29, t), 1);
  assert.equal(starsFor(99, null), 3); // 目標が出せない面は★3
  assert.equal(starText(2), "★★☆");
});

test("今日の1問：日付で決まり、曜日で難しさが変わり、いつでも遊べる", () => {
  const no = dailyNo(new Date(2026, 10, 6)); // 2026/11/6（金）
  assert.equal(no, 20261106);
  assert.equal(isDaily(no), true);
  assert.equal(isEndless(no), false);
  assert.equal(dailyDate(20261131), null);
  const info = stageInfo(no);
  assert.equal(info.label, "今日の1問（11/6）");
  assert.equal(info.weekday, "金");
  assert.equal(stageConfig(20261102).colors, 5); // 月曜はやさしい
  assert.equal(stageConfig(20261108).colors, 9); // 日曜はいちばん難しい
  assert.equal(isUnlocked(no, { unlocked: 1, endless: 13 }), true);
  assert.deepEqual(afterClear(no, { unlocked: 1, endless: 13 }), { unlocked: 1, endless: 13 });
  assert.equal(prevStage(no), null);
  assert.equal(nextStage(no), null);
  assert.equal(normalizeNo(20261131), 1);
  const a = createStage(no);
  assert.deepEqual(createStage(no), a);
  assert.equal(isSolvable(a.shelves.map((s) => s.map((c) => c.color)), a.cap), true);
  assert.notDeepEqual(colorsOf(createStage(20261107).shelves), colorsOf(a.shelves));
});

test("今日の1問の連続日数", () => {
  const cleared = new Set([20261104, 20261105, 20261106]);
  const has = (d) => cleared.has(d);
  assert.equal(dailyStreak(has, new Date(2026, 10, 6)), 3);
  assert.equal(dailyStreak(has, new Date(2026, 10, 7)), 3); // 今日まだなら昨日まで数える
  assert.equal(dailyStreak(has, new Date(2026, 10, 8)), 0);
  // 月をまたいでも続く
  assert.equal(dailyStreak((d) => [20261031, 20261101].includes(d), new Date(2026, 10, 1)), 2);
});

test("ねぼすけねこ：先頭で眠っていると動かせず、起こすと動かせる", () => {
  const shelves = [[cat(0), { ...cat(1), sleep: true }], [cat(1)], []];
  assert.equal(frontRun(shelves[0]), 0);
  assert.equal(movableCount(shelves, 4, 0, 1), 0);
  assert.equal(movableCount(shelves, 4, 1, 0), 1); // 眠っているねこの上には置ける
  assert.equal(hasAnyMove([[{ ...cat(1), sleep: true }], [cat(2)]], 4), true); // 起こせば動ける
  const woke = wakeFront(shelves, 0);
  assert.equal(woke[0][1].sleep, false);
  assert.equal(movableCount(woke, 4, 0, 1), 1);
  assert.equal(wakeFront(woke, 0), null);
});

test("どっしりねこ：1 匹ずつしか動かない", () => {
  const heavyFront = [[cat(1), cat(1), { ...cat(1), heavy: true }], []];
  assert.equal(frontRun(heavyFront[0]), 1);
  const heavyBehind = [[cat(0), { ...cat(1), heavy: true }, cat(1), cat(1)], []];
  assert.equal(frontRun(heavyBehind[0]), 2); // どっしりねこの手前で止まる
});

test("特別なねこは中級 7 から出てきて、★の目標にその分の余裕が入る", () => {
  assert.deepEqual([stageConfig(18).sleepy, stageConfig(18).heavy], [0, 0]); // 中級 6
  assert.deepEqual([stageConfig(19).sleepy, stageConfig(19).heavy], [1, 0]); // 中級 7
  assert.deepEqual([stageConfig(31).sleepy, stageConfig(31).heavy], [2, 1]); // 上級 7
  assert.deepEqual([stageConfig(48).sleepy, stageConfig(48).heavy], [2, 2]);
  const a = createStage(48);
  const flat = a.shelves.flat();
  assert.equal(flat.filter((c) => c.sleep).length, 2);
  assert.equal(flat.filter((c) => c.heavy).length, 2);
  assert.equal(stageConfig(1).sleepy, 0);
  assert.equal(createStage(1).shelves.flat().some((c) => c.sleep || c.heavy), false);
});

test("ヒントは解ける 1 手を返し、それに従えば解ける", () => {
  for (const no of [5, 19, 31, 48]) {
    let { shelves, cap } = createStage(no);
    for (let step = 0; step < 200 && !isSolved(shelves, cap); step++) {
      const h = hintMove(shelves, cap);
      assert.ok(h && !h.stuck, `stage ${no} step ${step}`);
      shelves = h.wake !== undefined ? wakeFront(shelves, h.wake) : applyMove(shelves, cap, h.from, h.to);
      assert.ok(shelves);
    }
    assert.equal(isSolved(shelves, cap), true, `stage ${no}`);
    assert.equal(hintMove(shelves, cap), null);
  }
  // 解けない盤面
  assert.deepEqual(hintMove([[cat(0), cat(1)], [cat(1), cat(0)]], 2), { stuck: true });
});

test("タイムアタック：問題ごとに少しずつ難しくなり、記録や進み具合には影響しない", () => {
  const a = taNo(1234, 0);
  const b = taNo(1234, 5);
  assert.equal(isTimeAttack(a), true);
  assert.equal(stageInfo(b).label, "タイムアタック 6問目");
  assert.ok(stageConfig(b).colors > stageConfig(a).colors);
  assert.equal(stageConfig(taNo(1, 40)).colors, 9);
  assert.equal(prevStage(a), null);
  assert.equal(nextStage(a), null);
  assert.equal(normalizeNo(a), 1);
  assert.deepEqual(afterClear(a, { unlocked: 2, endless: 13 }), { unlocked: 2, endless: 13 });
  assert.equal(isSolvable(createStage(b).shelves.map((s) => s.map((c) => c.color)), 4), true);
  assert.notDeepEqual(colorsOf(createStage(taNo(1, 0)).shelves), colorsOf(createStage(taNo(2, 0)).shelves));
});

test("きせかえは★・連続日数・タイムアタックの記録で手に入る", () => {
  const byId = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a]));
  const none = { stars: 0, streak: 0, ta: 0 };
  assert.equal(ACCESSORIES.some((a) => isAccessoryOpen(a, none)), false);
  assert.equal(isAccessoryOpen(byId.ribbon, { ...none, stars: 10 }), true);
  assert.equal(isAccessoryOpen(byId.scarf, { ...none, streak: 3 }), true);
  assert.equal(isAccessoryOpen(byId.star, { ...none, ta: 5 }), true);
  assert.equal(isAccessoryOpen(byId.crown, { ...none, stars: 143 }), false);
  assert.equal(isAccessoryOpen(byId.crown, { ...none, stars: 144 }), true);
});
