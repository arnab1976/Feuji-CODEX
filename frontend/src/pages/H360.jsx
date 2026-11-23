import { useEffect, useRef, useState } from 'react'
import { Html } from '../components/ui'
import content from '../data/content.json'
import { useJourney } from '../state/JourneyContext'

const { NODES, EDGES, JOURNEY } = content
const FEAS = { H: 'High', M: 'Medium', L: 'Low' }

export default function H360() {
  const { openCurated } = useJourney()
  const [sub, setSub] = useState({ prism: true, aria: true, nexus: true, codex: true })
  const [sel, setSel] = useState('e2')
  const [jStep, setJStep] = useState(-1)
  const timer = useRef(null)
  useEffect(() => () => clearInterval(timer.current), [])
  const on = (k) => (NODES[k].ext ? sub.codex : sub[k])
  const keys = Object.keys(NODES)
  const e = EDGES.find((x) => x.id === sel)
  const live = on(e.a) && on(e.b)
  const jump = (i) => { setJStep(i); setSel(JOURNEY[i][1]) }
  const play = () => { let i = 0; jump(0); clearInterval(timer.current); timer.current = setInterval(() => { i++; if (i >= JOURNEY.length) { clearInterval(timer.current); return } jump(i) }, 2600) }
  return (
    <>
      <div className="eyebrow">Healthcare 360 · PRISM · ARIA · NEXUS · CODEX</div>
      <h2>Yes, CODEX links into the stack, as its documentation-intelligence layer</h2>
      <p className="lead">PRISM owns patient identity and engagement, ARIA decides who needs attention, NEXUS runs the visit, and CODEX makes sure what was clinically assessed is coded accurately and defensibly. Toggle subscriptions to see which data flows light up, and click any arrow for its payload, feasibility and caveats.</p>
      <div className="h360">
        <div className="card">
          <div className="subs">
            {['prism', 'aria', 'nexus', 'codex'].map((k) => <label key={k} style={{ borderColor: NODES[k].c }}><input type="checkbox" checked={sub[k]} onChange={(ev) => setSub({ ...sub, [k]: ev.target.checked })} /> {NODES[k].n}</label>)}
            <span className="xs muted" style={{ alignSelf: 'center' }}>Untick to see a standalone sale</span>
          </div>
          <svg id="stackSvg" viewBox="0 0 760 470" style={{ width: '100%' }}>
            <defs>{Object.values(NODES).map((n, i) => <marker key={i} id={`m${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill={n.c} /></marker>)}</defs>
            {EDGES.map((ed) => {
              const lv = on(ed.a) && on(ed.b), n = NODES[ed.a], mi = keys.indexOf(ed.a)
              const m = ed.p.match(/[\d.]+/g).map(Number), lx = (m[0] + m[m.length - 2]) / 2, ly = (m[1] + m[m.length - 1]) / 2
              return (
                <g key={ed.id} className={`edge ${lv ? 'on' : 'off'} ${ed.id === sel ? 'hl' : ''}`} onClick={() => setSel(ed.id)}>
                  <path d={ed.p} stroke={n.c} markerEnd={`url(#m${mi})`} />
                  <path d={ed.p} stroke="transparent" strokeWidth="16" style={{ animation: 'none', strokeDasharray: 'none' }} />
                  <rect x={lx - 80} y={ly - 10} width="160" height="18" rx="5" fill="#fff" opacity=".9" />
                  <text x={lx} y={ly + 3} textAnchor="middle" fill={n.c}>{ed.lb}</text>
                </g>)
            })}
            {Object.entries(NODES).map(([k, n]) => (
              <g key={k} className={`node ${on(k) ? '' : 'off'}`}>
                <rect x={n.x} y={n.y} width="180" height={k === 'codex' ? 90 : 68} rx="14" fill={k === 'codex' ? '#eeebfd' : '#fff'} stroke={n.c} strokeWidth={k === 'codex' ? 3 : 2} strokeDasharray={n.ext ? '6 4' : undefined} />
                <text x={n.x + 90} y={n.y + 30} textAnchor="middle" fontSize="17" fontWeight="800" fill={n.c}>{n.n}</text>
                <text x={n.x + 90} y={n.y + 50} textAnchor="middle" fontSize="11.5" fill="#44526a">{n.d}</text>
                {k === 'codex' && <text x={n.x + 90} y={n.y + 72} textAnchor="middle" fontSize="10.5" fill="#4f3cc9" fontWeight="700">NEW · SA-07</text>}
              </g>))}
          </svg>
          <div className="small muted">Patient journey:</div>
          <div className="journey" id="journey">
            {JOURNEY.map((j, i) => <button key={j[0]} className={i === jStep ? 'on' : ''} onClick={() => jump(i)}>{i + 1}. {j[0]}</button>)}
            <button onClick={play}>▶ Play all</button>
          </div>
          <div className="note" id="journeyNote">
            {jStep < 0 ? 'Press a journey step to walk through one patient, from PRISM registration to a coded, CMS-submitted encounter.'
              : <><b>Step {jStep + 1}: {JOURNEY[jStep][0]}.</b> {JOURNEY[jStep][2]}{jStep === 5 && <> <a href="#journey" onClick={(ev) => { ev.preventDefault(); openCurated('C', 2) }}>Open chart C in the journey →</a></>}</>}
          </div>
        </div>
        <div>
          <div className="card" id="edgeDetail">
            <div className="eyebrow">{NODES[e.a].n} → {NODES[e.b].n}</div><h3>{e.lb}</h3>
            {live ? <span className="tag ok">active with current subscriptions</span> : <span className="tag grey">inactive: a product on this flow is not subscribed</span>}{' '}
            <span className={`feas ${e.f}`}>Feasibility: {FEAS[e.f]}</span>{e.us && <> <span className="tag warn">US MA only</span></>}
            <h4 style={{ marginTop: 12 }}>Payload</h4><p className="small" style={{ margin: 0 }}>{e.pay}</p>
            <h4 style={{ marginTop: 10 }}>Value</h4><p className="small" style={{ margin: 0 }}>{e.val}</p>
            <div className="note warn small"><b>Caveat:</b> <Html html={e.cav} /></div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Feasibility for the proposal</h3>
            <table><thead><tr><th>Market</th><th>CODEX scope</th><th>Fit</th></tr></thead><tbody>
              <tr><td>US Medicare Advantage</td><td>Full: coding, gate, EDS submission, addenda, plus the stack loop</td><td><span className="feas H">High</span></td></tr>
              <tr><td>US ACA / Medicaid managed care</td><td>Same engine; needs HHS-HCC or CDPS+Rx model packs instead of CMS-HCC</td><td><span className="feas M">Medium</span></td></tr>
              <tr><td>LATAM (PRISM base)</td><td>No CMS risk adjustment. Only the clinical coding and documentation-quality layer (ICD-10 problem lists for insurers and caregiver networks)</td><td><span className="feas L">Low–Med</span></td></tr>
            </tbody></table>
            <div className="note warn small">The stack link is technically straightforward (a shared PRISM patient ID and FHIR documents). CODEX's commercial value, however, sits mainly in US risk adjustment. Lead the proposal with US payers and risk-bearing providers, and present the LATAM stack as an optional documentation-quality add-on.</div>
          </div>
        </div>
      </div>
    </>
  )
}
