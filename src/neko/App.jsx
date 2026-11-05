import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Cat, CAT_COLORS } from "./Cat.jsx";
import {
  applyMove,
  createStage,
  stageInfo,
  stageNo,
  normalizeNo,
  prevStage,
  nextStage,
  isUnlocked,
  afterClear,
  endlessOpen,
  endlessCleared,
  unlockAll,
  endlessNo,
  ENDLESS_FIRST,
  ENDLESS_LEVEL,
  LEVELS,
  STAGES_PER_LEVEL,
  TOTAL_STAGES,
  dailyNo,
  dailyStreak,
  isDaily,
  starsFor,
  starText,
  frontRun,
  hasAnyMove,
  isShelfComplete,
  isSolved,
  movableCount,
} from "./logic.js";
import { SHELF_PAD_X, fitCatWidth } from "./layout.js";
import { buildShareSvg, shareResult, svgToPngBlob } from "./share.js";
import { setSoundEnabled, sfx, unlockAudio } from "./sound.js";

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
const LAST_REGULAR = stageNo(ENDLESS_LEVEL, STAGES_PER_LEVEL); // 上級 12：クリアするとエンドレスと超上級が開く
const bestKey = (no) => `neko-best-s${no}`; // ステージ（通し番号）ごとの自己ベスト
const starKey = (no) => `neko-star-s${no}`; // ステージごとの★の最高

// そのステージの★（まだクリアしていなければ 0）。★を記録する前のベストは、その手数から★を出して保存する
function starsOf(no) {
  const saved = load(starKey(no));
  if (saved !== null) return saved;
  const best = load(bestKey(no));
  if (best === null) return 0;
  const stars = starsFor(best, createStage(no).targets);
  save(starKey(no), stars);
  return stars;
}
const lastStage = () => normalizeNo(load("neko-stage") || 1); // いつものステージ（今日の1問に入る前のステージ）
const todayStreak = () => dailyStreak((d) => load(bestKey(d)) !== null);

function Stars({ n, className = "" }) {
  return (
    <span className={`stars ${className}`} aria-label={`星 ${n} つ`}>
      {[1, 2, 3].map((k) => (
        <span key={k} className={k <= n ? "on" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}

function startState(no) {
  const { shelves, cap, targets: goal } = createStage(no);
  return { no, cap, shelves, goal, history: [], moved: new Set(), revealed: new Set() };
}

export default function App() {
  // 進み具合：通常ステージは遊べる最後の通し番号、エンドレスは遊べる最後のステージ（上級 13〜）
  const [progress, setProgress] = useState(() => ({
    unlocked: Math.min(load("neko-stage-unlocked") || load("neko-unlocked") || 1, TOTAL_STAGES), // 以前の「レベル」の進み具合を引き継ぐ
    endless: Math.max(load("neko-endless") || ENDLESS_FIRST, ENDLESS_FIRST),
  }));
  // 説明文の表示（初期値はオフ。選んだ設定は localStorage に残す）
  const [showHelp, setShowHelp] = useState(() => load("neko-help") === 1);
  const toggleHelp = () => {
    setShowHelp((v) => {
      save("neko-help", v ? 0 : 1);
      return !v;
    });
  };
  // 効果音（初期値はオン。選んだ設定は localStorage に残す）
  const [soundOn, setSoundOn] = useState(() => load("neko-sound") !== 0);
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);
  const toggleSound = () => {
    setSoundOn((v) => {
      save("neko-sound", v ? 0 : 1);
      return !v;
    });
  };
  // iPhone では、画面に触れたときに音を鳴らせる状態にする
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio, true);
    return () => window.removeEventListener("pointerdown", unlockAudio, true);
  }, []);
  const [game, setGame] = useState(() => startState(normalizeNo(load("neko-stage") || 1)));
  const [selected, setSelected] = useState(null);
  const [shake, setShake] = useState(null);
  const [best, setBest] = useState(() => load(bestKey(game.no)));

  const { no, cap, shelves, history, goal } = game;
  const info = stageInfo(no);
  const prev = prevStage(no);
  const next = nextStage(no);
  const [picking, setPicking] = useState(false); // ステージ選択画面
  const [openedNow, setOpenedNow] = useState(false); // いまエンドレスと超上級が開いた

  // 隠し要素：タイトル「ねこだな」を素早く 7 回タップすると、超上級 12 まで全ステージが開く
  const [toast, setToast] = useState(null);
  const secretTaps = useRef({ n: 0, t: 0 });
  const tapTitle = () => {
    const now = Date.now();
    const s = secretTaps.current;
    s.n = now - s.t < 600 ? s.n + 1 : 1;
    s.t = now;
    if (s.n < 7) return;
    s.n = 0;
    const next = unlockAll(progress);
    save("neko-stage-unlocked", next.unlocked);
    save("neko-endless", next.endless);
    setProgress(next);
    sfx.win();
    setToast("ひみつ発見！超上級12まで全ステージとエンドレスを開放しました");
    setTimeout(() => setToast(null), 3500);
  };

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
  const stars = starsFor(moves, goal);
  const today = dailyNo();
  const dailyDone = load(bestKey(today)) !== null || (won && no === today);
  const stuck = !won && !hasAnyMove(shelves, cap);

  const goStage = useCallback((lv) => {
    setGame(startState(lv));
    setSelected(null);
    setOpenedNow(false);
    setBest(load(bestKey(lv)));
    if (!isDaily(lv)) save("neko-stage", lv); // 今日の1問は「いつものステージ」として覚えない
  }, []);

  // クリアしたら共有用の画像を先に作っておく（共有ボタンを押した瞬間に共有シートを開けるように）
  const [shareImg, setShareImg] = useState(null); // { file, url }
  useEffect(() => {
    if (!won || !boardRef.current) return;
    let url = null;
    let alive = true;
    const svg = buildShareSvg({ boardEl: boardRef.current, cap, label: info.label, moves, stars: starText(stars) });
    svgToPngBlob(svg)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setShareImg({ file: new File([blob], `nekodana-${no}.png`, { type: "image/png" }), url });
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
      setShareImg(null);
    };
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  // クリアしたら自己ベストと次のステージを記録
  useEffect(() => {
    if (!won) return;
    const prev = load(bestKey(no));
    if (prev === null || moves < prev) {
      save(bestKey(no), moves);
      setBest(moves);
    }
    if (stars > starsOf(no)) save(starKey(no), stars);
    const next = afterClear(no, progress);
    if (!endlessOpen(progress) && endlessOpen(next)) setOpenedNow(true);
    if (next.unlocked !== progress.unlocked) save("neko-stage-unlocked", next.unlocked);
    if (next.endless !== progress.endless) save("neko-endless", next.endless);
    setProgress(next);
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapShelf = (i) => {
    if (won) return;
    if (selected === null) {
      if (shelves[i].length === 0 || isShelfComplete(shelves[i], cap)) return;
      setSelected(i);
      sfx.pick();
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
      sfx.drop(shelves[selected][shelves[selected].length - 1].color);
      if (revealed.size > 0) sfx.reveal();
      if (isSolved(next, cap)) sfx.win();
      else if (isShelfComplete(next[i], cap)) sfx.complete();
    } else if (shelves[i].length > 0 && !isShelfComplete(shelves[i], cap)) {
      setSelected(i); // 置けない棚をタップしたら、そちらを選び直す
      sfx.pick();
    } else {
      sfx.nope();
      setShake(i);
      setTimeout(() => setShake(null), 400);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    sfx.undo();
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
        : `${HINT}${goal ? `★3 は ${goal.three} 手以内。` : ""}`;

  return (
    <div className="neko-app">
      <header className="neko-header">
        {/* タイトル行：右にベストと説明の切り替えを小さく置く */}
        <div className="title-row">
          <h1 onClick={tapTitle}>ねこだな</h1>
          <span className="best">
            ベスト <b>{best ?? "–"}</b>
          </span>
          {/* オン／オフは枠の光り方で示す（狭い画面でも 1 行に収めるため文字は短く） */}
          <button className="help-toggle" onClick={toggleHelp} aria-pressed={showHelp} aria-label={`説明 ${showHelp ? "オン" : "オフ"}`}>
            説明
          </button>
          <button className="help-toggle" onClick={toggleSound} aria-pressed={soundOn} aria-label={`音 ${soundOn ? "オン" : "オフ"}`}>
            {soundOn ? "♪ 音" : "音 ✕"}
          </button>
          <a href="../">ハノイ ›</a>
        </div>
        {/* 操作行：レベル・手数・1手戻す・やり直しを 1 行に */}
        <div className="bar">
          <div className="level-picker">
            <button aria-label="前のステージ" disabled={prev === null} onClick={() => goStage(prev)}>
              ‹
            </button>
            <button
              className={["stage-name", info.endless && "endless", !dailyDone && !info.daily && "has-daily"].filter(Boolean).join(" ")}
              onClick={() => setPicking(true)}
              aria-label={`${info.label}（ステージを選ぶ${dailyDone ? "" : "。今日の1問がまだです"}）`}
            >
              {info.barName}
              <b>{info.stage}</b>
            </button>
            <button aria-label="次のステージ" disabled={next === null || !isUnlocked(next, progress)} onClick={() => goStage(next)}>
              ›
            </button>
          </div>
          <span className="moves">
            手数<b>{moves}</b>
          </span>
          <button className={`act${stuck ? " nudge" : ""}`} onClick={undo} disabled={moves === 0 || won}>
            1手戻す
          </button>
          <button className={`act${stuck ? " nudge" : ""}`} onClick={() => goStage(no)} disabled={moves === 0}>
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

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {picking && (
        <StagePicker
          current={no}
          progress={progress}
          today={today}
          onPick={(n) => {
            setPicking(false);
            goStage(n);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {won && !picking && (
        <div className="win" role="dialog" aria-label="クリア">
          <div className="win-card">
            <p className="win-sub">
              {info.daily ? `${info.levelName}（${info.weekday}）` : info.endless ? `${info.levelName}・エンドレス` : info.levelName}
            </p>
            <p className="win-title">
              {info.daily ? `${info.stage} クリア！` : no === TOTAL_STAGES ? "全ステージクリア！" : `ステージ ${info.stage} クリア！`}
            </p>
            <Stars n={stars} className="big" />
            <p>
              {moves} 手{best === moves ? "（自己ベスト）" : ""}
              {goal && stars < 3 && <span className="win-target">★3 は {goal.three} 手以内</span>}
              {info.endless && <><br />エンドレス {info.stage - STAGES_PER_LEVEL} 回目クリア</>}
            </p>
            {info.daily && <p className="win-news">今日の1問 {todayStreak()} 日連続</p>}
            {openedNow && <p className="win-news">エンドレスと超上級が遊べるようになりました！</p>}
            {shareImg ? (
              <img className="share-preview" src={shareImg.url} alt={`${info.label}の完成した棚`} />
            ) : (
              <div className="win-cats" aria-hidden="true">
                {[0, 2, 7].map((c) => (
                  <div key={c} className="cat">
                    <Cat color={c} happy />
                  </div>
                ))}
              </div>
            )}
            <button
              className="line"
              onClick={() =>
                shareResult({ file: shareImg?.file, label: info.label, moves, stars: starText(stars), streak: info.daily ? todayStreak() : 0 })
              }
            >
              LINEで送る
            </button>
            {next !== null && (
              <button className="primary" onClick={() => goStage(next)}>
                {info.endless
                  ? `次へ（${info.levelName}${info.stage + 1}）`
                  : no === LAST_REGULAR
                  ? `エンドレスへ（${info.levelName}${ENDLESS_FIRST}）`
                  : info.stage === STAGES_PER_LEVEL
                    ? `${LEVELS[info.levelIndex + 1].name}へ進む`
                    : "次のステージへ"}
              </button>
            )}
            {info.daily && (
              <button className="primary" onClick={() => goStage(lastStage())}>
                いつものステージへ
              </button>
            )}
            {no === LAST_REGULAR && (
              <button className="primary alt" onClick={() => goStage(stageNo(ENDLESS_LEVEL + 1, 1))}>
                {LEVELS[ENDLESS_LEVEL + 1].name}へ進む
              </button>
            )}
            <button onClick={() => setPicking(true)}>ステージを選ぶ</button>
            <button onClick={() => goStage(no)}>もう一度</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ステージ選択：レベルのタブと 12 ステージのボタン。上級のタブには、上級 12 のクリア後にエンドレスの入り口が出る
function StagePicker({ current, progress, today, onPick, onClose }) {
  const [tab, setTab] = useState(() => stageInfo(isDaily(current) ? lastStage() : current).levelIndex);
  const todayInfo = stageInfo(today);
  const todayBest = load(bestKey(today));
  const streak = todayStreak();
  const open = endlessOpen(progress);
  const cleared = endlessCleared(progress);
  return (
    <div className="win" role="dialog" aria-label="ステージを選ぶ" onClick={onClose}>
      <div className="win-card picker" onClick={(e) => e.stopPropagation()}>
        <p className="win-title">ステージを選ぶ</p>
        {/* 今日の1問：日付で決まる 1 日 1 問。曜日で難しさが変わる */}
        <button className={`daily-entry${current === today ? " current" : ""}${todayBest === null ? " fresh" : ""}`} onClick={() => onPick(today)}>
          <span>
            📅 今日の1問　<b>{todayInfo.stage}（{todayInfo.weekday}）</b>
          </span>
          <span className="sub">
            {todayBest !== null ? (
              <>
                <Stars n={starsOf(today)} /> {todayBest}手
              </>
            ) : (
              "まだ解いていません"
            )}
            {streak > 0 && `・${streak} 日連続`}
          </span>
        </button>
        <div className="tabs" role="tablist">
          {LEVELS.map((lv, i) => (
            <button key={lv.name} role="tab" aria-selected={tab === i} disabled={!isUnlocked(stageNo(i, 1), progress)} onClick={() => setTab(i)}>
              {lv.name}
            </button>
          ))}
        </div>
        <div className="stage-grid">
          {Array.from({ length: STAGES_PER_LEVEL }, (_, k) => {
            const n = stageNo(tab, k + 1);
            const best = load(bestKey(n));
            const locked = !isUnlocked(n, progress);
            const st = best !== null ? starsOf(n) : 0;
            return (
              <button
                key={n}
                className={[n === current && "current", best !== null && "cleared"].filter(Boolean).join(" ")}
                disabled={locked}
                onClick={() => onPick(n)}
                aria-label={`${stageInfo(n).label}${locked ? "（まだ遊べません）" : best !== null ? `（星 ${st} つ、ベスト ${best} 手）` : ""}`}
              >
                <span className="num">{k + 1}</span>
                <span className="sub">{locked ? "🔒" : best !== null ? <Stars n={st} /> : ""}</span>
              </button>
            );
          })}
        </div>
        {tab === ENDLESS_LEVEL && (
          <button
            className={`endless-entry${stageInfo(current).endless ? " current" : ""}`}
            disabled={!open}
            onClick={() => onPick(endlessNo(progress.endless))}
          >
            {open ? (
              <>
                <span>
                  ∞ エンドレス　<b>ステージ{progress.endless}</b>から
                </span>
                <span className="sub">{cleared > 0 ? `${cleared} 回クリア` : "上級12 の続き"}</span>
              </>
            ) : (
              <span>🔒 エンドレス（上級12 をクリアで開放）</span>
            )}
          </button>
        )}
        <button onClick={onClose}>とじる</button>
      </div>
    </div>
  );
}
