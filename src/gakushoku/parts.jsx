import { useEffect, useRef } from "react";
import { fmtTime } from "./useGame.js";
import { sfx } from "./sound.js";

export function TopBar({ mode, left, score, onPause }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onPause} aria-label="一時停止">
        ⏸
      </button>
      <span className="mode-tag">{mode}</span>
      <span className={`clock${left < 15000 ? " hurry" : ""}`}>⏱ {fmtTime(left)}</span>
      <span className="score">
        {score}
        <small>点</small>
      </span>
    </header>
  );
}

// 残り時間のバー：ratio 1 → 0
export function TimeBar({ ratio }) {
  const r = Math.max(0, Math.min(1, ratio));
  const tone = r > 0.5 ? "ok" : r > 0.25 ? "warn" : "danger";
  return (
    <span className={`timebar ${tone}`}>
      <span style={{ width: `${r * 100}%` }} />
    </span>
  );
}

export function Toast({ toast }) {
  return (
    <div className="toast-line" aria-live="polite">
      {toast && (
        <span key={toast.key} className={`toast ${toast.kind}`}>
          {toast.text}
        </span>
      )}
    </div>
  );
}

export function PauseOverlay({ onResume, onExit }) {
  return (
    <div className="overlay">
      <div className="dialog">
        <h2>休けい中</h2>
        <button className="primary" onClick={onResume}>
          再開する
        </button>
        <button className="ghost" onClick={onExit}>
          メニューにもどる
        </button>
      </div>
    </div>
  );
}

export function ResultOverlay({ title, score, stars, stats, onReport, onRetry, onExit }) {
  // 結果は 1 回だけ記録する
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    onReport();
    sfx.end();
  }, [onReport]);
  return (
    <div className="overlay">
      <div className="dialog">
        <h2>{title}</h2>
        <p className="stars" aria-label={`星 ${stars}`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < stars ? "on" : ""}>
              ★
            </span>
          ))}
        </p>
        <p className="result-score">
          {score}
          <small>点</small>
        </p>
        <dl className="stats">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <button className="primary" onClick={onRetry}>
          もう一度
        </button>
        <button className="ghost" onClick={onExit}>
          メニューにもどる
        </button>
      </div>
    </div>
  );
}
