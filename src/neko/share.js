// クリアした盤面を 1 枚の画像にして、LINE などで共有する。
// 画面に描かれているねこの SVG をそのまま使い、棚を並べた SVG を作ってから PNG に変換する。

export const GAME_URL = "https://changatsu.github.io/hanoiTower/neko/";

const W = 1080;
const MARGIN = 48;
const AISLE = 72;
const HEAD = 230;
const FOOT = 110;
const PLANK = 22;
const ROW_GAP = 34;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function shareText(level, moves) {
  return `ねこだな レベル${level}をクリア！（${moves}手）\n${GAME_URL}`;
}

// boardEl: 盤面（.shelves）の DOM。棚ごとの .cat-svg を取り出して並べ直す
export function buildShareSvg({ boardEl, cap, level, moves }) {
  const shelfEls = [...boardEl.querySelectorAll(".shelf")];
  const colW = (W - MARGIN * 2 - AISLE) / 2;
  const slot = colW / cap;
  const catH = (slot * 98) / 84;
  const rowH = catH + PLANK + ROW_GAP;
  const rows = Math.ceil(shelfEls.length / 2);
  const H = HEAD + rows * rowH + FOOT;

  const parts = [];
  shelfEls.forEach((shelfEl, i) => {
    const right = i % 2 === 1;
    const colX = right ? MARGIN + colW + AISLE : MARGIN;
    const top = HEAD + Math.floor(i / 2) * rowH;
    const cats = [...shelfEl.querySelectorAll(".cat-svg")];
    cats.forEach((svg, k) => {
      // 左の棚は左から、右の棚は右から並べる（どちらも通路側が先頭）
      const x = right ? colX + colW - (k + 1) * slot : colX + k * slot;
      parts.push(
        `<svg x="${x}" y="${top}" width="${slot}" height="${catH}" viewBox="${svg.getAttribute("viewBox")}">${svg.innerHTML}</svg>`
      );
    });
    const py = top + catH - 4;
    parts.push(`<rect x="${colX - 6}" y="${py}" width="${colW + 12}" height="${PLANK}" rx="6" fill="url(#wood)"/>`);
    const edge = right ? colX - 6 : colX + colW + 2;
    parts.push(`<rect x="${edge}" y="${py}" width="4" height="${PLANK}" fill="#ffd27a"/>`);
  });

  const aisleX = W / 2;
  const dots = [];
  for (let y = HEAD; y < HEAD + rows * rowH - ROW_GAP; y += 36) dots.push(`<circle cx="${aisleX}" cy="${y}" r="4" fill="#ffd27a" opacity="0.6"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1a33"/><stop offset="1" stop-color="#2d2547"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6a06a"/><stop offset="0.45" stop-color="#b9804a"/><stop offset="1" stop-color="#7a4d26"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<text x="${W / 2}" y="105" text-anchor="middle" font-size="76" font-weight="900" fill="#ffd27a" font-family="Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, sans-serif">ねこだな</text>
<text x="${W / 2}" y="180" text-anchor="middle" font-size="46" font-weight="700" fill="#f3eee4" font-family="Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, sans-serif">${esc(`レベル ${level} クリア！ ${moves} 手`)}</text>
${dots.join("")}
${parts.join("\n")}
<text x="${W / 2}" y="${H - 44}" text-anchor="middle" font-size="30" fill="#b9b0cf" font-family="Hiragino Sans, Yu Gothic, sans-serif">${esc(GAME_URL.replace("https://", ""))}</text>
</svg>`;
}

// SVG の文字列を PNG の Blob に変換する
export function svgToPngBlob(svgText) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

// 画像つきで共有する。共有シート（LINE を選べる）が使えなければ、LINE の文字だけの共有を開く。
// 戻り値: "shared" | "cancelled" | "line-text"
export async function shareResult({ file, level, moves }) {
  const text = shareText(level, moves);
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
      // 画像つきが失敗したら文字だけで LINE を開く
    }
  }
  window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return "line-text";
}
