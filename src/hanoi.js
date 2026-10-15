// ハノイの塔のゲームロジック（UIに依存しない純粋関数）
// 状態は 3 本の柱の配列。各柱は下から順に円盤サイズ（1 が最小）を持つ。

export const PEG_NAMES = ["A", "B", "C"];
export const GOAL_PEG = 2;

export function createPegs(n) {
  return [Array.from({ length: n }, (_, i) => n - i), [], []];
}

export function minMoves(n) {
  return 2 ** n - 1;
}

export function topDisc(peg) {
  return peg.length ? peg[peg.length - 1] : null;
}

export function canMove(pegs, from, to) {
  if (from === to) return false;
  const disc = topDisc(pegs[from]);
  if (disc === null) return false;
  const target = topDisc(pegs[to]);
  return target === null || target > disc;
}

// 新しい状態を返す（元の配列は変更しない）
export function applyMove(pegs, from, to) {
  const next = pegs.map((p) => p.slice());
  next[to].push(next[from].pop());
  return next;
}

export function isSolved(pegs, n) {
  return pegs[GOAL_PEG].length === n;
}

// 最短手順を [from, to] の配列で返す
export function solve(n, from = 0, via = 1, to = GOAL_PEG, out = []) {
  if (n === 0) return out;
  solve(n - 1, from, to, via, out);
  out.push([from, to]);
  solve(n - 1, via, from, to, out);
  return out;
}
