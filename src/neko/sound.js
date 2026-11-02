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

// 色ごとに少し高さを変える（同じ色を集めると同じ声になる）
const PITCH = [1, 0.84, 1.12, 0.94, 1.06, 0.8, 0.9, 1.19, 1.0];

export const sfx = {
  // 棚を選んでねこを持ち上げる：ぽっ
  pick() {
    tone({ freqs: [520, 780], dur: 0.09, vol: 0.25 });
  },
  // ねこを置く：にゃっ（色で声の高さが変わる）
  drop(color = 0) {
    const p = PITCH[color % PITCH.length];
    tone({ freqs: [420 * p, 900 * p, 620 * p], dur: 0.22, type: "sawtooth", vol: 0.16, filter: 1600, attack: 0.02 });
    tone({ freqs: [840 * p, 1500 * p, 1100 * p], dur: 0.2, vol: 0.06, attack: 0.02 });
  },
  // ？のねこの色がわかった：きらっ
  reveal() {
    tone({ freqs: [1568, 1568], dur: 0.12, vol: 0.12, delay: 0.12 });
    tone({ freqs: [2093, 2093], dur: 0.18, vol: 0.1, delay: 0.19 });
  },
  // 置けない：ぶっ
  nope() {
    tone({ freqs: [180, 130], dur: 0.14, type: "square", vol: 0.08, filter: 900 });
  },
  // 1 手戻す：しゅっ
  undo() {
    tone({ freqs: [700, 380], dur: 0.12, type: "triangle", vol: 0.18 });
  },
  // 棚が 1 色でそろった：ドミソ
  complete() {
    [523, 659, 784].forEach((f, i) => tone({ freqs: [f, f], dur: 0.22, type: "triangle", vol: 0.2, delay: 0.18 + i * 0.08 }));
  },
  // ぜんぶ仕分けできた：ファンファーレ
  win() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    const times = [0, 0.12, 0.24, 0.36, 0.56, 0.68];
    notes.forEach((f, i) =>
      tone({ freqs: [f, f], dur: i === notes.length - 1 ? 0.6 : 0.18, type: "triangle", vol: 0.24, delay: 0.3 + times[i] })
    );
  },
};
