import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Cat, CAT_COLORS } from "./Cat.jsx";
import {
  applyMove,
  createLevel,
  frontRun,
  hasAnyMove,
  isShelfComplete,
  isSolved,
  movableCount,
} from "./logic.js";
import { SHELF_PAD_X, fitCatWidth } from "./layout.js";
import { buildShareSvg, shareResult, svgToPngBlob } from "./share.js";

const HINT = "真ん中の通路側が先頭です。棚をタップして先頭のねこを持ち上げ、同じ色のねこが先頭にいる棚か、空いている棚をタップします。";

// 進み具合と自己ベストはブラウザの localStorage に保存する
function load(key) {
  try {
    const v = parseInt(localStorage.getItem(key) || "", 10);
    return Number.isFinite(v) ? v : null;
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
const bestKey = (level) => `neko-best-${level}`;


function startState(level) {
  const { shelves, cap } = createLevel(level);
  return { level, cap, shelves, history: [], moved: new Set(), revealed: new Set() };
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => load("neko-unlocked") || 1);
  // 説明文の表示（初期値はオフ。選んだ設定は localStorage に残す）
  const [showHelp, setShowHelp] = useState(() => load("neko-help") === 1);
  const toggleHelp = () => {
    setShowHelp((v) => {
      save("neko-help", v ? 0 : 1);
      return !v;
    });
  };
  const [game, setGame] = useState(() => startState(load("neko-level") || 1));
  const [selected, setSelected] = useState(null);
  const [shake, setShake] = useState(null);
  const [best, setBest] = useState(() => load(bestKey(game.level)));

  const { level, cap, shelves, history } = game;

  // 盤面を画面に収める：画面の大きさや段数が変わるたびに、ねこの大きさを計算し直す
  const boardRef = useRef(null);
  const [colW, setColW] = useState(null);
  const rows = Math.ceil(shelves.length / 2);
  useLayoutEffect(() => {
    const fit = () => {
      const el = boardRef.current;
      if (!el) return;
      const app = el.parentElement;
      const appStyle = getComputedStyle(app);
      const width = app.clientWidth - parseFloat(appStyle.paddingLeft) - parseFloat(appStyle.paddingRight);
      const bottom = app.getBoundingClientRect().bottom - parseFloat(appStyle.paddingBottom);
      const height = bottom - el.getBoundingClientRect().top;
      const aisle = parseFloat(getComputedStyle(el).columnGap) || 26;
      const catW = fitCatWidth({ width, height, aisle, rows, cap });
      setColW(catW * cap + SHELF_PAD_X);
    };
    fit();
    document.fonts?.ready.then(fit); // 見出しのフォントが読み込まれると上の欄の高さが変わる
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [rows, cap, showHelp]);
  const moves = history.length;
  const won = isSolved(shelves, cap);
  const stuck = !won && !hasAnyMove(shelves, cap);

  const goLevel = useCallback((lv) => {
    setGame(startState(lv));
    setSelected(null);
    setBest(load(bestKey(lv)));
    save("neko-level", lv);
  }, []);

  // クリアしたら共有用の画像を先に作っておく（共有ボタンを押した瞬間に共有シートを開けるように）
  const [shareImg, setShareImg] = useState(null); // { file, url }
  useEffect(() => {
    if (!won || !boardRef.current) return;
    let url = null;
    let alive = true;
    const svg = buildShareSvg({ boardEl: boardRef.current, cap, level, moves });
    svgToPngBlob(svg)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setShareImg({ file: new File([blob], `nekodana-lv${level}.png`, { type: "image/png" }), url });
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
      setShareImg(null);
    };
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  // クリアしたら自己ベストと次のレベルを記録
  useEffect(() => {
    if (!won) return;
    const prev = load(bestKey(level));
    if (prev === null || moves < prev) {
      save(bestKey(level), moves);
      setBest(moves);
    }
    if (unlocked < level + 1) {
      setUnlocked(level + 1);
      save("neko-unlocked", level + 1);
    }
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapShelf = (i) => {
    if (won) return;
    if (selected === null) {
      if (shelves[i].length === 0 || isShelfComplete(shelves[i], cap)) return;
      setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    const next = applyMove(shelves, cap, selected, i);
    if (next) {
      const n = movableCount(shelves, cap, selected, i);
      const moved = new Set(shelves[selected].slice(-n).map((c) => c.id));
      const revealed = new Set();
      next.forEach((s, k) => {
        const f = s[s.length - 1];
        const before = shelves[k][s.length - 1];
        if (f && before && before.id === f.id && before.hidden && !f.hidden) revealed.add(f.id);
      });
      setGame({ ...game, shelves: next, history: [...history, shelves], moved, revealed });
      setSelected(null);
    } else if (shelves[i].length > 0 && !isShelfComplete(shelves[i], cap)) {
      setSelected(i); // 置けない棚をタップしたら、そちらを選び直す
    } else {
      setShake(i);
      setTimeout(() => setShake(null), 400);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    setGame({
      ...game,
      shelves: history[history.length - 1],
      history: history.slice(0, -1),
      moved: new Set(),
      revealed: new Set(),
    });
    setSelected(null);
  };

  const targets = useMemo(() => {
    if (selected === null) return new Set();
    const t = new Set();
    shelves.forEach((_, j) => {
      if (movableCount(shelves, cap, selected, j) > 0) t.add(j);
    });
    return t;
  }, [selected, shelves, cap]);

  const message = won
    ? `ぜんぶ仕分けできました！ ${moves} 手`
    : stuck
      ? "もう動かせるねこがいません。「1手戻す」か「やり直し」をどうぞ。"
      : selected !== null
        ? targets.size > 0
          ? "光っている棚に置けます。"
          : "置ける棚がありません。別の棚を選んでください。"
        : HINT;

  return (
    <div className="neko-app">
      <header className="neko-header">
        {/* タイトル行：右にベストと説明の切り替えを小さく置く */}
        <div className="title-row">
          <h1>ねこだな</h1>
          <span className="best">
            ベスト <b>{best ?? "–"}</b>
          </span>
          <button className="help-toggle" onClick={toggleHelp} aria-pressed={showHelp}>
            説明 {showHelp ? "オン" : "オフ"}
          </button>
          <a href="../">ハノイの塔 ›</a>
        </div>
        {/* 操作行：レベル・手数・1手戻す・やり直しを 1 行に */}
        <div className="bar">
          <div className="level-picker">
            <button aria-label="前のレベル" disabled={level <= 1} onClick={() => goLevel(level - 1)}>
              ‹
            </button>
            <span>
              Lv<b>{level}</b>
            </span>
            <button aria-label="次のレベル" disabled={level >= unlocked} onClick={() => goLevel(level + 1)}>
              ›
            </button>
          </div>
          <span className="moves">
            手数<b>{moves}</b>
          </span>
          <button className={`act${stuck ? " nudge" : ""}`} onClick={undo} disabled={moves === 0 || won}>
            1手戻す
          </button>
          <button className={`act${stuck ? " nudge" : ""}`} onClick={() => goLevel(level)} disabled={moves === 0}>
            やり直し
          </button>
        </div>
        {/* オフのときも読み上げ用には残し、画面からは消す（棚の位置も詰まる） */}
        <p className={`message${stuck ? " warn" : ""}${showHelp ? "" : " sr-only"}`} role="status">
          {message}
        </p>
      </header>

      <main ref={boardRef} className="shelves" style={{ "--cap": cap, ...(colW && { "--col-w": `${colW}px` }) }}>
        <div className="aisle" aria-hidden="true" />
        {shelves.map((shelf, i) => {
          const complete = isShelfComplete(shelf, cap);
          const run = selected === i ? frontRun(shelf) : 0;
          const label =
            shelf.length === 0
              ? `棚${i + 1}：空き`
              : `棚${i + 1}：` +
                shelf.map((c) => (c.hidden ? "？" : CAT_COLORS[c.color].name)).join("、") +
                `（先頭は${CAT_COLORS[shelf[shelf.length - 1].color].name}）`;
          return (
            <button
              key={i}
              className={[
                "shelf",
                i % 2 === 0 ? "left" : "right",
                selected === i && "selected",
                targets.has(i) && "target",
                complete && "complete",
                shake === i && "shake",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => tapShelf(i)}
              aria-label={label}
              aria-pressed={selected === i}
            >
              <div className="row">
                {shelf.map((c, k) => (
                  <div
                    key={c.id}
                    className={[
                      "cat",
                      k >= shelf.length - run && "lifted",
                      game.moved.has(c.id) && "arrive",
                      game.revealed.has(c.id) && "reveal",
                      k === shelf.length - 1 && "is-front",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Cat color={c.color} hidden={c.hidden} happy={complete || won} flip={i % 2 === 1} />
                  </div>
                ))}
              </div>
              <div className="plank">
                <span className="front-tip" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </main>

      {won && (
        <div className="win" role="dialog" aria-label="クリア">
          <div className="win-card">
            <p className="win-title">レベル {level} クリア！</p>
            <p>
              {moves} 手{best === moves ? "（自己ベスト）" : ""}
            </p>
            {shareImg ? (
              <img className="share-preview" src={shareImg.url} alt={`レベル${level}の完成した棚`} />
            ) : (
              <div className="win-cats" aria-hidden="true">
                {[0, 2, 7].map((c) => (
                  <div key={c} className="cat">
                    <Cat color={c} happy />
                  </div>
                ))}
              </div>
            )}
            <button className="line" onClick={() => shareResult({ file: shareImg?.file, level, moves })}>
              LINEで送る
            </button>
            <button className="primary" onClick={() => goLevel(level + 1)}>
              次のレベルへ
            </button>
            <button onClick={() => goLevel(level)}>もう一度</button>
          </div>
        </div>
      )}
    </div>
  );
}
