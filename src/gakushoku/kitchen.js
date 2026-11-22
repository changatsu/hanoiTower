// キッチンモードのルール（画面とは切り離した純粋な関数）。
// 注文票が時間とともに届く。票をコンロに乗せ、レシピの工程どおりに
// 食材を入れて調理ボタンを押す。最後の「盛る」で提供。締め切りを過ぎると減点。

export const INGREDIENTS = {
  rice: { name: "ごはん", emoji: "🍚" },
  chicken: { name: "鶏肉", emoji: "🍗" },
  pork: { name: "豚肉", emoji: "🥓" },
  fish: { name: "さば", emoji: "🐟" },
  egg: { name: "たまご", emoji: "🥚" },
  cabbage: { name: "キャベツ", emoji: "🥬" },
  carrot: { name: "にんじん", emoji: "🥕" },
  potato: { name: "じゃがいも", emoji: "🥔" },
  onion: { name: "たまねぎ", emoji: "🧅" },
  tofu: { name: "とうふ", emoji: "🧊" },
  miso: { name: "みそ", emoji: "🟤" },
  roux: { name: "ルー", emoji: "🍫" },
  flour: { name: "ころも", emoji: "🌾" },
  ginger: { name: "しょうが", emoji: "🫚" },
};

// dur：火を使う工程の時間（ミリ秒）。0 はすぐ終わる。
export const PROCS = {
  cut: { name: "切る", emoji: "🔪", dur: 0 },
  fry: { name: "炒める", emoji: "🍳", dur: 2000 },
  boil: { name: "煮る", emoji: "🍲", dur: 3000 },
  grill: { name: "焼く", emoji: "🔥", dur: 3000 },
  deep: { name: "揚げる", emoji: "🍤", dur: 3000 },
  plate: { name: "盛る", emoji: "🍽️", dur: 0 },
};
export const PROC_ORDER = ["cut", "fry", "boil", "grill", "deep", "plate"];

// 各工程：ings の食材を（順不同で）全部入れてから proc を押す
export const RECIPES = {
  curry: {
    name: "カレーライス", emoji: "🍛", pts: 120,
    steps: [
      { ings: ["carrot", "potato", "onion"], proc: "cut" },
      { ings: ["pork"], proc: "fry" },
      { ings: ["roux"], proc: "boil" },
      { ings: ["rice"], proc: "plate" },
    ],
  },
  saba: {
    name: "さばの塩焼き", emoji: "🐟", pts: 60,
    steps: [
      { ings: ["fish"], proc: "grill" },
      { ings: [], proc: "plate" },
    ],
  },
  miso: {
    name: "みそ汁", emoji: "🥣", pts: 60,
    steps: [
      { ings: ["tofu"], proc: "cut" },
      { ings: ["miso"], proc: "boil" },
      { ings: [], proc: "plate" },
    ],
  },
  karaage: {
    name: "唐揚げ", emoji: "🍗", pts: 100,
    steps: [
      { ings: ["chicken", "ginger"], proc: "cut" },
      { ings: ["flour"], proc: "deep" },
      { ings: ["cabbage"], proc: "plate" },
    ],
  },
  shogayaki: {
    name: "生姜焼き", emoji: "🥓", pts: 90,
    steps: [
      { ings: ["onion"], proc: "cut" },
      { ings: ["pork", "ginger"], proc: "fry" },
      { ings: ["cabbage"], proc: "plate" },
    ],
  },
  omurice: {
    name: "オムライス", emoji: "🍳", pts: 130,
    steps: [
      { ings: ["chicken", "onion"], proc: "cut" },
      { ings: ["rice"], proc: "fry" },
      { ings: ["egg"], proc: "grill" },
      { ings: [], proc: "plate" },
    ],
  },
  nikujaga: {
    name: "肉じゃが", emoji: "🥘", pts: 110,
    steps: [
      { ings: ["potato", "carrot", "onion"], proc: "cut" },
      { ings: ["pork"], proc: "boil" },
      { ings: [], proc: "plate" },
    ],
  },
  tonkatsu: {
    name: "とんかつ", emoji: "🐖", pts: 120,
    steps: [
      { ings: ["pork", "egg", "flour"], proc: "deep" },
      { ings: ["cabbage"], proc: "cut" },
      { ings: [], proc: "plate" },
    ],
  },
};

export const KITCHEN_LEVELS = {
  easy: { label: "やさしい", menu: ["curry", "saba", "miso"], spawn: [13000, 17000], limit: 55000, maxTickets: 4, stars: [200, 450, 700] },
  normal: { label: "ふつう", menu: ["curry", "saba", "miso", "karaage", "shogayaki"], spawn: [9000, 13000], limit: 48000, maxTickets: 5, stars: [300, 650, 1000] },
  hard: { label: "むずかしい", menu: Object.keys(RECIPES), spawn: [6500, 9500], limit: 42000, maxTickets: 5, stars: [400, 900, 1400] },
};

export const KITCHEN_DURATION = 120000; // 営業時間 2 分
export const BURN_AFTER = 8000; // 火を使う工程が終わってから、次に進まずに放っておくと焦げるまで
export const BOARDS = 2; // コンロの数
export const PENALTY = { late: 40, burn: 15, miss: 5 };

// このレベルで使う食材と調理（ボタンに並べる分だけ）
export function kitchenPalette(level) {
  const ings = new Set();
  const procs = new Set();
  for (const id of KITCHEN_LEVELS[level].menu) {
    for (const s of RECIPES[id].steps) {
      s.ings.forEach((i) => ings.add(i));
      procs.add(s.proc);
    }
  }
  return {
    ings: Object.keys(INGREDIENTS).filter((k) => ings.has(k)),
    procs: PROC_ORDER.filter((k) => procs.has(k)),
  };
}

const emptyBoard = () => ({ ticket: null, step: 0, added: [], busy: null, doneAt: null });

export function newKitchen(level, rand = Math.random) {
  const s = {
    level,
    t: 0,
    over: false,
    score: 0,
    served: 0,
    late: 0,
    burnt: 0,
    misses: 0,
    nextId: 1,
    tickets: [], // { id, dish, born, limit }
    boards: Array.from({ length: BOARDS }, emptyBoard),
    sel: 0,
    nextSpawn: 1500,
    events: [], // 画面に出すひとこと・効果音のきっかけ { kind, text, board? }
  };
  return s;
}

function spawn(s, rand) {
  const cfg = KITCHEN_LEVELS[s.level];
  if (s.tickets.length < cfg.maxTickets) {
    const dish = cfg.menu[Math.floor(rand() * cfg.menu.length)];
    s.tickets.push({ id: s.nextId++, dish, born: s.t, limit: cfg.limit });
  }
  const [a, b] = cfg.spawn;
  s.nextSpawn = s.t + a + rand() * (b - a);
}

const clone = (s) => ({
  ...s,
  tickets: s.tickets.map((t) => ({ ...t })),
  boards: s.boards.map((b) => ({ ...b, added: [...b.added] })),
  events: [],
});

export const ticketLeft = (s, tk) => tk.born + tk.limit - s.t;

// 時間を dt ミリ秒進める
export function kitchenTick(prev, dt, rand = Math.random) {
  if (prev.over) return prev;
  const s = clone(prev);
  s.t += dt;
  // 火を使う工程の完了と、放っておいたときの焦げ
  s.boards.forEach((b, i) => {
    if (b.busy && s.t >= b.busy.end) {
      b.busy = null;
      b.step += 1;
      b.added = [];
      b.doneAt = s.t;
      s.events.push({ kind: "done", board: i, text: "できた！" });
    }
    if (!b.busy && b.doneAt != null && s.t - b.doneAt >= BURN_AFTER) {
      b.step = 0;
      b.added = [];
      b.doneAt = null;
      s.burnt += 1;
      s.score -= PENALTY.burn;
      s.events.push({ kind: "burn", board: i, text: `焦げた！ −${PENALTY.burn}` });
    }
  });
  // 締め切り切れ
  const expired = s.tickets.filter((tk) => ticketLeft(s, tk) <= 0);
  for (const tk of expired) {
    s.tickets = s.tickets.filter((x) => x.id !== tk.id);
    s.boards = s.boards.map((b) => (b.ticket === tk.id ? emptyBoard() : b));
    s.late += 1;
    s.score -= PENALTY.late;
    s.events.push({ kind: "late", text: `${RECIPES[tk.dish].name} 間に合わず −${PENALTY.late}` });
  }
  if (s.t >= KITCHEN_DURATION) {
    s.over = true;
    return s;
  }
  if (s.t >= s.nextSpawn) spawn(s, rand);
  return s;
}

export function selectBoard(prev, i) {
  return { ...prev, sel: i, events: [] };
}

// 注文票をタップ：選んでいるコンロ（ふさがっていれば空いているコンロ）に乗せる
export function takeTicket(prev, id) {
  if (prev.over) return prev;
  if (prev.boards.some((b) => b.ticket === id)) {
    // すでにコンロに乗っている票なら、そのコンロを選ぶ
    return { ...prev, sel: prev.boards.findIndex((b) => b.ticket === id), events: [] };
  }
  const s = clone(prev);
  let i = s.boards[s.sel].ticket == null ? s.sel : s.boards.findIndex((b) => b.ticket == null);
  if (i < 0) {
    s.events.push({ kind: "ng", text: "空いているコンロがありません" });
    return s;
  }
  s.boards[i] = { ...emptyBoard(), ticket: id };
  s.sel = i;
  return s;
}

// コンロの料理をやめて、票を戻す
export function clearBoard(prev, i) {
  const s = clone(prev);
  s.boards[i] = emptyBoard();
  return s;
}

export function boardDish(s, b) {
  const tk = s.tickets.find((x) => x.id === b.ticket);
  return tk ? tk.dish : null;
}

function miss(s, text) {
  s.misses += 1;
  s.score -= PENALTY.miss;
  s.events.push({ kind: "ng", board: s.sel, text: `${text} −${PENALTY.miss}` });
  return s;
}

// 食材ボタン
export function addIngredient(prev, ing) {
  if (prev.over) return prev;
  const s = clone(prev);
  const b = s.boards[s.sel];
  const dish = boardDish(s, b);
  if (!dish) {
    s.events.push({ kind: "ng", text: "先に注文票をタップしてコンロに乗せよう" });
    return s;
  }
  if (b.busy) {
    s.events.push({ kind: "ng", board: s.sel, text: "調理中です" });
    return s;
  }
  const step = RECIPES[dish].steps[b.step];
  if (!step.ings.includes(ing) || b.added.includes(ing)) {
    return miss(s, `${INGREDIENTS[ing].name}はいまは使わない`);
  }
  b.added.push(ing);
  b.doneAt = null; // 次の工程に手をつけたので焦げない
  s.events.push({ kind: "add" });
  return s;
}

// 調理ボタン
export function applyProc(prev, proc) {
  if (prev.over) return prev;
  const s = clone(prev);
  const b = s.boards[s.sel];
  const dish = boardDish(s, b);
  if (!dish) {
    s.events.push({ kind: "ng", text: "先に注文票をタップしてコンロに乗せよう" });
    return s;
  }
  if (b.busy) {
    s.events.push({ kind: "ng", board: s.sel, text: "調理中です" });
    return s;
  }
  const recipe = RECIPES[dish];
  const step = recipe.steps[b.step];
  if (step.ings.some((i) => !b.added.includes(i))) {
    return miss(s, "まだ入れていない食材があります");
  }
  if (step.proc !== proc) {
    return miss(s, `いまは「${PROCS[step.proc].name}」の番`);
  }
  b.doneAt = null;
  const dur = PROCS[proc].dur;
  if (dur > 0) {
    b.busy = { proc, start: s.t, end: s.t + dur };
    s.events.push({ kind: "heat" });
    return s;
  }
  b.step += 1;
  b.added = [];
  if (b.step >= recipe.steps.length) {
    // 提供：基本点 + 残り時間のボーナス
    const tk = s.tickets.find((x) => x.id === b.ticket);
    const bonus = Math.round((Math.max(0, ticketLeft(s, tk)) / tk.limit) * 50);
    s.score += recipe.pts + bonus;
    s.served += 1;
    s.tickets = s.tickets.filter((x) => x.id !== tk.id);
    s.boards[s.sel] = emptyBoard();
    s.events.push({ kind: "serve", text: `${recipe.name} 提供！ +${recipe.pts + bonus}` });
  } else {
    s.events.push({ kind: "chop" });
  }
  return s;
}

// 星：レベルごとの点数の目安から
export function kitchenStars(s) {
  return KITCHEN_LEVELS[s.level].stars.filter((v) => s.score >= v).length;
}
