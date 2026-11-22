import { useCallback, useEffect, useState } from "react";
import {
  ITEMS,
  SLOTS,
  SLOT_ORDER,
  TRAY_GRID,
  COUNTER_DURATION,
  newCounter,
  counterTick,
  counterItems,
  stockKey,
  stockName,
  isLow,
  requestOf,
  placeItem,
  removeSlot,
  requestStock,
  serve,
  orderTitle,
  patienceLeft,
  counterStars,
  trayDiff,
} from "./counter.js";
import { useGame, fmtTime } from "./useGame.js";
import { TopBar, PauseOverlay, ResultOverlay, Toast, TimeBar } from "./parts.jsx";

export default function Counter({ level, onExit, onFinish }) {
  const init = useCallback(() => newCounter(level), [level]);
  const tick = useCallback((s, dt) => counterTick(s, dt), []);
  const { state: s, act, paused, setPaused, toast, restart } = useGame(init, tick);
  const items = counterItems(level);
  const front = s.queue[0] || null;

  // 「ちがうよ」のとき、まちがえた置き場所を少しのあいだ赤くする
  const [wrongSlots, setWrongSlots] = useState([]);
  useEffect(() => {
    const w = s.events.find((e) => e.kind === "wrong");
    if (!w) return;
    setWrongSlots(w.slots);
    const id = setTimeout(() => setWrongSlots([]), 1200);
    return () => clearTimeout(id);
  }, [s.events]);

  const ok = front ? new Set(SLOT_ORDER.filter((k) => !trayDiff(s.tray, front.order).includes(k))) : new Set();

  return (
    <div className="screen counter">
      <TopBar mode="カウンター" left={COUNTER_DURATION - s.t} score={s.score} onPause={() => setPaused(true)} />

      <section className="queue" aria-label="ならんでいる学生">
        {s.queue.length === 0 && <p className="placeholder">学生を待っています…</p>}
        {s.queue.map((q, i) => (
          <div key={q.id} className={`student${i === 0 ? " front" : ""}`}>
            <span className="face">{q.face}</span>
            <TimeBar ratio={patienceLeft(s, q) / q.patience} />
          </div>
        ))}
      </section>

      <section className={`slip${front ? "" : " empty"}`} aria-label="注文票">
        {front ? (
          <>
            <h3>{orderTitle(front.order)}</h3>
            <ul>
              {SLOT_ORDER.map((k) => {
                const id = front.order[k];
                return (
                  <li key={k} className={`${id ? "" : "none"}${ok.has(k) ? " ok" : ""}`}>
                    {id ? (
                      <>
                        {ITEMS[id].emoji}
                        {id === "riceL" ? "ごはん大盛り" : ITEMS[id].name}
                      </>
                    ) : (
                      <>{SLOTS[k].name}なし</>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="placeholder">注文票はまだありません</p>
        )}
      </section>

      <section className="tray-wrap">
        <div className="tray" aria-label="トレー">
          {TRAY_GRID.flat().map((k, i) =>
            k ? (
              <button
                key={k}
                className={`slot slot-${k}${s.tray[k] ? " filled" : ""}${wrongSlots.includes(k) ? " wrong" : ""}`}
                onClick={() => act(removeSlot, k)}
                aria-label={s.tray[k] ? `${ITEMS[s.tray[k]].name}を下げる` : SLOTS[k].name}
              >
                {s.tray[k] ? (
                  <>
                    <span className={`dish${ITEMS[s.tray[k]].big ? " big" : ""}`}>{ITEMS[s.tray[k]].emoji}</span>
                    <span className="dish-name">{ITEMS[s.tray[k]].name}</span>
                  </>
                ) : (
                  <span className="slot-name">{SLOTS[k].name}</span>
                )}
              </button>
            ) : (
              <span key={i} className="chopsticks" aria-hidden="true">
                🥢
              </span>
            )
          )}
        </div>
        <button className="serve-btn" disabled={!front} onClick={() => act(serve)}>
          提供する
        </button>
      </section>

      <Toast toast={toast} />

      <section className="shelf" aria-label="カウンターの棚">
        {items.map((id) => {
          const it = ITEMS[id];
          const key = stockKey(id);
          const n = s.stock[key];
          const req = requestOf(s, key);
          const low = isLow(s, key);
          const out = n < (it.use || 1);
          return (
            <div key={id} className={`item slot-${it.slot}${low ? " low" : ""}${out ? " out" : ""}`}>
              <button className="item-main" onClick={() => act(placeItem, id)}>
                <span className={`item-emoji${it.big ? " big" : ""}`}>{it.emoji}</span>
                <span className="item-name">{it.short || it.name}</span>
              </button>
              {req ? (
                <span className="item-stock waiting">⏳{Math.ceil((req.end - s.t) / 1000)}秒</span>
              ) : low ? (
                <button className="item-stock request" onClick={() => act(requestStock, key)}>
                  残{n} 依頼
                </button>
              ) : (
                <span className="item-stock">残{n}</span>
              )}
            </div>
          );
        })}
      </section>

      {s.requests.length > 0 && (
        <p className="requests">
          キッチンで準備中：{s.requests.map((r) => `${stockName(r.key)}（${fmtTime(r.end - s.t)}）`).join("・")}
        </p>
      )}

      {paused && !s.over && <PauseOverlay onResume={() => setPaused(false)} onExit={onExit} />}
      {s.over && (
        <ResultOverlay
          title="カウンター 営業終了"
          score={s.score}
          stars={counterStars(s)}
          stats={[
            ["提供", `${s.served} 人`],
            ["注文ちがい", `${s.wrong} 回`],
            ["帰ってしまった", `${s.left} 人`],
          ]}
          onReport={() => onFinish(s.score)}
          onRetry={restart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
