import { useCallback, useEffect, useRef, useState } from "react";
import { playEvents } from "./sound.js";

// ゲームの時計。requestAnimationFrame で tick を呼び、一時停止とタブを離れたときの停止を受け持つ。
// act(fn, ...args) で状態を変える（fn は (state, ...args) => 新しい state の純粋な関数）。
export function useGame(init, tick) {
  const [state, setState] = useState(init);
  const ref = useRef(state); // 最新の状態（setState の中で副作用を起こさないよう、ここで計算する）
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState(null); // { text, kind, key }
  const pausedRef = useRef(false);
  pausedRef.current = paused || state.over;

  const handle = useCallback((next) => {
    if (next.events && next.events.length) {
      playEvents(next.events);
      const withText = next.events.filter((e) => e.text);
      if (withText.length) {
        const e = withText[withText.length - 1];
        setToast({ text: e.text, kind: e.kind, key: Math.random() });
      }
    }
  }, []);

  const commit = useCallback(
    (next) => {
      if (next === ref.current) return;
      ref.current = next;
      setState(next);
      handle(next);
    },
    [handle]
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(now - last, 250); // 画面が止まっていた分は進めない
      last = now;
      if (!pausedRef.current) {
        commit(tick(ref.current, dt));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onHide = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [tick, commit]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const act = useCallback(
    (fn, ...args) => {
      if (pausedRef.current) return;
      commit(fn(ref.current, ...args));
    },
    [commit]
  );

  const restart = useCallback(() => {
    ref.current = init();
    setState(ref.current);
    setPaused(false);
    setToast(null);
  }, [init]);

  return { state, act, paused, setPaused, toast, restart };
}

export function fmtTime(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
