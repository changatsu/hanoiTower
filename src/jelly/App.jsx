import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { LEVELS } from "./levels.js";
import { dragToward, initState, isCleared } from "./logic.js";

// ゼリーの色：いちご・レモン・メロン・ソーダ・ぶどう
export const COLORS = [
  { name: "いちご", base: "#ff5f8f", light: "#ffb3c9", dark: "#d93a6c" },
  { name: "レモン", base: "#ffc93c", light: "#ffe79a", dark: "#e09a12" },
  { name: "メロン", base: "#6fd36a", light: "#bff0a8", dark: "#3fa443" },
  { name: "ソーダ", base: "#43b8f5", light: "#a9e2ff", dark: "#1f86c9" },
  { name: "ぶどう", base: "#a274f0", light: "#d6bfff", dark: "#7346c8" },
];

const HINT =
  "ゼリーをドラッグしてすべらせ、ふちにある同じ色の出口から外へ出します。出口の幅に収まる大きさのゼリーだけが出られます。全部出すとクリア。⇆⇅のゼリーはその向きにしか動けません。同じゼリーを続けて動かすあいだは 1 手と数えます。";

const STORE = "jelly-progress";
function loadProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "{}");
    return { unlocked: v.unlocked || 1, best: v.best || {} };
  } catch {
    return { unlocked: 1, best: {} };
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

export function starsFor(moves, par) {
  if (moves <= par) return 3;
  if (moves <= par + Math.max(2, Math.ceil(par * 0.25))) return 2;
  return 1;
}

const OUT_DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [no, setNo] = useState(() => Math.min(loadProgress().unlocked, LEVELS.length));
  const level = LEVELS[no - 1];
  const [state, setState] = useState(() => initState(level));
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [leaving, setLeaving] = useState({}); // 外へ出ていく途中のゼリー：番号 → 向き
  const [showHint, setShowHint] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [dragging, setDragging] = useState(-1); // 持ち上げているゼリーの番号
  const lastMoved = useRef(-1); // 同じゼリーを続けて動かしたときは 1 手として数える
  const [cell, setCell] = useState(40);
  const stageRef = useRef(null);
  const drag = useRef(null);

  const startLevel = useCallback((n) => {
    setNo(n);
    setState(initState(LEVELS[n - 1]));
    setHistory([]);
    setMoves(0);
    setLeaving({});
    setCleared(false);
    drag.current = null;
    lastMoved.current = -1;
  }, []);

  // 盤面を画面に収まる大きさにする（ページはスクロールさせない）
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      // ふちの厚さ ≒ 0.55 マス × 2、出口のはみ出し ≒ 0.35 マス × 2
      const c = Math.floor(Math.min(r.width / (level.w + 1.8), r.height / (level.h + 1.8), 72));
      setCell(Math.max(c, 20));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [level.w, level.h]);

  const finishMove = useCallback(
    (i, before, after, moved) => {
      if (!moved) return;
      // 同じゼリーを続けて動かしたときは、ひと続きの 1 手として数える（戻すときもまとめて戻る）
      const cont = lastMoved.current === i;
      lastMoved.current = i;
      if (!cont) {
        setHistory((h) => [...h, before]);
        setMoves((m) => m + 1);
      }
      if (isCleared(after)) {
        const total = moves + (cont ? 0 : 1);
        setTimeout(() => setCleared(true), 380);
        setProgress((p) => {
          const best = { ...p.best };
          if (!best[no] || total < best[no]) best[no] = total;
          const np = { unlocked: Math.max(p.unlocked, Math.min(no + 1, LEVELS.length)), best };
          saveProgress(np);
          return np;
        });
      }
    },
    [moves, no]
  );

  const onPointerDown = (e, i) => {
    if (cleared || state[i].out || leaving[i]) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = {
      i,
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      bx: state[i].x,
      by: state[i].y,
      before: state,
      cur: state,
    };
    setDragging(i);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const tx = d.bx + (e.clientX - d.sx) / cell;
    const ty = d.by + (e.clientY - d.sy) / cell;
    const r = dragToward(level, d.cur, d.i, tx, ty);
    if (r.exit) {
      const next = d.cur.map((p, j) => (j === d.i ? { ...p, x: r.x, y: r.y, out: true } : p));
      const i = d.i;
      drag.current = null;
      setDragging(-1);
      setLeaving((l) => ({ ...l, [i]: r.exit }));
      setState(next);
      finishMove(i, d.before, next, true);
      return;
    }
    const p = d.cur[d.i];
    if (r.x !== p.x || r.y !== p.y) {
      d.cur = d.cur.map((q, j) => (j === d.i ? { ...q, x: r.x, y: r.y } : q));
      setState(d.cur);
    }
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(-1);
    const p = d.cur[d.i];
    finishMove(d.i, d.before, d.cur, p.x !== d.bx || p.y !== d.by);
  };

  const undo = () => {
    if (!history.length || cleared) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    lastMoved.current = -1;
    setState(prev);
    setMoves((m) => m - 1);
    setLeaving((l) => {
      const n = { ...l };
      prev.forEach((p, i) => {
        if (!p.out) delete n[i];
      });
      return n;
    });
  };

  const rim = Math.round(cell * 0.55);
  const boardW = level.w * cell;
  const boardH = level.h * cell;
  const best = progress.best[no];
  const left = state.filter((p) => !p.out).length;

  return (
    <div className="jelly-app">
      <header className="top">
        <div className="title-row">
          <h1>ゼリーだっしゅつ</h1>
          <a className="back" href="../">
            ハノイの塔へ
          </a>
        </div>
        <div className="bar">
          <div className="stage-nav">
            <button aria-label="前のステージ" disabled={no <= 1} onClick={() => startLevel(no - 1)}>
              ◀
            </button>
            <span className="stage-no">
              ステージ <b>{no}</b>
              <small>/{LEVELS.length}</small>
            </span>
            <button
              aria-label="次のステージ"
              disabled={no >= Math.min(progress.unlocked, LEVELS.length)}
              onClick={() => startLevel(no + 1)}
            >
              ▶
            </button>
          </div>
          <div className="stat">
            <span>手数</span>
            <b>{moves}</b>
          </div>
          <div className="stat">
            <span>目標</span>
            <b>{level.par}</b>
          </div>
          <button className="icon" onClick={undo} disabled={!history.length || cleared} aria-label="1手戻す">
            ↶
          </button>
          <button className="icon" onClick={() => startLevel(no)} aria-label="最初から">
            ⟲
          </button>
          <button
            className={`icon${showHint ? " on" : ""}`}
            onClick={() => setShowHint((v) => !v)}
            aria-label="遊び方"
          >
            ?
          </button>
        </div>
        <p className={`hint${showHint ? " show" : ""}`}>{HINT}</p>
      </header>

      <main className="stage" ref={stageRef}>
        <div
          className="tray"
          style={{
            width: boardW + rim * 2,
            height: boardH + rim * 2,
            "--rim": `${rim}px`,
            "--cell": `${cell}px`,
          }}
        >
          {level.exits.map((ex, k) => (
            <Exit key={k} ex={ex} cell={cell} rim={rim} />
          ))}
          <div className="plate" style={{ left: rim, top: rim, width: boardW, height: boardH }}>
            {level.blocks.map((b, i) => {
              const p = state[i];
              const out = p.out;
              const dir = leaving[i];
              if (out && !dir) return null;
              let x = p.x * cell;
              let y = p.y * cell;
              if (out && dir) {
                const [dx, dy] = OUT_DIR[dir];
                x += dx * (b.w * cell + rim * 2);
                y += dy * (b.h * cell + rim * 2);
              }
              return (
                <Jelly
                  key={i}
                  b={b}
                  cell={cell}
                  x={x}
                  y={y}
                  out={out}
                  lifted={dragging === i}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              );
            })}
          </div>
        </div>
        <div className="left-count">のこり {left} こ</div>
      </main>

      {cleared && (
        <div className="overlay">
          <div className="card">
            <div className="stars">
              {[1, 2, 3].map((s) => (
                <span key={s} className={s <= starsFor(moves, level.par) ? "on" : ""}>
                  ★
                </span>
              ))}
            </div>
            <h2>クリア！</h2>
            <p>
              {moves} 手（目標 {level.par} 手）
              {best ? <><br />自己ベスト {Math.min(best, moves)} 手</> : null}
            </p>
            <div className="card-buttons">
              <button onClick={() => startLevel(no)}>もう一度</button>
              {no < LEVELS.length ? (
                <button className="primary" onClick={() => startLevel(no + 1)}>
                  次のステージ
                </button>
              ) : (
                <button className="primary" onClick={() => startLevel(1)}>
                  全ステージクリア！ 最初から
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Jelly({ b, cell, x, y, out, lifted, ...handlers }) {
  const col = COLORS[b.c];
  const pad = Math.max(2, Math.round(cell * 0.06));
  const w = b.w * cell - pad * 2;
  const h = b.h * cell - pad * 2;
  const eye = Math.max(3, Math.round(cell * 0.09));
  return (
    <div
      className={`jelly${lifted ? " lifted" : ""}${out ? " out" : ""}`}
      style={{
        width: w,
        height: h,
        transform: `translate(${x + pad}px, ${y + pad}px)`,
        "--base": col.base,
        "--light": col.light,
        "--dark": col.dark,
        "--r": `${Math.round(cell * 0.28)}px`,
      }}
      aria-label={`${col.name}のゼリー ${b.w}×${b.h}${b.axis === "h" ? " 横だけ" : b.axis === "v" ? " 縦だけ" : ""}`}
      {...handlers}
    >
      <span className="shine" />
      <span className="face" style={{ "--eye": `${eye}px` }}>
        <i />
        <i />
      </span>
      {b.axis && <span className={`rail ${b.axis}`}>{b.axis === "h" ? "⇆" : "⇅"}</span>}
    </div>
  );
}

function Exit({ ex, cell, rim }) {
  const col = COLORS[ex.c];
  const horiz = ex.side === "top" || ex.side === "bottom";
  const len = ex.len * cell;
  const style = { "--base": col.base, "--light": col.light, "--dark": col.dark };
  const arrow = { top: "▲", bottom: "▼", left: "◀", right: "▶" }[ex.side];
  if (horiz) {
    style.left = rim + ex.at * cell;
    style.width = len;
    style.height = rim;
    if (ex.side === "top") style.top = 0;
    else style.bottom = 0;
  } else {
    style.top = rim + ex.at * cell;
    style.height = len;
    style.width = rim;
    if (ex.side === "left") style.left = 0;
    else style.right = 0;
  }
  return (
    <div className={`exit ${ex.side}`} style={style}>
      <span>{arrow}</span>
    </div>
  );
}
