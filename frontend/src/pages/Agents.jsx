import { useState } from 'react'
import content from '../data/content.json'

const STACK = { 'Knowledge graph': ['Neo4j Enterprise', 'Cypher', 'ICD-10 → HCC → SNOMED CT → RxNorm'], 'NLP & OCR': ['BioBERT', 'Med-BERT', 'LayoutLMv3', 'scispaCy', 'CRF labeller', 'AWS Textract'],
  'GenAI & LLM': ['GPT-4o fine-tuned', 'LangChain', 'LangSmith', 'OpenAI fine-tuning API'], 'ML & calibration': ['Platt calibration', 'XGBoost', 'scikit-learn', 'SHAP'],
  'CMS integration': ['EDS encounter submission', 'RAPS (legacy)', 'Per-code audit log', 'CMS-HCC V28 maps'], Infrastructure: ['AWS EC2 GPU', 'PostgreSQL', 'Snowflake', 'AWS S3', 'Airflow'],
  'This repository': ['FastAPI', 'SQLAlchemy', 'React + Vite', 'Docker', 'backend/app/agents/*.py'] }
const TIMELINE = [['Wk 1–3', 'Data onboarding, KG load (ICD-10 · HCC V28 · SNOMED CT · RxNorm), OCR tuning'], ['Wk 4–7', 'NER + LLM coder fine-tune on 1,000+ plan charts; coder validation set'],
  ['Wk 8–10', 'Gate calibration, review-queue UI, EDS integration in test'], ['Wk 11–12', 'Shadow run vs coders, compliance sign-off, go-live']]

export default function Agents() {
  const AG = content.AG
  const [k, setK] = useState('llm')
  const a = AG.find((x) => x.k === k)
  return (
    <>
      <div className="eyebrow">Agents &amp; architecture</div>
      <h2>Five agents, one knowledge graph, one audit trail</h2>
      <p className="lead">Click an agent to see exactly what it receives, what it returns, and the tools behind it. In this repository each agent is a Python class in <code>backend/app/agents/</code> with a rules mode (default) and a production hook.</p>
      <div className="card">
        <svg id="archSvg" viewBox="0 0 1200 330" style={{ width: '100%' }}>
          <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#9aa6bd" /></marker></defs>
          <rect x="20" y="10" width="1160" height="40" rx="10" fill="#eef1f6" /><text x="600" y="35" textAnchor="middle" fontSize="13" fill="#44526a" fontWeight="600">Inputs: PDF/TIFF records · EHR/FHIR · prior submissions · CMS-HCC V28 maps · coder QA data</text>
          {AG.map((g, i) => (
            <g key={g.k}>
              <g className={`agnode ${g.k === k ? 'on' : ''}`} onClick={() => setK(g.k)}>
                <rect x={g.x} y="80" width="215" height="110" rx="12" fill="#fff" stroke="#d5dbe6" strokeWidth="1.5" />
                <text x={g.x + 14} y="104" fontSize="11" fill="#4f3cc9" fontWeight="800">AGENT 0{i + 1}</text>
                <text x={g.x + 14} y="126" fontSize="15" fontWeight="700" fill="#0f1d33">{g.n}</text>
                <text x={g.x + 14} y="146" fontSize="11.5" fill="#7a869c">{g.r.length > 34 ? g.r.slice(0, 33) + '…' : g.r}</text>
                <text x={g.x + 14} y="174" fontSize="11.5" fill="#0d8a82" fontWeight="600">click for I/O →</text>
              </g>
              {i < 4 && <line x1={g.x + 215} y1="135" x2={g.x + 235} y2="135" stroke="#9aa6bd" strokeWidth="2" markerEnd="url(#ar)" />}
            </g>
          ))}
          <rect x="20" y="215" width="680" height="44" rx="10" fill="#eeebfd" stroke="#c8bff6" /><text x="360" y="242" textAnchor="middle" fontSize="13" fill="#4f3cc9" fontWeight="600">Neo4j clinical knowledge graph · ICD-10 → HCC V28 → SNOMED CT → RxNorm</text>
          <rect x="720" y="215" width="460" height="44" rx="10" fill="#e2f5f3" stroke="#a6dcd6" /><text x="950" y="242" textAnchor="middle" fontSize="13" fill="#0d8a82" fontWeight="600">Audit trail · LangSmith traces · PostgreSQL · Snowflake</text>
          <rect x="20" y="276" width="1160" height="44" rx="10" fill="#e5f6ec" /><text x="600" y="303" textAnchor="middle" fontSize="13" fill="#1b8f4e" fontWeight="600">Outputs: encounter-linked EDS submission · coder review queue · deletes · physician queries · throughput &amp; accuracy dashboard</text>
        </svg>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card" id="agDetail">
          <div className="eyebrow">{a.r}</div><h3>{a.n} Agent</h3>
          <div className="kv"><span>Receives</span><span>{a.in}</span></div>
          <div className="small muted" style={{ marginTop: 8 }}>Returns (sample from chart B):</div>
          <pre className="json">{a.out}</pre>
          <div className="stack">{a.t.map((x) => <span key={x}>{x}</span>)}</div>
          <div className="note small"><b>Guardrail:</b> {a.gr}</div>
        </div>
        <div className="card">
          <h3>Technology stack</h3>
          {Object.entries(STACK).map(([h, v]) => <div key={h} style={{ marginBottom: 6 }}><b className="small">{h}</b><div className="stack">{v.map((x) => <span key={x}>{x}</span>)}</div></div>)}
          <h3 style={{ marginTop: 16 }}>12-week go-live</h3>
          <div className="timeline">{TIMELINE.map(([w, d]) => <div key={w}><b>{w}</b><br />{d}</div>)}</div>
          <p className="xs muted">Phase breakdown is a proposed plan for the 12-week target in SA-07.</p>
        </div>
      </div>
    </>
  )
}
