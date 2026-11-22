import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../src/gakushoku/kitchen.js";
import * as C from "../src/gakushoku/counter.js";

const fixed = () => 0; // いつも先頭の候補を選ぶ乱数

// 注文票が届くまで時間を進める
function untilTicket(s) {
  while (!s.tickets.length) s = K.kitchenTick(s, 100, fixed);
  return s;
}
// 調理中なら終わるまで進める
function finishHeat(s) {
  while (s.boards[s.sel].busy) s = K.kitchenTick(s, 100, fixed);
  return s;
}
function cook(s, dish) {
  for (const st of K.RECIPES[dish].steps) {
    for (const g of st.ings) s = K.addIngredient(s, g);
    s = K.applyProc(s, st.proc);
    s = finishHeat(s);
  }
  return s;
}

test("キッチン：レシピどおりに作ると提供できて点が入る", () => {
  let s = untilTicket(K.newKitchen("easy"));
  const tk = s.tickets[0];
  assert.equal(tk.dish, "curry");
  s = K.takeTicket(s, tk.id);
  assert.equal(s.boards[0].ticket, tk.id);
  s = cook(s, "curry");
  assert.equal(s.served, 1);
  assert.equal(s.tickets.length, 0);
  assert.equal(s.boards[0].ticket, null);
  assert.ok(s.score > K.RECIPES.curry.pts);
  assert.equal(s.misses, 0);
});

test("キッチン：ちがう食材や順番ちがいはミスで減点", () => {
  let s = untilTicket(K.newKitchen("easy"));
  s = K.takeTicket(s, s.tickets[0].id);
  s = K.addIngredient(s, "rice"); // カレーの最初は野菜を切る
  assert.equal(s.misses, 1);
  s = K.applyProc(s, "cut"); // まだ野菜を入れていない
  assert.equal(s.misses, 2);
  s = K.addIngredient(s, "carrot");
  s = K.addIngredient(s, "potato");
  s = K.addIngredient(s, "onion");
  s = K.applyProc(s, "boil"); // 切る番
  assert.equal(s.misses, 3);
  s = K.applyProc(s, "cut");
  assert.equal(s.boards[0].step, 1);
  assert.equal(s.score, -3 * K.PENALTY.miss);
});

test("キッチン：火にかけた後に放っておくと焦げて最初から", () => {
  let s = untilTicket(K.newKitchen("easy"));
  s = K.takeTicket(s, s.tickets[0].id);
  for (const g of ["carrot", "potato", "onion"]) s = K.addIngredient(s, g);
  s = K.applyProc(s, "cut");
  s = K.addIngredient(s, "pork");
  s = K.applyProc(s, "fry");
  assert.ok(s.boards[0].busy);
  s = finishHeat(s);
  assert.equal(s.boards[0].step, 2);
  for (let i = 0; i < K.BURN_AFTER / 100; i++) s = K.kitchenTick(s, 100, fixed);
  assert.equal(s.burnt, 1);
  assert.equal(s.boards[0].step, 0);
});

test("キッチン：締め切りを過ぎると票が消えて減点", () => {
  let s = untilTicket(K.newKitchen("easy"));
  s = K.takeTicket(s, s.tickets[0].id);
  const limit = s.tickets[0].limit;
  s = K.kitchenTick(s, limit, fixed);
  assert.equal(s.late, 1);
  assert.equal(s.boards[0].ticket, null);
  assert.equal(s.score, -K.PENALTY.late);
});

test("キッチン：2 つのコンロで同時に作れる", () => {
  let s = K.newKitchen("easy");
  while (s.tickets.length < 2) s = K.kitchenTick(s, 100, fixed);
  s = K.takeTicket(s, s.tickets[0].id);
  s = K.takeTicket(s, s.tickets[1].id); // コンロ1 がふさがっているのでコンロ2 へ
  assert.equal(s.boards[1].ticket, s.tickets[1].id);
  assert.equal(s.sel, 1);
});

test("キッチン：2 分で営業終了", () => {
  let s = K.newKitchen("hard");
  for (let t = 0; t < K.KITCHEN_DURATION; t += 250) s = K.kitchenTick(s, 250, Math.random);
  assert.equal(s.over, true);
});

test("キッチン：どのレシピも使う食材と調理がボタンにある", () => {
  for (const lv of Object.keys(K.KITCHEN_LEVELS)) {
    const p = K.kitchenPalette(lv);
    for (const id of K.KITCHEN_LEVELS[lv].menu) {
      const steps = K.RECIPES[id].steps;
      assert.equal(steps[steps.length - 1].proc, "plate", `${id} の最後は盛る`);
      for (const st of steps) {
        st.ings.forEach((g) => assert.ok(p.ings.includes(g), `${lv}:${g}`));
        assert.ok(p.procs.includes(st.proc));
      }
    }
  }
});

// ---------- カウンター ----------

function untilStudent(s) {
  while (!s.queue.length) s = C.counterTick(s, 100, fixed);
  return s;
}
function fillTray(s, order) {
  for (const k of C.SLOT_ORDER) if (order[k]) s = C.placeItem(s, order[k]);
  return s;
}

test("カウンター：注文どおりに並べると提供できる", () => {
  let s = untilStudent(C.newCounter("easy"));
  const order = s.queue[0].order;
  s = fillTray(s, order);
  assert.deepEqual(C.trayDiff(s.tray, order), []);
  s = C.serve(s);
  assert.equal(s.served, 1);
  assert.equal(s.queue.length, 0);
  assert.ok(s.score > 0);
  assert.equal(s.tray.main, null);
});

test("カウンター：ちがう品やいらない品があると提供できない", () => {
  let s = untilStudent(C.newCounter("easy"));
  s.queue[0].order = { main: "karaage", rice: "rice", soup: "miso", side: null, drink: "tea" };
  s = fillTray(s, s.queue[0].order);
  s = C.placeItem(s, "salad"); // 頼まれていないサラダ
  s = C.serve(s);
  assert.equal(s.wrong, 1);
  assert.equal(s.queue.length, 1);
  assert.equal(s.score, -C.PENALTY.wrong);
  s = C.removeSlot(s, "side");
  s = C.serve(s);
  assert.equal(s.served, 1);
});

test("カウンター：トレーに置くと在庫が減り、下げると戻る。大盛りはごはん 2 杯分", () => {
  let s = C.newCounter("easy");
  const rice0 = s.stock.rice;
  s = C.placeItem(s, "rice");
  assert.equal(s.stock.rice, rice0 - 1);
  s = C.placeItem(s, "riceL"); // 並を大盛りに置きかえ
  assert.equal(s.tray.rice, "riceL");
  assert.equal(s.stock.rice, rice0 - 2);
  s = C.removeSlot(s, "rice");
  assert.equal(s.stock.rice, rice0);
  s = C.placeItem(s, "salad");
  s = C.placeItem(s, "salad"); // 同じ品をもう一度タップで下げる
  assert.equal(s.tray.side, null);
  assert.equal(s.stock.salad, C.INITIAL.default);
});

test("カウンター：在庫がないと置けず、キッチンに依頼すると補充される", () => {
  let s = C.newCounter("easy");
  s.stock.karaage = 0;
  s = C.placeItem(s, "karaage");
  assert.equal(s.tray.main, null);
  assert.ok(C.isLow(s, "karaage"));
  s = C.requestStock(s, "karaage");
  assert.equal(s.requests.length, 1);
  s = C.requestStock(s, "karaage"); // 同じ品は重ねて頼めない
  assert.equal(s.requests.length, 1);
  s = C.requestStock(s, "tea");
  s = C.requestStock(s, "water"); // 同時に頼めるのは 2 つまで
  assert.equal(s.requests.length, C.MAX_REQUESTS);
  s = C.counterTick(s, C.COUNTER_LEVELS.easy.restock, fixed);
  assert.equal(s.stock.karaage, C.RESTOCK.default);
  assert.equal(s.requests.length, 0);
});

test("カウンター：待ちきれない学生は帰って減点", () => {
  let s = untilStudent(C.newCounter("easy"));
  s = C.counterTick(s, C.COUNTER_LEVELS.easy.patience, fixed);
  assert.equal(s.left, 1);
  assert.ok(s.score <= -C.PENALTY.leave);
});

test("カウンター：注文はそのレベルの品だけ、主菜と汁物は必ずある", () => {
  for (const lv of Object.keys(C.COUNTER_LEVELS)) {
    const items = new Set(C.counterItems(lv));
    for (let i = 0; i < 200; i++) {
      const o = C.makeOrder(lv);
      assert.ok(o.main && o.soup);
      for (const k of C.SLOT_ORDER) {
        if (o[k]) {
          assert.ok(items.has(o[k]), `${lv}:${o[k]}`);
          assert.equal(C.ITEMS[o[k]].slot, k);
        }
      }
    }
  }
});
