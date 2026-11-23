import { Html } from '../components/ui'
import content from '../data/content.json'

const CHANGES = [
  ['"Auto-submitted to CMS RAPS/EDPS"', 'Encounter-linked submission via EDS (chart review records always linked to an encounter)', 'V28 (100% from 2026) scores from encounter data and FFS claims only; CMS excludes unlinked chart reviews from CY2027'],
  ['Addendum AI "drafts addendum requests that would improve HCC capture"', '<b>Non-leading, multiple-choice clinical queries</b>, sent within 24 h of the visit, with "not assessed / undetermined" options and a route to "address at next visit"', 'Delayed, revenue-driven addenda were central to the 2026 Kaiser settlement'],
  ['Codes "above threshold auto-submitted"', 'Codes auto-submitted only if eligible (face-to-face, acceptable provider, MEAT evidence cited) <b>and</b> above threshold; unsupported codes are flagged for deletion', 'One-directional chart review is a named DOJ enforcement theory'],
  ['KPI framing on HCC capture', 'Lead with accuracy, coder throughput, RADV defensibility and turnaround; report adds <b>and</b> deletes', "Buyers' compliance teams now screen vendors on this"]]
const LEVEL = { bad: 'Must-have', warn: 'Core control', ok: 'Hygiene' }

export default function Compliance() {
  return (
    <>
      <div className="eyebrow">Compliance guardrails · read before proposing</div>
      <h2>Built for today's enforcement climate, not 2022's</h2>
      <p className="lead">Risk-adjustment coding is the top Medicare Advantage enforcement priority in 2026. A coding engine that only adds codes, or an "Addendum AI" that nudges physicians after the fact, is exactly the pattern DOJ has penalised this year. CODEX should be positioned, and the SA-07 design tightened, around the guardrails below. Each one is enforced in code in <code>backend/app/agents/</code>.</p>
      <div className="grid g2" id="compGrid">
        {content.COMP.map((c) => (
          <div className="card" key={c[0]}><span className={`tag ${c[3]}`}>{LEVEL[c[3]]}</span><h3 style={{ marginTop: 6 }}>{c[0]}</h3>
            <Html as="p" className="small" style={{ margin: '0 0 6px' }} html={c[1]} /><div className="xs muted">Why it matters now: {c[2]}</div></div>))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recommended changes to the SA-07 document before it goes to a client</h3>
        <table><thead><tr><th>SA-07 today</th><th>Recommended wording / design</th><th>Why</th></tr></thead>
          <tbody>{CHANGES.map((r) => <tr key={r[0]}><td>{r[0]}</td><td><Html html={r[1]} /></td><td>{r[2]}</td></tr>)}</tbody></table>
      </div>
    </>
  )
}
