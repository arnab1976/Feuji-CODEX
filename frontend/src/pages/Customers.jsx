import { useState } from 'react'
import content from '../data/content.json'
import { Stars } from './Home/Home'

export default function Customers() {
  const SEG = content.SEG
  const [i, setI] = useState(0)
  const s = SEG[i]
  return (
    <>
      <div className="eyebrow">Who buys CODEX</div>
      <h2>B2B, sold to organisations paid on risk-adjusted revenue</h2>
      <div className="verdict">
        <div className="vbox yes"><div className="big" style={{ color: 'var(--ok)' }}>B2B ✓</div>
          <p className="small" style={{ margin: '6px 0 0' }}>Risk-adjustment revenue, coding cost and RADV audit exposure all sit with health plans and risk-bearing providers. They hold the charts, the CMS submission rights and the compliance obligations. The patient benefits from a better-documented visit, and never sees or pays for CODEX.</p></div>
        <div className="vbox no"><div className="big" style={{ color: 'var(--mute)' }}>B2C ✗</div>
          <p className="small" style={{ margin: '6px 0 0' }}>Individuals have no coding problem to solve and no budget for it. CODEX processes PHI under HIPAA, needs BAAs, and submits to CMS on a plan's behalf. That is an organisation product.</p></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="card"><h3>Target segments (click a row)</h3>
          <table id="segTbl"><thead><tr><th>Segment</th><th>Fit</th><th>Buyer</th><th>Motion</th></tr></thead>
            <tbody>{SEG.map((x, k) => <tr key={x[0]} className={`seg ${k === i ? 'on' : ''}`} onClick={() => setI(k)}><td><b className="small">{x[0]}</b></td><td><Stars n={x[1]} /></td><td className="xs">{x[2]}</td><td className="xs">{x[3]}</td></tr>)}</tbody></table></div>
        <div className="card" id="segDetail">
          <div className="eyebrow">{s[3]}</div><h3>{s[0]}</h3>
          <h4>Pain</h4><p className="small">{s[4].pain}</p><h4>CODEX hook</h4><p className="small">{s[4].hook}</p>
          <h4>Pricing unit (proposed)</h4><p className="small">{s[4].pr}</p><h4>How it is sold</h4><p className="small" style={{ margin: 0 }}>{s[4].h360}</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Suggested packaging (for the proposal)</h3>
        <div className="grid g3">
          <div className="metric"><span className="tag">CODEX Retrospective</span><p className="small">Per-chart pricing for annual chart review programmes. Encounter-linked, two-way. Fastest to sell to MA plans and to risk-adjustment vendors as white-label.</p></div>
          <div className="metric"><span className="tag t">CODEX Point-of-Care</span><p className="small">PMPM pricing. Concurrent coding of visit notes before the encounter is submitted. This is the compliance-preferred direction.</p></div>
          <div className="metric"><span className="tag warn">CODEX for home-based care</span><p className="small">Per covered life, for caregiver and home-care organisations that take risk. Charts arrive from their own document feed. A documentation-quality edition, without CMS submission, is the offer outside the US.</p></div>
        </div>
        <p className="xs muted" style={{ margin: '8px 0 0' }}>Pricing units are proposals for discussion, not validated price points.</p>
      </div>
    </>
  )
}
