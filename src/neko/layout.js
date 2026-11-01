// 盤面を画面に収めるための寸法計算（neko.css の値と合わせる）

const CAT_RATIO = 98 / 84; // ねこ 1 匹の 高さ ÷ 幅（Cat.jsx の viewBox）
const SHELF_EXTRA = 20; // 棚 1 段の、ねこ以外の高さ（上の余白 10 + 板 12 − 重なり 2）
const ROW_GAP = 6;
const LEG = 14; // いちばん下の棚の脚
export const SHELF_PAD_X = 8;
const MAX_COL = 330;

// 画面の幅と高さの両方に収まる、ねこ 1 匹の幅（px）を求める
export function fitCatWidth({ width, height, aisle, rows, cap }) {
  const byWidth = ((Math.min(MAX_COL * 2 + aisle, width) - aisle) / 2 - SHELF_PAD_X) / cap;
  const byHeight = ((height - LEG - ROW_GAP * (rows - 1)) / rows - SHELF_EXTRA) / CAT_RATIO;
  return Math.max(16, Math.floor(Math.min(byWidth, byHeight)));
}
