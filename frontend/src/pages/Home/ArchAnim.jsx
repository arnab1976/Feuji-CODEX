// Animated architecture: inputs → 5 agents → outputs, knowledge graph below, external sources band.
const IN = ['PDF / TIFF records', 'EHR · FHIR data', 'Prior submissions', 'CMS-HCC V28 maps', 'Coder QA data']
const AGN = [['OCR Extraction', 'Textract · LayoutLMv3'], ['NLP Coding', 'BioBERT · Med-BERT'], ['LLM HCC Coder', 'Fine-tuned clinical LLM'], ['Confidence Gate', 'Platt calibration'], ['Submit + Addendum', 'EDS · physician query']]
const OUT = ['Auto-submitted codes (EDS)', 'Coder review queue', 'Rationale audit log', 'Physician query', 'Throughput dashboard']
const OC = ['#1b8f4e', '#c27c00', '#0d8a82', '#1d5fd1', '#4f3cc9']

const Dot = ({ id, begin, color, dur = 2.4 }) => (
  <circle r="4.5" fill={color} opacity="0">
    <set attributeName="opacity" to="1" begin={`${begin}s`} />
    <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"><mpath href={`#${id}`} /></animateMotion>
  </circle>
)

export default function ArchAnim() {
  return (
    <svg id="archAnim" viewBox="0 0 1240 372" style={{ width: '100%' }}>
      <defs><marker id="aa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#9aa6bd" /></marker></defs>
      <text x="105" y="22" textAnchor="middle" className="ah">INPUTS</text>
      <text x="625" y="22" textAnchor="middle" className="ah">CODEX AGENT PIPELINE</text>
      <text x="1130" y="22" textAnchor="middle" className="ah">OUTPUTS</text>
      {IN.map((t, i) => { const y = 36 + i * 56; return (
        <g key={t}>
          <rect x="20" y={y} width="170" height="42" rx="9" fill="#f4f6fb" stroke="#d5dbe6" />
          <text x="105" y={y + 26} textAnchor="middle" fontSize="12.5" fill="#0f1d33" fontWeight="600">{t}</text>
          <path id={`pi${i}`} className="ap" d={`M190,${y + 21} C228,${y + 21} 222,175 258,175`} markerEnd="url(#aa)" />
        </g>) })}
      {AGN.map(([n, s], i) => { const x = 260 + i * 150; return (
        <g key={n}>
          <g className="agp">
            <rect x={x} y="135" width="130" height="80" rx="12" stroke="#4f3cc9" strokeWidth="1.6" style={{ animationDelay: `${i * 0.7}s` }} />
            <text x={x + 65} y="160" textAnchor="middle" fontSize="10" fill="#4f3cc9" fontWeight="800">AGENT 0{i + 1}</text>
            <text x={x + 65} y="180" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#0f1d33">{n}</text>
            <text x={x + 65} y="198" textAnchor="middle" fontSize="10.5" fill="#7a869c">{s}</text>
          </g>
          {i < 4 && <path id={`pa${i}`} className="ap" d={`M${x + 130},175 L${x + 148},175`} markerEnd="url(#aa)" />}
          {i !== 3 && <path id={`pk${i}`} className="ap kg" d={`M${x + 65},262 L${x + 65},218`} markerEnd="url(#aa)" />}
        </g>) })}
      {OUT.map((t, i) => { const y = 36 + i * 56; return (
        <g key={t}>
          <path id={`po${i}`} className="ap" d={`M990,175 C1015,175 1012,${y + 21} 1038,${y + 21}`} markerEnd="url(#aa)" />
          <rect x="1040" y={y} width="180" height="42" rx="9" fill="#fff" stroke={OC[i]} strokeWidth="1.6" />
          <text x="1130" y={y + 26} textAnchor="middle" fontSize="12.5" fill={OC[i]} fontWeight="700">{t}</text>
        </g>) })}
      <rect x="260" y="262" width="730" height="34" rx="9" fill="#e2f5f3" stroke="#a6dcd6" />
      <text x="625" y="284" textAnchor="middle" fontSize="12.5" fill="#0d8a82" fontWeight="700">Neo4j clinical knowledge graph · ICD-10 → HCC V28 → SNOMED CT → RxNorm</text>
      <rect x="20" y="318" width="1200" height="42" rx="10" fill="#fbf7ff" stroke="#d9d1fb" strokeDasharray="5 4" />
      <text x="40" y="344" fontSize="12.5" fontWeight="800" fill="#44526a">External sources ·</text>
      <text x="178" y="344" fontSize="12.5" fill="#4f3cc9" fontWeight="700">EHR / FHIR</text>
      <text x="270" y="344" fontSize="12.5" fill="#44526a">·</text>
      <text x="286" y="344" fontSize="12.5" fill="#0d8a82" fontWeight="700">Claims & encounter feed</text>
      <text x="470" y="344" fontSize="12.5" fill="#44526a">·</text>
      <text x="486" y="344" fontSize="12.5" fill="#d97706" fontWeight="700">Document exchange</text>
      <text x="650" y="344" fontSize="12.5" fill="#44526a">·</text>
      <text x="666" y="344" fontSize="12.5" fill="#1b8f4e" fontWeight="700">Intake API → coded result back to the source</text>
      {IN.map((_, i) => <Dot key={`di${i}`} id={`pi${i}`} begin={i * 0.45} color="#4f3cc9" />)}
      {[0, 1, 2, 3].map((i) => <Dot key={`da${i}`} id={`pa${i}`} begin={i * 0.7} color="#7c66ff" dur={0.7} />)}
      {[0, 1, 2, 4].map((i) => <Dot key={`dk${i}`} id={`pk${i}`} begin={i * 0.5 + 0.3} color="#0d8a82" dur={1.4} />)}
      {OUT.map((_, i) => <Dot key={`do${i}`} id={`po${i}`} begin={2.8 + i * 0.35} color={OC[i]} dur={1.6} />)}
    </svg>
  )
}
