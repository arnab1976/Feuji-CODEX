import { Kpis, KPIS } from '../../components/ui'
import { go } from '../../lib/useHash'
import { useJourney } from '../../state/JourneyContext'
import ArchAnim from './ArchAnim'
import HeroPic from './HeroPic'
import IOExplorer from './IOExplorer'

const REQUIREMENTS = {
  Functional: ['Ingest PDF, TIFF, handwriting and FHIR', 'Code to ICD-10 / CMS-HCC V28 with MEAT and citations', 'Calibrated confidence gate (adjustable)', 'Coder review queue; add and delete', 'Compliant physician queries', 'EDS submission and dashboards'],
  Data: ['Medical records + encounter IDs', 'Prior RAPS / EDS submissions', 'CMS-HCC V28 category maps', '1,000+ plan charts for fine-tuning', 'Certified-coder validation set'],
  Integration: ['EHR / FHIR R4', 'Claims and CMS EDS (837P encounter)', 'Document exchange (PDF, TIFF, HL7)', 'Intake API for any external sender'],
  'Non-functional & compliance': ['HIPAA, BAA with the LLM provider, PHI in the customer VPC', 'Full audit trail (LangSmith, PostgreSQL)', 'Quarterly gate recalibration + QA sampling', 'GPU inference sized for annual chart volume'],
}
const CUSTOMERS = [['Medicare Advantage health plans', 'VP Risk Adjustment · CFO · Compliance', 5], ['Risk-adjustment & payment-integrity vendors', 'White-label engine (Cotiviti-type)', 5],
  ['Risk-bearing groups, MSOs, ACO REACH', 'Point-of-care coding', 4], ['Home-based care / in-home assessment', 'Standalone coder for visit notes', 4]]
const PERSONAS = [['🧑‍💻', 'Certified coder', 'Works only the uncertain codes, with evidence and source lines already assembled. No more low-yield charts.'],
  ['📈', 'Risk-adjustment leader / CFO', '3× throughput, backlog cleared inside CMS windows, 97%+ first-pass acceptance, lower rework cost.'],
  ['🛡️', 'Compliance officer', 'Two-way coding, encounter-linked submissions, per-code audit log. Ready for RADV and DOJ scrutiny.'],
  ['🩺', 'Physician / NP', 'Fewer, clearer queries within 24 h instead of weeks later.'],
  ['🏠', 'Visit team', 'Signed visit notes are coded as soon as they arrive from the source system.'],
  ['👪', 'Patient & caregiver', 'Chronic conditions are assessed from the chart. Patients are never contacted about codes.']]
export const Stars = ({ n }) => <span className="stars">{'★'.repeat(n)}<span className="o">{'★'.repeat(5 - n)}</span></span>

export default function Home() {
  const { startJourney, openCurated } = useJourney()
  return (
    <>
      <div className="card homehero">
        <div>
          <div className="eyebrow">Independent coder · Use case 07 · Risk adjustment</div>
          <h2 className="ht">Medical records in. Accurate, defensible HCC codes out, at 3× coder throughput.</h2>
          <p className="lead">CODEX reads every chart (PDF, scanned TIFF, even handwriting), codes each risk-adjusting condition to ICD-10 and CMS-HCC V28 with cited evidence, and routes each code: <b>submit</b>, <b>coder review</b>, <b>delete</b> or <b>ask the physician</b>.</p>
          <div className="ctrls">
            <button className="btn pri big" onClick={startJourney}>▶ Connect sources</button>
            <button className="btn big" onClick={() => openCurated('B', 2)}>Try a sample chart</button>
            <button className="btn big" onClick={() => go('knowledge')}>Knowledge bank</button>
          </div>
          <div className="jchips">{['Sources', '1 · Input', '2 · Validate', '3 · Process', '4 · Review & route', '5 · Output'].map((s, i) => <span key={s} style={{ display: 'contents' }}>{i > 0 && <b>→</b>}<span>{s}</span></span>)}</div>
        </div>
        <div><HeroPic /></div>
      </div>

      <Kpis items={KPIS} />

      <div className="grid g2">
        <div className="card"><div className="eyebrow">Objective</div><h3>What CODEX must achieve</h3>
          <p>Automate HCC medical-record coding at <b>3× certified-coder throughput</b> with <b>&gt;90% code accuracy</b>, raising first-pass CMS acceptance from <b>85–90% to 97%+</b> and removing about <b>$1.5M</b> of backlog cost per plan per year, live in <b>12 weeks</b>.</p>
          <p className="xs muted" style={{ margin: 0 }}>Targets from the Feuji × Cotiviti SA-07 solution architecture.</p></div>
        <div className="card"><div className="eyebrow">Purpose</div><h3>Why it exists</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li><b>Close the capacity gap:</b> record volumes exceed what certified coders can clear inside CMS deadlines.</li>
            <li><b>Make every code defensible:</b> cited MEAT evidence, two-way coding (add <i>and</i> delete), encounter-linked submission.</li>
            <li><b>Spend coder time where it matters:</b> about 40% of coder time today goes on low-yield records.</li>
            <li><b>Code from the outside:</b> charts arrive from the customer's own systems, and CODEX returns encounter-linked codes, deletes, and queries.</li>
          </ul></div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card req"><div className="eyebrow">Requirements</div><h3>What the solution needs</h3>
          <div className="grid g2" style={{ gap: '6px 18px' }}>
            {Object.entries(REQUIREMENTS).map(([h, items]) => <div key={h}><h4>{h}</h4><ul className="small">{items.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
          </div></div>
        <div className="card"><div className="eyebrow">Target customer · B2B</div><h3>Who buys it</h3>
          <table><tbody>{CUSTOMERS.map(([n, s, f]) => <tr key={n}><td><b>{n}</b><div className="xs muted">{s}</div></td><td><Stars n={f} /></td></tr>)}</tbody></table>
          <div className="note small">Sold to plans, coding companies, and risk-bearing providers. Patients never see or pay for CODEX. <a href="#knowledge/customers" onClick={(e) => { e.preventDefault(); go('knowledge/customers') }}>Full segment analysis →</a></div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}><div className="eyebrow">Animated architecture</div><h3>How data flows through CODEX</h3><ArchAnim /></div>

      <div className="card" style={{ marginTop: 16 }}><div className="eyebrow">End-user benefits</div><h3>What changes for each person who touches it</h3>
        <div className="grid g3">{PERSONAS.map(([ic, t, d]) => <div key={t} className="persona"><div className="ic">{ic}</div><b>{t}</b><p>{d}</p></div>)}</div></div>

      <IOExplorer />

      <div className="cta">
        <div><h3 style={{ margin: 0, color: '#fff' }}>Ready to connect a source and code a chart?</h3><div className="small" style={{ color: '#d6dcff' }}>Retrieve charts from an external system, or bring a file in yourself, then download every output.</div></div>
        <button className="btn big" onClick={startJourney}>▶ Connect sources</button>
      </div>
    </>
  )
}
