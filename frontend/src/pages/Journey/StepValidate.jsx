import { api, download } from '../../lib/api'
import { ChainBar } from './RunBrief'
import { useJourney } from '../../state/JourneyContext'
import { useUI } from '../../state/ui'

const PTYPES = ['MD', 'DO', 'NP', 'PA', 'RN', 'Caregiver / aide', 'Chatbot']
const VISITS = ['Face-to-face', 'Telehealth (video)', 'Audio-only', 'No encounter (chart only)']
const QUALITY = ['Digital text', 'Scanned', 'Handwritten']

export function Eligibility({ e }) {
  return (
    <>
      {e.checks.map((c) => (
        <div className="chk" key={c.check}><i className={c.status}>{c.status === 'ok' ? '✓' : c.status === 'warn' ? '!' : '✕'}</i><div><b>{c.check}</b><div className="xs muted">{c.detail}</div></div></div>
      ))}
      <div className={`note small ${e.passed ? (e.warning ? 'warn' : 'ok') : 'bad'}`}>
        {e.passed ? (e.warning ? 'Passes with a warning. All codes will go to coder review.' : 'Eligible. Codes above the threshold can be auto-submitted.')
          : 'Not eligible for submission. CODEX will still build a problem list so you can see the outputs.'}
      </div>
    </>
  )
}

export default function StepValidate() {
  const { record: r, update, refresh, setStep } = useJourney()
  const { toast } = useUI()
  const m = r.meta
  const save = async (k, v) => {
    if (String(m[k]) === String(v)) return
    try { update(await api.patch(r.id, { meta: { [k]: k === 'signed' ? v === 'yes' : v }, ...(k === 'patient' ? { name: v } : {}) })); refresh() } catch (e) { toast(e.message) }
  }
  const Inp = ({ k }) => <input data-m={k} defaultValue={m[k]} onBlur={(e) => save(k, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
  const Sel = ({ k, opts, val }) => <select data-m={k} value={val ?? m[k]} onChange={(e) => save(k, e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
  return (
    <>
      <ChainBar record={r} step={2} />
      <div className="grid g2">
        <div className="card"><div className="eyebrow">Step 2 · input check</div><h3>Record metadata</h3>
          <p className="xs muted" style={{ marginTop: 0 }}>Read from the file where present; edit anything. Changes re-run eligibility and reset processing.</p>
          <div className="fgrid">
            <div className="fld"><label>Patient</label><Inp k="patient" /></div>
            <div className="fld"><label>External patient ID</label><Inp k="prism" /></div>
            <div className="fld"><label>Member ID</label><Inp k="member" /></div>
            <div className="fld"><label>Encounter ID</label><Inp k="enc" /></div>
            <div className="fld"><label>Date of service</label><Inp k="dos" /></div>
            <div className="fld"><label>Rendering provider</label><Inp k="prov" /></div>
            <div className="fld"><label>Provider type</label><Sel k="ptype" opts={PTYPES} /></div>
            <div className="fld"><label>Visit type</label><Sel k="visit" opts={VISITS} /></div>
            <div className="fld"><label>Source quality</label><Sel k="quality" opts={QUALITY} /></div>
            <div className="fld"><label>Signed by clinician</label><Sel k="signed" opts={['yes', 'no']} val={m.signed ? 'yes' : 'no'} /></div>
          </div>
          {r.curated_key && <div className="note small">Curated demo chart: metadata edits change eligibility; the coded content stays curated.</div>}
        </div>
        <div className="card"><h3>Eligibility gate</h3><div id="eligBox"><Eligibility e={r.eligibility} /></div>
          <h3 style={{ marginTop: 14 }}>Parsed structure</h3>
          <div className="small">{r.preview.length} section(s): {r.preview.map((s) => <span key={s.title} className="tag grey">{s.title} · {s.lines.length}</span>)}</div>
          <pre className="raw">{r.text}</pre>
          <button className="btn small" onClick={() => download(`/api/records/${r.id}/export/input`)}>⬇ Download input record</button>
        </div>
      </div>
      <div className="nextbar"><button className="btn" onClick={() => setStep(1)}>‹ Back: input</button><button className="btn pri" onClick={() => setStep(3)}>Next: process ›</button></div>
    </>
  )
}
