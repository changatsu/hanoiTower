import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./Board.jsx";
import { PEG_NAMES, applyMove, canMove, createPegs, isSolved, minMoves, solve, topDisc } from "./hanoi.js";

const DISC_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_COUNT = 5;
const HINT = "柱をタップして円盤を持ち上げ、別の柱をタップして置きます。ドラッグでも動かせます。";

// 自己ベストはブラウザの localStorage に保存する（データベースは使わない）
const bestKey = (n) => `hanoi-best-${n}`;
function loadBest(n) {
  try {
    const v = parseInt(localStorage.getItem(bestKey(n)) || "", 10);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
function saveBest(n, moves) {
  try {
    localStorage.setItem(bestKey(n), String(moves));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

export default function App() {
  const [n, setN] = useState(DEFAULT_COUNT);
  const [pegs, setPegs] = useState(() => createPegs(DEFAULT_COUNT));
  const [history, setHistory] = useState([]); // [from, to] の配列
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState({ text: HINT, win: false });
  const [result, setResult] = useState(null); // { moves, demo }
  const [best, setBest] = useState(() => loadBest(DEFAULT_COUNT));
  const [badPeg, setBadPeg] = useState(null);
  const [demo, setDemo] = useState(false);
  const demoTimer = useRef(null);

  const stopDemo = useCallback(() => {
    clearTimeout(demoTimer.current);
    demoTimer.current = null;
    setDemo(false);
  }, []);

  const newGame = useCallback(
    (count) => {
      stopDemo();
      setN(count);
      setPegs(createPegs(count));
      setHistory([]);
      setSelected(null);
      setResult(null);
      setBest(loadBest(count));
      setMessage({ text: HINT, win: false });
    },
    [stopDemo]
  );

  useEffect(() => () => clearTimeout(demoTimer.current), []);

  const finishGame = (moves, isDemo) => {
    const min = minMoves(n);
    if (!isDemo && (best === null || moves < best)) {
      saveBest(n, moves);
      setBest(moves);
    }
    const text = isDemo
      ? `お手本は ${moves} 手で完成しました。`
      : moves === min
        ? `クリア！ 最少手数の ${moves} 手です。完璧です。`
        : `クリア！ ${moves} 手でした（最少手数は ${min} 手）。`;
    setMessage({ text, win: true });
    setResult({ moves, demo: isDemo });
  };

  const flashBad = (p) => {
    setBadPeg(p);
    setTimeout(() => setBadPeg(null), 300);
  };

  const tryMove = (from, to) => {
    if (from === to) return;
    if (!canMove(pegs, from, to)) {
      flashBad(to);
      setMessage({ text: "小さい円盤の上に大きい円盤は置けません。", win: false });
      return;
    }
    const next = applyMove(pegs, from, to);
    const nextHistory = [...history, [from, to]];
    setPegs(next);
    setHistory(nextHistory);
    setMessage({ text: `円盤${topDisc(next[to])}を ${PEG_NAMES[from]} から ${PEG_NAMES[to]} へ移しました。`, win: false });
    if (isSolved(next, n)) finishGame(nextHistory.length, false);
  };

  const handleTap = (p) => {
    if (selected === null) {
      if (!pegs[p].length) return;
      setSelected(p);
      setMessage({ text: `円盤${topDisc(pegs[p])}を持ち上げました。置く柱を選んでください。`, win: false });
      return;
    }
    const from = selected;
    setSelected(null);
    if (from === p) setMessage({ text: "持ち上げをやめました。", win: false });
    else tryMove(from, p);
  };

  const handleDrop = (from, to) => {
    setSelected(null);
    tryMove(from, to);
  };

  const undo = () => {
    if (!history.length || result) return;
    const [from, to] = history[history.length - 1];
    setPegs(applyMove(pegs, to, from));
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMessage({ text: "1手戻しました。", win: false });
  };

  const startDemo = () => {
    newGame(n);
    const seq = solve(n);
    const delay = Math.max(90, Math.min(550, 9000 / seq.length));
    setDemo(true);
    setMessage({ text: `お手本を再生中です（${seq.length} 手）。`, win: false });
    let state = createPegs(n);
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        demoTimer.current = null;
        setDemo(false);
        finishGame(seq.length, true);
        return;
      }
      const [f, t] = seq[i++];
      state = applyMove(state, f, t);
      setPegs(state);
      setHistory(seq.slice(0, i));
      demoTimer.current = setTimeout(step, delay);
    };
    demoTimer.current = setTimeout(step, 400);
  };

  const min = minMoves(n);
  const locked = demo || result !== null;

  return (
    <div className="wrap">
      <header>
        <h1>ハノイの塔</h1>
        <p className="rule">
          左の柱の円盤をすべて右の柱へ移しましょう。動かせるのは一番上の円盤だけで、小さい円盤の上に大きい円盤は置けません。
        </p>
      </header>

      <div className="stats">
        <Stat label="手数" value={history.length} />
        <Stat label="最少手数" value={min} />
        <Stat label="自己ベスト" value={best ?? "―"} />
        <div className="stat size">
          <label htmlFor="count">円盤の数</label>
          <select id="count" value={n} onChange={(e) => newGame(Number(e.target.value))}>
            {DISC_COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="board-wrap">
        <Board
          n={n}
          pegs={pegs}
          selected={selected}
          disabled={locked}
          badPeg={badPeg}
          onTap={handleTap}
          onDrop={handleDrop}
        />
        {result && (
          <div className="overlay">
            <div className="banner">
              <b>{result.demo ? "完成" : result.moves === min ? "パーフェクト" : "クリア"}</b>
              {result.moves} 手 / 最少 {min} 手
            </div>
          </div>
        )}
      </div>

      <div className={`message${message.win ? " win" : ""}`} role="status">
        {message.text}
      </div>

      <div className="controls">
        <button onClick={undo} disabled={!history.length || locked}>
          1手戻す
        </button>
        <button onClick={() => newGame(n)}>最初から</button>
        <button className="primary" onClick={() => (demo ? newGame(n) : startDemo())}>
          {demo ? "お手本を止める" : "お手本を見る"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}
