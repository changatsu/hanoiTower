import { useCallback, useState } from "react";
import Kitchen from "./Kitchen.jsx";
import Counter from "./Counter.jsx";
import { KITCHEN_LEVELS } from "./kitchen.js";
import { COUNTER_LEVELS } from "./counter.js";
import { setSoundEnabled, unlockAudio } from "./sound.js";

function load(key) {
  try {
    const v = parseInt(localStorage.getItem(key) || "", 10);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
function loadStr(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, v) {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* 保存できない環境では何もしない */
  }
}
const bestKey = (mode, level) => `gaku-best-${mode}-${level}`;
const LEVEL_KEYS = ["easy", "normal", "hard"];

const MODES = {
  kitchen: {
    name: "キッチン",
    emoji: "🍳",
    desc: "注文票の料理を、レシピの工程どおりに作ろう。食材を入れて「切る」「煮る」などを押し、最後に「盛る」で提供。締め切りに遅れると減点、火にかけたまま放っておくと焦げます。",
    levels: KITCHEN_LEVELS,
  },
  counter: {
    name: "カウンター",
    emoji: "🍱",
    desc: "学生の注文どおりに、ごはん・汁物・おかず・小鉢・飲み物をトレーに並べて提供しよう。品が少なくなったら「依頼」でキッチンに頼むと、しばらくして届きます。",
    levels: COUNTER_LEVELS,
  },
};

export default function App() {
  const [mode, setMode] = useState(() => (loadStr("gaku-mode") === "counter" ? "counter" : "kitchen"));
  const [level, setLevel] = useState(() => {
    const v = loadStr("gaku-level");
    return LEVEL_KEYS.includes(v) ? v : "easy";
  });
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);
  const [soundOn, setSoundOn] = useState(() => load("gaku-sound") !== 0);
  const [, setBestTick] = useState(0);
  setSoundEnabled(soundOn);

  const start = () => {
    unlockAudio();
    save("gaku-mode", mode);
    save("gaku-level", level);
    setRound((r) => r + 1);
    setPlaying(true);
  };
  const exit = useCallback(() => setPlaying(false), []);
  const finish = useCallback(
    (score) => {
      const k = bestKey(mode, level);
      const prev = load(k);
      if (prev == null || score > prev) save(k, score);
      setBestTick((t) => t + 1);
    },
    [mode, level]
  );

  if (playing) {
    const Game = mode === "kitchen" ? Kitchen : Counter;
    return (
      <div className="app" onPointerDown={unlockAudio}>
        <Game key={round} level={level} onExit={exit} onFinish={finish} />
      </div>
    );
  }

  const m = MODES[mode];
  return (
    <div className="app" onPointerDown={unlockAudio}>
      <div className="screen title-screen">
        <header className="title-head">
          <h1>
            <span className="title-sub">お昼の学食はおおいそがし</span>
            まんぷく学食
          </h1>
          <button
            className="icon-btn"
            aria-label={soundOn ? "音をオフにする" : "音をオンにする"}
            onClick={() => {
              const v = !soundOn;
              setSoundOn(v);
              save("gaku-sound", v ? 1 : 0);
            }}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </header>

        <div className="mode-tabs" role="tablist">
          {Object.entries(MODES).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={mode === k} className={`mode-tab${mode === k ? " on" : ""}`} onClick={() => setMode(k)}>
              <span className="mode-emoji">{v.emoji}</span>
              {v.name}
            </button>
          ))}
        </div>

        <p className="mode-desc">{m.desc}</p>

        <div className="levels">
          {LEVEL_KEYS.map((k) => {
            const best = load(bestKey(mode, k));
            return (
              <button key={k} className={`level${level === k ? " on" : ""}`} onClick={() => setLevel(k)}>
                <span className="level-name">{m.levels[k].label}</span>
                <span className="level-best">{best == null ? "まだ" : `ベスト ${best}点`}</span>
              </button>
            );
          })}
        </div>

        <button className="primary start" onClick={start}>
          {m.emoji} {m.name}で営業開始（2分）
        </button>

        <footer className="links">
          <a href="../">ハノイの塔</a>
          <a href="../neko/">ねこだな</a>
        </footer>
      </div>
    </div>
  );
}
