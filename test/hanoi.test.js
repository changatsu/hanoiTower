import { test } from "node:test";
import assert from "node:assert/strict";
import { createPegs, canMove, applyMove, isSolved, minMoves, solve } from "../src/hanoi.js";

test("初期状態は左の柱に大きい順で積まれている", () => {
  assert.deepEqual(createPegs(3), [[3, 2, 1], [], []]);
});

test("小さい円盤の上に大きい円盤は置けない", () => {
  let pegs = createPegs(3);
  pegs = applyMove(pegs, 0, 2); // 1 を C へ
  assert.equal(canMove(pegs, 0, 2), false); // 2 は 1 の上に置けない
  assert.equal(canMove(pegs, 0, 1), true);
  assert.equal(canMove(pegs, 1, 0), false); // 空の柱からは動かせない
  assert.equal(canMove(pegs, 0, 0), false);
});

test("applyMove は元の状態を変更しない", () => {
  const pegs = createPegs(3);
  applyMove(pegs, 0, 1);
  assert.deepEqual(pegs, [[3, 2, 1], [], []]);
});

for (const n of [1, 3, 5, 8, 10]) {
  test(`最短手順（${n} 枚）は ${minMoves(n)} 手で全て合法にクリアできる`, () => {
    const moves = solve(n);
    assert.equal(moves.length, minMoves(n));
    let pegs = createPegs(n);
    for (const [f, t] of moves) {
      assert.ok(canMove(pegs, f, t));
      pegs = applyMove(pegs, f, t);
    }
    assert.ok(isSolved(pegs, n));
  });
}
