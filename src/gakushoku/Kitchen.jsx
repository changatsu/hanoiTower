import { useCallback } from "react";
import {
  INGREDIENTS,
  PROCS,
  RECIPES,
  KITCHEN_DURATION,
  BURN_AFTER,
  newKitchen,
  kitchenTick,
  kitchenPalette,
  takeTicket,
  selectBoard,
  clearBoard,
  addIngredient,
  applyProc,
  boardDish,
  ticketLeft,
  kitchenStars,
} from "./kitchen.js";
import { useGame, fmtTime } from "./useGame.js";
import { TopBar, PauseOverlay, ResultOverlay, Toast, TimeBar } from "./parts.jsx";

export default function Kitchen({ level, onExit, onFinish }) {
  const init = useCallback(() => newKitchen(level), [level]);
  const tick = useCallback((s, dt) => kitchenTick(s, dt), []);
  const { state: s, act, paused, setPaused, toast, restart } = useGame(init, tick);
  const palette = kitchenPalette(level);
  const sel = s.boards[s.sel];
  const selDish = boardDish(s, sel);
  const curStep = selDish ? RECIPES[selDish].steps[sel.step] : null;

  return (
    <div className="screen kitchen">
      <TopBar
        mode="キッチン"
        left={KITCHEN_DURATION - s.t}
        score={s.score}
        onPause={() => setPaused(true)}
      />

      <section className="tickets" aria-label="注文票">
        {s.tickets.length === 0 && <p className="placeholder">注文を待っています…</p>}
        {s.tickets.map((tk) => {
          const r = RECIPES[tk.dish];
          const left = ticketLeft(s, tk);
          const on = s.boards.findIndex((b) => b.ticket === tk.id);
          return (
            <button
              key={tk.id}
              className={`ticket${on >= 0 ? " on" : ""}${left < 12000 ? " hurry" : ""}`}
              onClick={() => act(takeTicket, tk.id)}
            >
              <span className="ticket-emoji">{r.emoji}</span>
              <span className="ticket-name">{r.name}</span>
              <TimeBar ratio={left / tk.limit} />
              {on >= 0 && <span className="ticket-badge">コンロ{on + 1}</span>}
            </button>
          );
        })}
      </section>

      <section className="boards">
        {s.boards.map((b, i) => (
          <Board key={i} s={s} b={b} i={i} selected={s.sel === i} act={act} />
        ))}
      </section>

      <Toast toast={toast} />

      <section className="palette" aria-label="食材">
        <div className="ing-grid">
          {palette.ings.map((k) => {
            const need = curStep && curStep.ings.includes(k) && !sel.added.includes(k);
            return (
              <button key={k} className={`ing${need ? " need" : ""}`} onClick={() => act(addIngredient, k)}>
                <span className="ing-emoji">{INGREDIENTS[k].emoji}</span>
                <span className="ing-name">{INGREDIENTS[k].name}</span>
              </button>
            );
          })}
        </div>
        <div className="proc-grid">
          {palette.procs.map((k) => (
            <button key={k} className={`proc proc-${k}`} onClick={() => act(applyProc, k)}>
              <span className="proc-icon">{PROCS[k].emoji}</span>
              <span className="proc-name">{PROCS[k].name}</span>
            </button>
          ))}
        </div>
      </section>

      {paused && !s.over && <PauseOverlay onResume={() => setPaused(false)} onExit={onExit} />}
      {s.over && (
        <ResultOverlay
          title="キッチン 営業終了"
          score={s.score}
          stars={kitchenStars(s)}
          stats={[
            ["提供", `${s.served} 品`],
            ["間に合わず", `${s.late} 品`],
            ["焦がした", `${s.burnt} 回`],
            ["手順ミス", `${s.misses} 回`],
          ]}
          onReport={() => onFinish(s.score)}
          onRetry={restart}
          onExit={onExit}
        />
      )}
    </div>
  );
}

// 鍋の中の食材の置き場所（鍋の中心からの % 位置）
const SPOTS = [
  [0, 0], [-22, -14], [22, 14], [20, -20], [-20, 20], [0, -28], [0, 28], [-30, 2], [30, -2],
];
// 今の工程に合わせて、コンロに乗る道具を変える
const VESSEL = { cut: "board", fry: "pan", grill: "pan", boil: "pot", deep: "fryer", plate: "plate" };

// 真上から見たコンロ：五徳の上に道具、道具の中に入れた食材
function Stove({ s, b, r, selected }) {
  const step = r ? r.steps[Math.min(b.step, r.steps.length - 1)] : null;
  const vessel = step ? VESSEL[step.proc] : null;
  // 終わった工程の食材 + 今の工程で入れた食材
  const inside = r ? [...r.steps.slice(0, b.step).flatMap((st) => st.ings), ...b.added] : [];
  const cooked = r ? r.steps.slice(0, b.step).some((st) => PROCS[st.proc].dur > 0) : false;
  const heatRatio = b.busy ? (s.t - b.busy.start) / (b.busy.end - b.busy.start) : 0;
  return (
    <div className={`stove${b.busy ? " on" : ""}${b.doneAt != null && !b.busy ? " smoke" : ""}`}>
      <div className="burner">
        <span className="flame" />
        {vessel ? (
          <div className={`vessel vessel-${vessel}${cooked ? " cooked" : ""}`}>
            {inside.map((g, k) => {
              const [x, y] = SPOTS[k % SPOTS.length];
              return (
                <span key={`${g}${k}`} className="food" style={{ left: `${50 + x}%`, top: `${50 + y}%` }}>
                  {INGREDIENTS[g].emoji}
                </span>
              );
            })}
            {b.busy && (
              <svg className="heat-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="47" pathLength="100" strokeDasharray={`${heatRatio * 100} 100`} />
              </svg>
            )}
          </div>
        ) : (
          <span className="stove-empty">{selected ? "注文票を\nタップ" : "空き"}</span>
        )}
      </div>
    </div>
  );
}

function Board({ s, b, i, selected, act }) {
  const dish = boardDish(s, b);
  const r = dish ? RECIPES[dish] : null;
  return (
    <div
      className={`board${selected ? " selected" : ""}${b.busy ? " busy" : ""}`}
      onClick={() => act(selectBoard, i)}
      role="button"
      aria-pressed={selected}
    >
      <div className="board-head">
        <span className="board-no">コンロ{i + 1}</span>
        {r && <span className="board-dish">{r.emoji} {r.name}</span>}
        {r && (
          <button
            className="board-clear"
            aria-label="この料理をやめる"
            onClick={(e) => {
              e.stopPropagation();
              act(clearBoard, i);
            }}
          >
            ✕
          </button>
        )}
      </div>
      <Stove s={s} b={b} r={r} selected={selected} />
      {r && (
        <ol className="steps">
          {r.steps.map((st, j) => {
            const state = j < b.step ? "done" : j === b.step ? "now" : "todo";
            const heating = state === "now" && b.busy;
            return (
              <li key={j} className={`step ${state}`}>
                <span className="step-ings">
                  {st.ings.map((g) => (
                    <span key={g} className={`chip${state === "done" || b.added.includes(g) ? " in" : ""}`} title={INGREDIENTS[g].name}>
                      {INGREDIENTS[g].emoji}
                    </span>
                  ))}
                </span>
                <span className="step-proc">
                  {PROCS[st.proc].emoji}
                  {PROCS[st.proc].name}
                </span>
                {heating && (
                  <span className="heat">
                    <span style={{ width: `${((s.t - b.busy.start) / (b.busy.end - b.busy.start)) * 100}%` }} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {b.doneAt != null && !b.busy && (
        <div className="burn">
          🔥 焦げるまで {fmtTime(BURN_AFTER - (s.t - b.doneAt))}
        </div>
      )}
    </div>
  );
}
