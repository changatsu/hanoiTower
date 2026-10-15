import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PEG_NAMES, GOAL_PEG } from "./hanoi.js";

const COLORS = ["#c0392b", "#d9771e", "#c9a227", "#5a9a3a", "#1f8a7a", "#2c6fb7", "#5b4bb0", "#a2408f", "#8a5a3b", "#4a5568"];
const DRAG_THRESHOLD = 8;
const TOP = 36;
const LABEL_H = 24;
const BASE_H = 14;

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function computeGeometry(width, n) {
  const colW = width / 3;
  const discH = Math.max(16, Math.min(30, Math.floor(colW / 6.5), Math.floor(300 / n)));
  const height = TOP + discH * (n + 1) + BASE_H + LABEL_H;
  const baseY = height - LABEL_H - BASE_H;
  const maxW = colW * 0.92;
  const minW = Math.max(colW * 0.28, 30);
  const discW = (s) => (n === 1 ? maxW : minW + ((maxW - minW) * (s - 1)) / (n - 1));
  return { colW, discH, height, baseY, discW };
}

export default function Board({ n, pegs, selected, disabled, badPeg, onTap, onDrop }) {
  const boardRef = useRef(null);
  const width = useWidth(boardRef);
  const g = computeGeometry(width || 600, n);

  // ドラッグ中の情報。pointermove ごとの再描画は pos だけで行う
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null); // { disc, from, x, y, hoverPeg }

  useEffect(() => {
    if (disabled) {
      dragRef.current = null;
      setDrag(null);
    }
  }, [disabled]);

  const pegAt = (clientX) => {
    const r = boardRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(2, Math.floor((clientX - r.left) / g.colW)));
  };

  const discPos = (peg, index, size) => ({
    left: peg * g.colW + g.colW / 2 - g.discW(size) / 2,
    top: g.baseY - (index + 1) * g.discH + 1,
  });

  const handlePointerDown = (e) => {
    if (disabled || e.button > 0) return;
    const r = boardRef.current.getBoundingClientRect();
    const from = pegAt(e.clientX);
    const stack = pegs[from];
    const state = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from, moved: false, r };
    if (stack.length && (selected === null || selected === from)) {
      const size = stack[stack.length - 1];
      const pos = discPos(from, stack.length - 1, size);
      if (selected === from) pos.top = 6;
      state.candidate = size;
      state.ox = e.clientX - r.left - pos.left;
      state.oy = e.clientY - r.top - pos.top;
    }
    dragRef.current = state;
    boardRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved) {
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      if (dist <= DRAG_THRESHOLD || !d.candidate) return;
      d.moved = true;
    }
    const hoverPeg = pegAt(e.clientX);
    setDrag({
      disc: d.candidate,
      from: d.from,
      x: e.clientX - d.r.left - d.ox,
      y: e.clientY - d.r.top - d.oy,
      hoverPeg: hoverPeg !== d.from ? hoverPeg : null,
    });
  };

  const finish = (e, cancelled) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    setDrag(null);
    if (cancelled) return;
    const target = pegAt(e.clientX);
    if (d.moved) onDrop(d.from, target);
    else onTap(target);
  };

  const handleKeyDown = (p) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) onTap(p);
    }
  };

  const discs = [];
  pegs.forEach((stack, p) =>
    stack.forEach((size, i) => {
      const isTop = i === stack.length - 1;
      const lifted = selected === p && isTop;
      const dragging = drag && drag.disc === size;
      let { left, top } = discPos(p, i, size);
      if (lifted) top = 6;
      if (dragging) {
        left = drag.x;
        top = drag.y;
      }
      const cls = ["disc", lifted && "lifted", dragging && "dragging"].filter(Boolean).join(" ");
      discs.push(
        <div
          key={size}
          className={cls}
          style={{
            left,
            top,
            width: g.discW(size),
            height: g.discH - 2,
            fontSize: Math.min(13, g.discH * 0.5),
            background: COLORS[(size - 1) % COLORS.length],
          }}
        >
          {size}
        </div>
      );
    })
  );

  return (
    <div
      ref={boardRef}
      className="board"
      style={{ height: g.height }}
      aria-label="ゲーム盤"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
    >
      {[0, 1, 2].map((p) => {
        const cls = ["peg", drag?.hoverPeg === p && "hover", badPeg === p && "bad"].filter(Boolean).join(" ");
        return (
          <div
            key={p}
            className={cls}
            role="button"
            tabIndex={0}
            aria-label={`柱${PEG_NAMES[p]}${p === GOAL_PEG ? "（ゴール）" : ""}`}
            style={{ left: p * g.colW, width: g.colW }}
            onKeyDown={handleKeyDown(p)}
          >
            <div className="rod" style={{ top: TOP - 8, height: g.baseY - TOP + 8 }} />
            <div className="peg-label">
              {PEG_NAMES[p]}
              {p === GOAL_PEG && <span className="goal"> ゴール</span>}
            </div>
          </div>
        );
      })}
      <div className="base" style={{ top: g.baseY }} />
      {discs}
    </div>
  );
}
