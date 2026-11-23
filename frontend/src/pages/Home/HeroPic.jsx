// Animated illustration: a record is scanned, CODEX extracts codes and routes them (CSS animations in portal.css).
const LINES = [[88, 70, '#9aa6bd'], [107, 140], [125, 120], [142, 80, '#9aa6bd'], [160, 150], [179, 130], [197, 110], [214, 80, '#9aa6bd'], [232, 145], [250, 100]]
const HL = [[102, '#ece8ff', 0.2], [155, '#ece8ff', 0.6], [174, '#e5eefd', 1], [227, '#ece8ff', 1.4]]
const DEST = [[38, '#e5f6ec', '#1b8f4e', 'CMS EDS ✓', 'auto-submitted', 0], [135, '#fff3d9', '#c27c00', 'Coder review', 'evidence pre-assembled', 0.7], [232, '#e5eefd', '#1d5fd1', 'Physician query', 'non-leading · 24 h', 1.4]]
const CHIPS = [['f1', '#1b8f4e', 'E11.22 · HCC 37'], ['f2', '#c27c00', 'F02.B0 · 0.78'], ['f3', '#1d5fd1', 'eGFR 44 → 41 ?'], ['f4', '#1b8f4e', 'I48.0 · HCC 238']]

export default function HeroPic() {
  return (
    <svg id="heroPic" viewBox="0 0 520 330" role="img" aria-label="Animated illustration: a medical record is scanned, CODEX extracts codes and routes them">
      <defs>
        <linearGradient id="beamG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c66ff" stopOpacity="0" /><stop offset=".5" stopColor="#7c66ff" stopOpacity=".5" /><stop offset="1" stopColor="#7c66ff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="docClip"><rect x="24" y="40" width="180" height="250" rx="10" /></clipPath>
      </defs>
      <rect x="24" y="40" width="180" height="250" rx="10" fill="#fff" stroke="#d5dbe6" strokeWidth="1.5" />
      <rect x="24" y="40" width="180" height="34" rx="10" fill="#13294b" /><rect x="24" y="60" width="180" height="14" fill="#13294b" />
      <text x="38" y="62" fontSize="11" fill="#fff" fontWeight="700">VISIT NOTE · PT-77502</text>
      {HL.map(([y, c, d]) => <rect key={y} className="hl" x="34" y={y} width="160" height="16" rx="4" fill={c} style={{ animationDelay: `${d}s` }} />)}
      {LINES.map(([y, w, c]) => <rect key={y} x="38" y={y + (c ? 0 : 0)} width={w} height="6" rx="3" fill={c || '#c9d1df'} />)}
      <path d="M150 268 q8 -10 16 0 t16 0" stroke="#1d3c78" fill="none" strokeWidth="1.6" />
      <g clipPath="url(#docClip)"><rect className="beam" x="24" y="40" width="180" height="40" fill="url(#beamG)" /></g>
      <path className="flow" d="M208 165 L246 165" stroke="#7c66ff" strokeWidth="3" strokeDasharray="6 4" />
      <g transform="translate(300,165)">
        <circle r="50" fill="#eeebfd" stroke="#4f3cc9" strokeWidth="2" />
        <circle className="spin" r="60" fill="none" stroke="#7c66ff" strokeWidth="3" strokeDasharray="22 14" />
        <text y="-4" textAnchor="middle" fontSize="19" fontWeight="800" fill="#4f3cc9">CODEX</text>
        <text y="14" textAnchor="middle" fontSize="10" fill="#44526a">5 agents · KG</text>
        <text y="28" textAnchor="middle" fontSize="9.5" fill="#0d8a82" fontWeight="700">gate ≥ 0.90</text>
      </g>
      {DEST.map(([y, bg, c, t, s, d]) => (
        <g key={t} className="pulse" style={{ animationDelay: `${d}s` }}>
          <rect x="404" y={y} width="108" height="60" rx="12" fill={bg} stroke={c} strokeWidth="1.6" />
          <text x="458" y={y + 25} textAnchor="middle" fontSize="13" fontWeight="800" fill={c}>{t}</text>
          <text x="458" y={y + 43} textAnchor="middle" fontSize="10" fill="#44526a">{s}</text>
        </g>
      ))}
      {CHIPS.map(([cls, c, t]) => (
        <g key={cls} className={`fly ${cls}`}>
          <rect width="100" height="22" rx="6" fill="#fff" stroke={c} strokeWidth="1.4" />
          <text x="50" y="15" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={c}>{t}</text>
        </g>
      ))}
    </svg>
  )
}
