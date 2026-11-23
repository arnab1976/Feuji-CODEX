import { useState } from 'react'
import content from '../../data/content.json'

const STAGES = [['01', 'OCR + KG-guided extraction', 'Textract and LayoutLMv3 keep the 2D layout; the knowledge graph injects ICD-10 → HCC context.'],
  ['02', 'BioBERT / Med-BERT NER', 'Conditions, meds, labs and procedures are extracted with specificity flags.'],
  ['03', 'LLM HCC coder', 'Complete V28 code set with per-code rationale and source citations.'],
  ['04', 'Confidence-gated router', 'Platt-calibrated score: auto-submit, coder review, or flag for deletion.'],
  ['05', 'Submission + Addendum AI', 'Encounter-linked EDS submission with audit log; compliant physician query when a gap is found.']]

export default function IOExplorer() {
  const { INPUTS, AGENTS, OUTPUTS } = content
  const [k, setK] = useState(INPUTS[0].k)
  const inp = INPUTS.find((i) => i.k === k)
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="eyebrow">Input → output explorer</div>
      <h3>Click any input to see which agents use it and what it produces</h3>
      <div className="io">
        <div className="iolist"><h4>Inputs</h4>{INPUTS.map((i) => <button key={i.k} className={i.k === k ? 'on' : ''} onClick={() => setK(i.k)}>{i.n}</button>)}</div>
        <div className="agentcol"><h4>Agents that consume it</h4>
          {Object.entries(AGENTS).map(([key, a]) => <div key={key} className={`ag ${inp.ag.includes(key) ? 'lit' : ''}`}><b>{a.n}</b><span className="muted xs">{a.r}</span></div>)}</div>
        <div className="iolist"><h4>Outputs it feeds</h4>
          {Object.entries(OUTPUTS).map(([key, o]) => <button key={key} className={`o ${inp.out.includes(key) ? 'lit' : ''}`} disabled style={{ cursor: 'default' }}>{o}</button>)}</div>
      </div>
      <div className="iodetail"><b>{inp.n}</b>: {inp.ex}</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
        {STAGES.map(([n, t, d]) => <div key={n} className="metric"><div className="eyebrow">Stage {n}</div><b className="small">{t}</b><p className="xs muted" style={{ margin: '4px 0 0' }}>{d}</p></div>)}
      </div>
    </div>
  )
}
