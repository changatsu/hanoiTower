// 効果音。音源ファイルは使わず、Web Audio API でその場で合成する。
// iPhone では、最初に画面をタップしたときに音を鳴らせる状態にする（ブラウザの決まり）。

let ctx = null;
let master = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    // iPhone のマナーモード（消音スイッチ）中は鳴らさない
    if (navigator.audioSession) navigator.audioSession.type = "ambient";
  } catch {
    /* 対応していない環境では何もしない */
  }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

// タップのたびに呼ぶ。止まっている AudioContext を再開する
export function unlockAudio() {
  const ac = audio();
  if (ac && ac.state !== "running") ac.resume().catch(() => {});
}

// 1 音鳴らす。freq は [開始, 途中..., 終了] の周波数の折れ線
function tone({ freqs, dur, type = "sine", vol = 0.3, delay = 0, attack = 0.008, filter }) {
  if (!enabled) return;
  const ac = audio();
  if (!ac || ac.state !== "running") return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqs[0], t0);
  freqs.slice(1).forEach((f, i) => {
    osc.frequency.linearRampToValueAtTime(f, t0 + (dur * (i + 1)) / (freqs.length - 1));
  });
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = osc;
  if (filter) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filter;
    f.Q.value = 6;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  // 食材を入れる・トレーに置く：ぽっ
  add() {
    tone({ freqs: [520, 780], dur: 0.08, vol: 0.22 });
  },
  // 下げる：しゅっ
  remove() {
    tone({ freqs: [700, 380], dur: 0.1, type: "triangle", vol: 0.16 });
  },
  // 切る：とんとん
  chop() {
    [0, 0.09].forEach((d) => tone({ freqs: [260, 140], dur: 0.06, type: "square", vol: 0.1, filter: 1200, delay: d }));
  },
  // 火にかける：じゅっ
  heat() {
    tone({ freqs: [900, 600], dur: 0.25, type: "sawtooth", vol: 0.05, filter: 2400 });
  },
  // 調理ができた：ちーん
  done() {
    tone({ freqs: [1760, 1760], dur: 0.35, vol: 0.14 });
  },
  // 置けない・ちがう：ぶっ
  nope() {
    tone({ freqs: [180, 130], dur: 0.16, type: "square", vol: 0.08, filter: 900 });
  },
  // 提供できた：ドミソ
  serve() {
    [523, 659, 784].forEach((f, i) => tone({ freqs: [f, f], dur: 0.18, type: "triangle", vol: 0.2, delay: i * 0.07 }));
  },
  // 依頼・補充：ぴんぽん
  bell() {
    tone({ freqs: [988, 988], dur: 0.16, vol: 0.14 });
    tone({ freqs: [784, 784], dur: 0.24, vol: 0.14, delay: 0.14 });
  },
  // 焦げた・帰ってしまった：ぶぶー
  bad() {
    tone({ freqs: [220, 200], dur: 0.18, type: "square", vol: 0.08, filter: 800 });
    tone({ freqs: [200, 160], dur: 0.3, type: "square", vol: 0.08, filter: 800, delay: 0.2 });
  },
  // 営業終了：ファンファーレ
  end() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone({ freqs: [f, f], dur: i === 3 ? 0.5 : 0.16, type: "triangle", vol: 0.22, delay: i * 0.12 }));
  },
};

// 状態に積まれたできごとに合わせて鳴らす
const KIND_SOUND = {
  add: "add", place: "add", remove: "remove", chop: "chop", heat: "heat", done: "done",
  ng: "nope", wrong: "nope", serve: "serve", request: "bell", restock: "bell", burn: "bad", late: "bad", leave: "bad",
};
export function playEvents(events) {
  const kinds = new Set(events.map((e) => KIND_SOUND[e.kind]).filter(Boolean));
  kinds.forEach((k) => sfx[k]());
}
