// 猫のイラスト（SVG）。色ごとに毛色・模様・首輪のしるしを変える。
// しるし（●▲■…）は色の見分けがつきにくい人のための手がかり。

export const CAT_COLORS = [
  { name: "しろ", fill: "#f6f2ea", shade: "#ddd5c7", ink: "#6b5f55", eye: "#4f8fc9", mark: "●", collar: "#e2574c" },
  { name: "くろ", fill: "#34323d", shade: "#22212a", ink: "#121117", eye: "#e8c547", mark: "▲", collar: "#e2574c" },
  { name: "ちゃとら", fill: "#ef9b45", shade: "#cf7528", ink: "#7a3f12", eye: "#5b8a3a", mark: "■", collar: "#3f6fc4", stripes: "#c8681e" },
  { name: "はいいろ", fill: "#9aa3b0", shade: "#7c8592", ink: "#3f4652", eye: "#e5b93c", mark: "★", collar: "#e2574c" },
  { name: "クリーム", fill: "#f4dc9c", shade: "#e2c271", ink: "#7d6020", eye: "#8a6a2c", mark: "◆", collar: "#4a9a6e" },
  { name: "こげちゃ", fill: "#8a5733", shade: "#6c4022", ink: "#3a200d", eye: "#e6c04a", mark: "♥", collar: "#f0b8c8", stripes: "#6a3d1c" },
  { name: "ブルー", fill: "#6f8fbd", shade: "#55739f", ink: "#26344d", eye: "#f2c94c", mark: "♣", collar: "#f3d36b" },
  { name: "さくら", fill: "#f5aec0", shade: "#e48aa1", ink: "#83384d", eye: "#7a4fb0", mark: "♠", collar: "#7a4fb0" },
  { name: "ミント", fill: "#9ad8bd", shade: "#6fbd9c", ink: "#2b6a52", eye: "#c2549a", mark: "✿", collar: "#c2549a" },
];

const BODY = "M28 96 C22 80 26 62 38 56 L62 56 C74 62 78 80 72 96 Z";
const EAR_L = "M27 32 L29 6 L49 22 Z";
const EAR_R = "M73 32 L71 6 L51 22 Z";

export function Cat({ color, hidden, happy }) {
  if (hidden) return <HiddenCat />;
  const c = CAT_COLORS[color];
  return (
    <svg viewBox="0 0 100 100" className="cat-svg" aria-hidden="true">
      {/* しっぽ */}
      <path d="M70 90 C92 90 94 70 86 62" fill="none" stroke={c.shade} strokeWidth="8" strokeLinecap="round" />
      <path d={BODY} fill={c.fill} stroke={c.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="84" rx="12" ry="10" fill="#fff" opacity={color === 0 ? 0 : 0.28} />
      {/* 前足 */}
      <ellipse cx="42" cy="95" rx="6" ry="3.6" fill={c.fill} stroke={c.ink} strokeWidth="2" />
      <ellipse cx="58" cy="95" rx="6" ry="3.6" fill={c.fill} stroke={c.ink} strokeWidth="2" />
      {/* 耳 */}
      <path d={EAR_L} fill={c.fill} stroke={c.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={EAR_R} fill={c.fill} stroke={c.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 26 L33 14 L42 21 Z" fill="#f2a5b4" />
      <path d="M68 26 L67 14 L58 21 Z" fill="#f2a5b4" />
      {/* 顔 */}
      <ellipse cx="50" cy="38" rx="26" ry="22" fill={c.fill} stroke={c.ink} strokeWidth="2.5" />
      {c.stripes && (
        <g stroke={c.stripes} strokeWidth="3" strokeLinecap="round">
          <path d="M50 17 L50 25" />
          <path d="M43 18 L44 24" />
          <path d="M57 18 L56 24" />
        </g>
      )}
      <ellipse cx="34" cy="45" rx="5" ry="3" fill="#ff8fa3" opacity="0.45" />
      <ellipse cx="66" cy="45" rx="5" ry="3" fill="#ff8fa3" opacity="0.45" />
      {happy ? (
        <g fill="none" stroke={c.ink} strokeWidth="2.6" strokeLinecap="round">
          <path d="M35 38 Q40 32 45 38" />
          <path d="M55 38 Q60 32 65 38" />
        </g>
      ) : (
        <g>
          <ellipse cx="40" cy="37" rx="5" ry="6" fill={c.eye} stroke={c.ink} strokeWidth="1.5" />
          <ellipse cx="60" cy="37" rx="5" ry="6" fill={c.eye} stroke={c.ink} strokeWidth="1.5" />
          <ellipse cx="40" cy="37.5" rx="2" ry="4" fill="#1a1a1a" />
          <ellipse cx="60" cy="37.5" rx="2" ry="4" fill="#1a1a1a" />
          <circle cx="41.6" cy="34.5" r="1.5" fill="#fff" />
          <circle cx="61.6" cy="34.5" r="1.5" fill="#fff" />
        </g>
      )}
      <path d="M47.5 44 L52.5 44 L50 47 Z" fill="#e8798f" />
      <path d="M44 49 Q47 52 50 48.5 Q53 52 56 49" fill="none" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" />
      <g stroke={c.ink} strokeWidth="1.2" opacity="0.6" strokeLinecap="round">
        <path d="M30 45 L18 43" />
        <path d="M30 48 L19 50" />
        <path d="M70 45 L82 43" />
        <path d="M70 48 L81 50" />
      </g>
      {/* 首輪としるし */}
      <path d="M36 58 Q50 64 64 58" fill="none" stroke={c.collar} strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="67" r="7" fill="#fff8e6" stroke={c.ink} strokeWidth="1.5" />
      <text x="50" y="70.5" textAnchor="middle" fontSize="10" fill={c.ink} fontWeight="700">
        {c.mark}
      </text>
    </svg>
  );
}

// 色がまだわからない猫：ブランケットをかぶって顔が見えない
function HiddenCat() {
  return (
    <svg viewBox="0 0 100 100" className="cat-svg" aria-hidden="true">
      <path
        d="M22 97 C16 70 22 30 30 16 L37 26 C45 20 55 20 63 26 L70 16 C78 30 84 70 78 97 Z"
        fill="#5b5480"
        stroke="#2c2846"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M26 70 Q50 78 74 70" fill="none" stroke="#7a72a6" strokeWidth="3" strokeDasharray="4 5" />
      <path d="M24 86 Q50 94 76 86" fill="none" stroke="#7a72a6" strokeWidth="3" strokeDasharray="4 5" />
      <text x="50" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="#d9d3ff">
        ?
      </text>
    </svg>
  );
}
