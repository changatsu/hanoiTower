// カウンターモードのルール（画面とは切り離した純粋な関数）。
// 学生が定食を注文する。注文票どおりの品をカウンターの在庫からトレーに並べて提供する。
// 品は数に限りがあり、少なくなったらキッチンに依頼すると、しばらくして補充される。

// トレーの置き場所（和食の並べ方：ごはんは左手前、汁物は右手前、主菜は奥）
export const SLOTS = {
  side: { name: "小鉢・サラダ" },
  main: { name: "主菜" },
  drink: { name: "飲み物" },
  rice: { name: "ごはん" },
  soup: { name: "汁物" },
};
export const SLOT_ORDER = ["main", "rice", "soup", "side", "drink"]; // 注文票の並び
export const TRAY_GRID = [
  ["side", "main", "drink"],
  ["rice", null, "soup"],
];

// stock：在庫のなかま（ごはんは炊飯器ひとつから、並は 1 杯分、大盛りは 2 杯分を使う）
export const ITEMS = {
  karaage: { slot: "main", name: "唐揚げ", emoji: "🍗" },
  saba: { slot: "main", name: "焼き魚", emoji: "🐟" },
  hamburg: { slot: "main", name: "ハンバーグ", emoji: "🥩" },
  shogayaki: { slot: "main", name: "生姜焼き", emoji: "🥓" },
  tonkatsu: { slot: "main", name: "とんかつ", emoji: "🐖" },
  rice: { slot: "rice", name: "ごはん", emoji: "🍚", stock: "rice", use: 1 },
  riceL: { slot: "rice", name: "大盛り", emoji: "🍚", stock: "rice", use: 2, big: true },
  miso: { slot: "soup", name: "みそ汁", emoji: "🥣" },
  tonjiru: { slot: "soup", name: "豚汁", emoji: "🍲" },
  corn: { slot: "soup", name: "コーンスープ", short: "コーン", emoji: "🌽" },
  salad: { slot: "side", name: "サラダ", emoji: "🥗" },
  potesara: { slot: "side", name: "ポテサラ", emoji: "🥔" },
  hiyayakko: { slot: "side", name: "冷奴", emoji: "🧊" },
  tea: { slot: "drink", name: "お茶", emoji: "🍵" },
  water: { slot: "drink", name: "水", emoji: "💧" },
  milk: { slot: "drink", name: "牛乳", emoji: "🥛" },
  juice: { slot: "drink", name: "ジュース", emoji: "🧃" },
};
export const stockKey = (id) => ITEMS[id].stock || id;

// 補充の量と、はじめの在庫
export const RESTOCK = { rice: 10, default: 5 };
export const INITIAL = { rice: 10, default: 4 };
export const LOW = { rice: 3, default: 1 }; // この数以下で「残りわずか」
export const MAX_REQUESTS = 2; // キッチンが同時に受けられる依頼の数

export const COUNTER_LEVELS = {
  easy: {
    label: "やさしい",
    mains: ["karaage", "saba", "hamburg"],
    soups: ["miso"],
    sides: ["salad"],
    drinks: ["tea", "water"],
    spawn: [10000, 13000], patience: 45000, restock: 8000, maxQueue: 4, stars: [400, 800, 1200],
  },
  normal: {
    label: "ふつう",
    mains: ["karaage", "saba", "hamburg", "shogayaki"],
    soups: ["miso", "tonjiru"],
    sides: ["salad", "potesara"],
    drinks: ["tea", "water", "milk"],
    spawn: [8000, 11000], patience: 38000, restock: 10000, maxQueue: 4, stars: [500, 1000, 1500],
  },
  hard: {
    label: "むずかしい",
    mains: ["karaage", "saba", "hamburg", "shogayaki", "tonkatsu"],
    soups: ["miso", "tonjiru", "corn"],
    sides: ["salad", "potesara", "hiyayakko"],
    drinks: ["tea", "water", "milk", "juice"],
    spawn: [6000, 8500], patience: 32000, restock: 12000, maxQueue: 4, stars: [600, 1200, 1800],
  },
};

export const COUNTER_DURATION = 120000;
export const PENALTY = { wrong: 30, leave: 50 };
const FACES = ["🧑‍🎓", "👩‍🎓", "👨‍🎓", "🧑", "👩", "👨", "🧔", "👱", "👧", "🧑‍🦱", "👩‍🦰", "👨‍🦳"];

// レベルで使う品（棚に並べる順）
export function counterItems(level) {
  const c = COUNTER_LEVELS[level];
  return [...c.mains, "rice", "riceL", ...c.soups, ...c.sides, ...c.drinks];
}
export function counterStockKeys(level) {
  return [...new Set(counterItems(level).map(stockKey))];
}
const cfgOf = (table, key) => (key in table ? table[key] : table.default);

export function newCounter(level) {
  const stock = {};
  for (const k of counterStockKeys(level)) stock[k] = cfgOf(INITIAL, k);
  return {
    level,
    t: 0,
    over: false,
    score: 0,
    served: 0,
    wrong: 0,
    left: 0,
    nextId: 1,
    queue: [], // { id, face, name, order: {slot: itemId|null}, born, patience }
    tray: { main: null, rice: null, soup: null, side: null, drink: null },
    stock,
    requests: [], // { key, end }
    nextSpawn: 800,
    events: [],
  };
}

const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];

// 定食の注文を作る：主菜 + ごはん + 汁物 は基本。小鉢と飲み物は、なしのときもある
export function makeOrder(level, rand = Math.random) {
  const c = COUNTER_LEVELS[level];
  const main = pick(c.mains, rand);
  const r = rand();
  const rice = r < 0.25 ? "riceL" : r < 0.92 ? "rice" : null; // 大盛り・並・ごはんなし
  const soup = rand() < 0.65 ? c.soups[0] : pick(c.soups, rand);
  const side = rand() < 0.8 ? pick(c.sides, rand) : null;
  const drink = rand() < 0.85 ? pick(c.drinks, rand) : null;
  return { main, rice, soup, side, drink };
}

export function orderTitle(order) {
  return `${ITEMS[order.main].name}定食`;
}

function spawn(s, rand) {
  const c = COUNTER_LEVELS[s.level];
  if (s.queue.length < c.maxQueue) {
    s.queue.push({
      id: s.nextId++,
      face: pick(FACES, rand),
      order: makeOrder(s.level, rand),
      born: s.t,
      patience: c.patience,
    });
  }
  const [a, b] = c.spawn;
  s.nextSpawn = s.t + a + rand() * (b - a);
}

const clone = (s) => ({
  ...s,
  queue: s.queue.map((q) => ({ ...q })),
  tray: { ...s.tray },
  stock: { ...s.stock },
  requests: s.requests.map((r) => ({ ...r })),
  events: [],
});

export const patienceLeft = (s, q) => q.born + q.patience - s.t;

export function counterTick(prev, dt, rand = Math.random) {
  if (prev.over) return prev;
  const s = clone(prev);
  s.t += dt;
  // キッチンからの補充
  const arrived = s.requests.filter((r) => s.t >= r.end);
  for (const r of arrived) {
    s.stock[r.key] += cfgOf(RESTOCK, r.key);
    s.events.push({ kind: "restock", key: r.key, text: `${stockName(r.key)}が届きました` });
  }
  s.requests = s.requests.filter((r) => s.t < r.end);
  // 待ちきれずに帰る学生
  const gone = s.queue.filter((q) => patienceLeft(s, q) <= 0);
  if (gone.length) {
    s.queue = s.queue.filter((q) => patienceLeft(s, q) > 0);
    s.left += gone.length;
    s.score -= PENALTY.leave * gone.length;
    s.events.push({ kind: "leave", text: `待ちきれずに帰ってしまった… −${PENALTY.leave * gone.length}` });
  }
  if (s.t >= COUNTER_DURATION) {
    s.over = true;
    return s;
  }
  if (s.t >= s.nextSpawn) spawn(s, rand);
  return s;
}

export function stockName(key) {
  return key === "rice" ? "ごはん" : ITEMS[key].name;
}
export const isLow = (s, key) => s.stock[key] <= cfgOf(LOW, key);
export const requestOf = (s, key) => s.requests.find((r) => r.key === key) || null;

// 棚の品をタップ：トレーのその品の置き場所に置く（置いてあった品は棚に戻す）
export function placeItem(prev, id) {
  if (prev.over) return prev;
  const s = clone(prev);
  const it = ITEMS[id];
  const key = stockKey(id);
  const use = it.use || 1;
  const cur = s.tray[it.slot];
  if (cur === id) {
    // 同じ品をもう一度タップしたら下げる
    s.stock[stockKey(cur)] += ITEMS[cur].use || 1;
    s.tray[it.slot] = null;
    s.events.push({ kind: "remove" });
    return s;
  }
  // 置いてある品を戻した後の在庫で足りるか
  const back = cur && stockKey(cur) === key ? ITEMS[cur].use || 1 : 0;
  if (s.stock[key] + back < use) {
    s.events.push({ kind: "ng", text: `${it.name}が足りません。キッチンに依頼しよう` });
    return s;
  }
  if (cur) s.stock[stockKey(cur)] += ITEMS[cur].use || 1;
  s.stock[key] -= use;
  s.tray[it.slot] = id;
  s.events.push({ kind: "place" });
  return s;
}

// トレーの置き場所をタップ：品を下げて棚に戻す
export function removeSlot(prev, slot) {
  const cur = prev.tray[slot];
  if (!cur) return prev;
  const s = clone(prev);
  s.stock[stockKey(cur)] += ITEMS[cur].use || 1;
  s.tray[slot] = null;
  s.events.push({ kind: "remove" });
  return s;
}

// キッチンに補充を依頼
export function requestStock(prev, key) {
  if (prev.over) return prev;
  const s = clone(prev);
  if (requestOf(s, key)) return prev;
  if (s.requests.length >= MAX_REQUESTS) {
    s.events.push({ kind: "ng", text: "キッチンは手いっぱい！ 届くまで待とう" });
    return s;
  }
  s.requests.push({ key, end: s.t + COUNTER_LEVELS[s.level].restock });
  s.events.push({ kind: "request", text: `キッチンに${stockName(key)}を依頼しました` });
  return s;
}

// トレーと注文がちがう置き場所の一覧
export function trayDiff(tray, order) {
  return SLOT_ORDER.filter((k) => (tray[k] || null) !== (order[k] || null));
}

// 先頭の学生に提供
export function serve(prev) {
  if (prev.over || !prev.queue.length) return prev;
  const s = clone(prev);
  const q = s.queue[0];
  const diff = trayDiff(s.tray, q.order);
  if (diff.length) {
    s.wrong += 1;
    s.score -= PENALTY.wrong;
    s.events.push({ kind: "wrong", slots: diff, text: `注文とちがうよ！ −${PENALTY.wrong}` });
    return s;
  }
  const bonus = Math.round((Math.max(0, patienceLeft(s, q)) / q.patience) * 50);
  const n = SLOT_ORDER.filter((k) => q.order[k]).length;
  const pts = 40 + n * 15 + bonus;
  s.score += pts;
  s.served += 1;
  s.queue.shift();
  s.tray = { main: null, rice: null, soup: null, side: null, drink: null };
  s.events.push({ kind: "serve", text: `ありがとう！ +${pts}` });
  return s;
}

export function counterStars(s) {
  return COUNTER_LEVELS[s.level].stars.filter((v) => s.score >= v).length;
}
