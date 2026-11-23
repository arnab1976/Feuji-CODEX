import { useRef, useState } from 'react'
import RecordViewer from '../../components/RecordViewer'
import { Cite, ConfBar, HccTag } from '../../components/ui'
import { api } from '../../lib/api'
import { ChainBar } from './RunBrief'
import { useJourney } from '../../state/JourneyContext'
import { useUI } from '../../state/ui'

export default function StepRoute() {
  const { record: r, update, refresh, setStep } = useJourney()
  const { toast } = useUI()
  const [thr, setThr] = useState(r.threshold)
  const t = useRef(null)
  const res = r.result, e = r.eligibility, c = r.chart
  const call = async (p) => { try { update(await p); refresh() } catch (err) { toast(err.message) } }
  const onThr = (v) => { setThr(v); clearTimeout(t.current); t.current = setTimeout(() => call(api.patch(r.id, { threshold: v })), 120) }

  const A = res.codes.filter((x) => x.lane === 'auto'), RV = res.codes.filter((x) => x.lane === 'rev'), B = res.codes.filter((x) => x.lane === 'blocked')
  const pend = RV.filter((x) => x.final_status === 'held').length
  const reviewMin = c.time.codex_min + RV.length * (r.curated_key ? c.time.review_min / Math.max(1, RV.length) : 2.5)
  return (
    <>
      <ChainBar record={r} step={4} />
      <div className="demo">
        <div><RecordViewer record={r} ner /></div>
        <div className="card" id="routeOut">
          <h3>Stage 04 · Confidence-gated router + coder review</h3>
          {!e.passed && <div className="note bad small"><b>Eligibility gate closed:</b> {e.checks.filter((x) => x.status === 'bad').map((x) => x.detail).join('; ')}. Codes are kept as a clinical problem list only; nothing can be submitted.</div>}
          {e.warning && <div className="note warn small">Audio-only encounter: every code is routed to coder review.</div>}
          <div className="slider" style={{ marginTop: 6 }}><span className="small" style={{ whiteSpace: 'nowrap' }}>Auto-submit threshold</span>
            <input type="range" id="dThr" min="0.6" max="0.99" step="0.01" value={thr} onChange={(ev) => onThr(+ev.target.value)} /><b className="mono">{Number(thr).toFixed(2)}</b></div>
          <div className={`lanes ${B.length ? 'four' : ''}`}>
            <div className="lane auto"><h4><span>✓ Auto-submit</span><span>{A.length}</span></h4>
              {A.length ? A.map((x) => <div className="chip" key={x.icd10}><b>{x.icd10}</b> <HccTag hcc={x.hcc_v28} /><ConfBar p={x.confidence} thr={r.threshold} /></div>) : <div className="xs muted">None</div>}</div>
            <div className="lane rev"><h4><span>👤 Coder review</span><span>{RV.length}</span></h4>
              {RV.length ? RV.map((x) => (
                <div className="chip" key={x.icd10}><b>{x.icd10}</b> <HccTag hcc={x.hcc_v28} /><ConfBar p={x.confidence} thr={r.threshold} />
                  <div className="xs" style={{ marginTop: 3 }}>{x.review_reason}</div><Cite line={x.source_line}>view evidence</Cite>
                  <div>
                    <button className={`mini acc ${x.coder_decision === 'acc' ? 'sel' : ''}`} data-acc={x.icd10} onClick={() => call(api.decide(r.id, x.icd10, 'accept'))}>✓ Accept</button>
                    <button className={`mini rej ${x.coder_decision === 'rej' ? 'sel' : ''}`} data-rej={x.icd10} onClick={() => call(api.decide(r.id, x.icd10, 'reject'))}>✕ Reject</button>
                  </div></div>)) : <div className="xs muted">Nothing for coders</div>}</div>
            <div className="lane del"><h4><span>✕ Flag for deletion</span><span>{res.deletes.length}</span></h4>
              {res.deletes.length ? res.deletes.map((x) => { const kept = x.status.startsWith('kept'); return (
                <div className="chip" key={x.icd10}><b>{x.icd10}</b> <span className="tag bad">HCC {x.hcc_v28}</span>
                  <div className="xs">Support score {x.support_score.toFixed(2)}. {kept ? <b>Coder override: kept.</b> : 'Delete will be submitted.'}</div>
                  <button className="mini" data-keep={x.icd10} onClick={() => call(api.keepDelete(r.id, x.icd10, !kept))}>{kept ? '↺ Delete after all' : 'Keep (override)'}</button></div>) })
                : <div className="xs muted">No unsupported codes</div>}</div>
            {B.length > 0 && <div className="lane blk"><h4><span>⛔ Blocked (ineligible)</span><span>{B.length}</span></h4>
              {B.map((x) => <div className="chip" key={x.icd10}><b>{x.icd10}</b> <HccTag hcc={x.hcc_v28} /><div className="xs">Problem list only</div></div>)}</div>}
          </div>
          <div className="grid g3" style={{ marginTop: 12 }}>
            <div className="metric"><div className="v">{res.codes.length ? Math.round((A.length / res.codes.length) * 100) : 0}%</div><div className="l">of codes need no human touch</div></div>
            <div className="metric"><div className="v" style={{ color: pend ? 'var(--warn)' : 'var(--ok)' }}>{pend}</div><div className="l">coder decisions pending</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--ok)' }}>{reviewMin.toFixed(1)} min</div><div className="l">CODEX + review vs ~{c.time.human_min} min manual (est.)</div></div>
          </div>
          <div className="note small">Every accept, reject and override is stored by the API and written to the audit log with a timestamp. Pending codes are held and are not submitted.</div>
        </div>
      </div>
      <div className="nextbar"><button className="btn" onClick={() => setStep(3)}>‹ Back: process</button><button className="btn pri" onClick={() => setStep(5)}>Next: output &amp; download ›</button></div>
    </>
  )
}
