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

// 絵の左右の余白を切り詰めた viewBox（しっぽ側 x≈98 まで、ひげ側 x≈18 から）。
// 棚の 1 マスを無駄なく使って、ねこを大きく見せる。
export const CAT_VIEWBOX = "16 2 84 98";
const FLIP = "matrix(-1 0 0 1 116 0)"; // viewBox の中心 x=58 で左右反転

// flip: 右側の棚用に左右反転する。文字（しるし）は反転させないので、図形だけを <g> で反転する。
// （CSS の transform で SVG ごと反転させると、iOS Safari で文字の位置がずれるため）
// acc: 身につけるもの（きせかえ）、sleep: ねぼすけねこ（眠っている）、heavy: どっしりねこ
export function Cat({ color, hidden, happy, flip, acc, sleep, heavy }) {
  if (hidden) return <HiddenCat />;
  const c = CAT_COLORS[color];
  return (
    <svg viewBox={CAT_VIEWBOX} className="cat-svg" aria-hidden="true">
      <g transform={flip ? FLIP : undefined}>
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
        {sleep && !happy ? (
          <g fill="none" stroke={c.ink} strokeWidth="2.6" strokeLinecap="round">
            <path d="M35 37 Q40 41 45 37" />
            <path d="M55 37 Q60 41 65 37" />
          </g>
        ) : happy ? (
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
        {acc && <Accessory id={acc} />}
      </g>
      {sleep && (
        <text x={flip ? 30 : 86} y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="#cfe3ff" stroke="#2c2846" strokeWidth="0.6">
          Zz
        </text>
      )}
      {heavy && (
        <g>
          <circle cx={flip ? 66 : 50} cy="84" r="12" fill="#5a4a3a" stroke="#fff3d6" strokeWidth="2" />
          <text x={flip ? 66 : 50} y="89.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff3d6">
            重
          </text>
        </g>
      )}
      <text x={flip ? 66 : 50} y="70.5" textAnchor="middle" fontSize="10" fill={c.ink} fontWeight="700">
        {c.mark}
      </text>
    </svg>
  );
}

// 色がまだわからない猫：ブランケットをかぶって顔が見えない
function HiddenCat() {
  return (
    <svg viewBox="8 2 84 98" className="cat-svg" aria-hidden="true">
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

// きせかえの小物（ねこの絵と同じ座標。左右反転の <g> の中で描く）
function Accessory({ id }) {
  switch (id) {
    case "ribbon":
      return (
        <g stroke="#a3244d" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M66 22 L57 15 L58 28 Z" fill="#ff5d8f" />
          <path d="M66 22 L75 15 L74 28 Z" fill="#ff5d8f" />
          <circle cx="66" cy="22" r="3" fill="#ff86aa" />
        </g>
      );
    case "flower":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={34 + 4.2 * Math.cos((a * Math.PI) / 180)} cy={20 + 4.2 * Math.sin((a * Math.PI) / 180)} r="3.4" fill="#fff" stroke="#e6a3b7" strokeWidth="0.8" />
          ))}
          <circle cx="34" cy="20" r="2.6" fill="#ffd34d" />
        </g>
      );
    case "scarf":
      return (
        <g fill="#d9433b" stroke="#8f231d" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M33 55 Q50 64 67 55 L68 61 Q50 70 32 61 Z" />
          <path d="M58 62 L66 61 L69 78 L61 79 Z" />
          <path d="M61 79 L69 78" stroke="#fff" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
        </g>
      );
    case "glasses":
      return (
        <g fill="rgba(255,255,255,0.18)" stroke="#2a2a2a" strokeWidth="2">
          <circle cx="40" cy="37" r="8" />
          <circle cx="60" cy="37" r="8" />
          <path d="M48 37 Q50 35 52 37 M32 36 L25 34 M68 36 L75 34" fill="none" />
        </g>
      );
    case "star":
      return (
        <path
          d="M64 10 L66.4 15.6 L72.4 16 L67.8 19.8 L69.3 25.6 L64 22.4 L58.7 25.6 L60.2 19.8 L55.6 16 L61.6 15.6 Z"
          fill="#ffd34d"
          stroke="#b8860b"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      );
    case "hat":
      return (
        <g stroke="#111" strokeWidth="1.2">
          <rect x="39" y="2" width="22" height="15" rx="2" fill="#2b2b3a" />
          <rect x="39" y="12" width="22" height="3.5" fill="#d9433b" />
          <ellipse cx="50" cy="17.5" rx="18" ry="3.5" fill="#2b2b3a" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M36 19 L36 8 L43 13 L50 3 L57 13 L64 8 L64 19 Z" fill="#ffcf3f" stroke="#a87400" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="50" cy="14" r="2.2" fill="#e2574c" />
          <circle cx="42" cy="16" r="1.6" fill="#4f8fc9" />
          <circle cx="58" cy="16" r="1.6" fill="#4a9a6e" />
        </g>
      );
    default:
      return null;
  }
}
