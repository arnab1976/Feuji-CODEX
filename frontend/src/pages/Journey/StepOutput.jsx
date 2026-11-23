import RecordViewer from '../../components/RecordViewer'
import { Cite, Meat } from '../../components/ui'
import { api, download } from '../../lib/api'
import { ChainBar, MetricsPanel } from './RunBrief'
import { postToParent } from '../../lib/bridge'
import { useJourney } from '../../state/JourneyContext'
import { useUI } from '../../state/ui'

const STATUS = { submit: ['ok', 'submitted'], held: ['warn', 'held: coder'], rejected: ['bad', 'rejected by coder'], blocked: ['grey', 'blocked: ineligible'] }
const MEAT = { M: 'monitored', E: 'evaluated', A: 'assessed', T: 'treated' }

function pct(n) { return `${Math.round(Number(n) * 100)}%` }
function evidenceOf(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > 180 ? `${t.slice(0, 177)}…` : t
}
function meatPhrase(meat) {
  const words = [...(meat || '')].map((l) => MEAT[l]).filter(Boolean)
  return words.length ? words.join(', ') : 'no monitored, evaluated, assessed, or treated evidence'
}

function coderBrief(r) {
  const res = r.result
  const codes = res.codes || []
  const deletes = res.deletes || []
  const thr = res.threshold ?? r.threshold
  const enc = r.meta?.enc || 'this encounter'
  const name = r.meta?.patient || r.name || 'This patient'
  const eligible = res.eligibility?.passed !== false
  const held = codes.filter((x) => x.final_status === 'held')
  const submitted = codes.filter((x) => x.final_status === 'submit')
  const gap = r.chart?.gap
  const rows = codes.map((x) => {
    const hcc = x.hcc_v28 ? `HCC ${x.hcc_v28}` : 'no risk-adjustment category'
    const evidence = evidenceOf(x.source_text)
    const score = `Confidence ${pct(x.confidence)}. The auto-submit bar is ${pct(thr)}.`
    let status
    let recommendation
    if (x.final_status === 'held') {
      status = `Waiting for you. ${score}`
      recommendation = `Open Review & route and decide ${x.icd10}. Accept it if “${x.description}” should be submitted on ${enc}. Reject it if it should stay off the submission. It is waiting because ${x.review_reason || 'the score is below the auto-submit bar.'} Evidence recorded: ${meatPhrase(x.meat)}.`
    } else if (x.final_status === 'submit') {
      status = `Ready to submit. ${score}`
      recommendation = `No further decision. Include ${x.icd10} on the submission for ${enc}.`
    } else if (x.final_status === 'rejected') {
      status = 'Left off the submission. You rejected it.'
      recommendation = `Do not add ${x.icd10} back unless you return to Review & route and accept it.`
    } else {
      status = 'Not eligible to submit.'
      recommendation = `Do not submit ${x.icd10}. This encounter failed an eligibility check, so the code stays on the problem list only.`
    }
    return { key: x.icd10, output: `${x.icd10} · ${x.description} · ${hcc}`, status, recommendation, evidence }
  })
  deletes.forEach((x) => {
    const kept = String(x.status || '').startsWith('kept')
    rows.push({
      key: `del-${x.icd10}`,
      output: `${x.icd10} · ${x.description || 'Claim diagnosis'} · on the claim, not in the note`,
      status: kept ? 'Kept on the claim. You overrode the delete.' : 'Remove from the claim.',
      recommendation: kept
        ? `Leave ${x.icd10} on the claim. You already chose to keep it.`
        : `Submit a delete for ${x.icd10} on ${enc}. The note does not support this claim diagnosis.`,
      evidence: evidenceOf(x.rationale),
    })
  })
  const steps = []
  if (!eligible) steps.push('Do not send a submission. The encounter is not eligible, so this output is a problem list only.')
  if (held.length) {
    const list = held.map((x) => x.icd10).join(', ')
    steps.push(`Decide ${list} on Review & route before you send anything. Accept adds the code to the submission. Reject leaves it off.`)
    steps.push('Return to this page after the decision. “Codes submitted” counts only the codes you accepted.')
    steps.push('Do not press Return result to the source while a code is still waiting. The file sent now would omit it.')
  }
  const openDeletes = deletes.filter((x) => !String(x.status || '').startsWith('kept'))
  if (eligible && openDeletes.length) steps.push(`Include the delete for ${openDeletes.map((x) => x.icd10).join(', ')} in the same submission. The claim has it and the note does not support it.`)
  if (gap && !r.query_response) steps.push(`Send the physician query for ${gap.code} before anyone codes that condition. Do not add it from the lab result alone.`)
  if (eligible && !held.length) steps.push(submitted.length || openDeletes.length
    ? 'Download the EDS submission payload, or press Return result to the source. That payload is the file the sending system should use.'
    : 'No diagnosis is waiting and none is on the submission. Download the result, or return it, only if an empty submission is what the source should receive.')
  const headline = !eligible
    ? `${name}. Nothing from this encounter can be submitted.`
    : held.length
      ? `${name}. ${codes.length} diagnosis code${codes.length === 1 ? '' : 's'} produced. ${submitted.length} on the submission, ${held.length} waiting for your decision.`
      : `${name}. ${submitted.length} diagnosis code${submitted.length === 1 ? '' : 's'} on the submission. No coder decision is waiting.`
  return { headline, steps, rows, held: held.length > 0 }
}

export default function StepOutput() {
  const { record: r, update, refresh, setStep, startJourney, records } = useJourney()
  const { toast, openModal } = useUI()
  const res = r.result, s = res.summary, gap = r.chart.gap
  const dl = (kind) => download(`/api/records/${r.id}/export/${kind}`).then((n) => toast('Downloaded ' + n)).catch((e) => toast(e.message))
  const respond = async (v) => { update(await api.queryResponse(r.id, v)); refresh() }
  const send = async () => {
    const { message, webhook } = await api.bridgeResult(r.id)
    if (postToParent(message)) toast('Result returned to the source for ' + r.meta.prism)
    else openModal(<><h3>Message for the source system</h3>
      <p className="small">This page is not embedded, so here is exactly what the sending system receives via <code>postMessage</code>{webhook ? ` (also POSTed to the webhook: ${JSON.stringify(webhook)})` : ''}:</p>
      <pre className="json" style={{ maxHeight: 420 }}>{JSON.stringify(message, null, 2)}</pre></>)
  }
  const RESP = {
    yes: <div className="note ok small"><b>Physician response:</b> condition documented, consistent with the assessment on {r.meta.dos}. Addendum signed and dated. <b className="mono">{gap?.code}</b> (HCC {gap?.hcc}) added to the <i>same linked encounter</i>; query and response archived for RADV.</div>,
    next: <div className="note gap small"><b>Physician response:</b> "Not assessed at that visit; will evaluate at the next visit." Nothing is added. The condition stays on the coder worklist for a later encounter.</div>,
    und: <div className="note small"><b>Physician response:</b> "Clinically undetermined." Query closed; nothing coded. The logged response is also audit evidence that queries are non-leading.</div>,
  }
  const DLS = [['zip', 'All outputs for this record (.zip)', `results, codes, audit log, EDS payload, input${gap ? ', query' : ''}`], ['json', 'Full results (.json)', 'everything CODEX produced, machine-readable'],
    ['codes', 'Codes (.csv)', 'ICD-10, HCC, confidence, MEAT, lane, status, source text'], ['audit', 'Audit log (.csv)', 'every routing step and coder decision, timestamped'],
    ['eds', 'EDS submission payload (.json)', 'encounter-linked adds / deletes'], ['input', 'Input record (.txt)', 'the note and metadata as processed'],
    ...(gap ? [['query', 'Physician query (.txt)', 'non-leading, ready to send']] : [])]
  const dlSession = () => download('/api/session/export').then((n) => { toast('Downloaded ' + n); refresh() }).catch((e) => toast(e.message))
  const brief = coderBrief(r)
  return (
    <>
      <ChainBar record={r} step={5} />
      <MetricsPanel record={r} />
      <div className="demo">
        <div><RecordViewer record={r} ner /></div>
        <div className="card" id="outOut">
          <h3>Stage 05 · Outputs</h3>
          <section className="advice" id="coderNext">
            <h4>Output and what to do next</h4>
            <p className="small" style={{ marginTop: 0 }}>{brief.headline}</p>
            <ol className="nextsteps">
              {brief.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            {brief.held && <button className="btn pri" id="goDecide" onClick={() => setStep(4)}>Decide on Review &amp; route</button>}
            {brief.rows.length > 0 && (
              <table>
                <thead><tr><th>Output</th><th>Where it stands</th><th>Recommendation</th></tr></thead>
                <tbody>
                  {brief.rows.map((row) => (
                    <tr key={row.key}>
                      <td><b>{row.output}</b>{row.evidence && <div className="xs muted">Chart: “{row.evidence}”</div>}</td>
                      <td className="small">{row.status}</td>
                      <td className="small">{row.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <div className="grid g4" style={{ gap: 8 }}>
            <div className="metric"><div className="v" style={{ color: 'var(--ok)' }}>{s.submitted.length}</div><div className="l">codes submitted</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--warn)' }}>{s.held_for_review.length}</div><div className="l">held for coder</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--bad)' }}>{s.deleted.length}</div><div className="l">deletes submitted</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--gap)' }}>{s.queries}</div><div className="l">physician queries</div></div>
          </div>
          <h4 style={{ marginTop: 14 }}>⬇ Download outputs</h4>
          <div className="dlgrid">
            {DLS.map(([k, t, d]) => <button key={k} data-dl={k} onClick={() => dl(k)}><b>{t}</b><span>{d}</span></button>)}
            <button data-dl="session" onClick={dlSession}><b>Whole session (.zip)</b><span>all {records.length} record(s) + session summary</span></button>
          </div>
          <div className="ctrls" style={{ marginTop: 10 }}><button className="btn pri" id="sendP360" onClick={send}>⇪ Return result to the source</button><span className="xs muted">Posts <code>codex:result</code> to the sending system when embedded (and to the webhook if configured).</span></div>
          <h4 style={{ marginTop: 14 }}>EDS submission payload (preview)</h4>
          <pre className="json">{JSON.stringify(res.eds_payload, null, 2)}</pre>
          <h4>Per-code audit log</h4>
          <table><thead><tr><th>Code</th><th>Status</th><th>Evidence</th><th>Conf.</th></tr></thead>
            <tbody>
              {res.codes.map((x) => <tr key={x.icd10}><td className="mono">{x.icd10}</td><td><span className={`tag ${STATUS[x.final_status][0]}`}>{STATUS[x.final_status][1]}</span></td><td><Cite line={x.source_line}>{x.source_line}</Cite> <Meat m={x.meat || ''} /></td><td className="mono">{x.confidence.toFixed(2)}</td></tr>)}
              {res.deletes.map((x) => <tr key={x.icd10}><td className="mono">{x.icd10}</td><td>{x.status.startsWith('kept') ? <span className="tag grey">kept (override)</span> : <span className="tag bad">delete submitted</span>}</td><td>no support</td><td className="mono">{x.support_score.toFixed(2)}</td></tr>)}
            </tbody></table>
          {gap ? (
            <>
              <h4 style={{ marginTop: 14 }}>Addendum AI: compliant physician query</h4>
              <pre className="raw">{res.physician_query.text}</pre>
              <div className="ctrls"><span className="small">Simulate physician response:</span>
                <button className="btn small" data-r="yes" onClick={() => respond('yes')}>Condition documented</button>
                <button className="btn small" data-r="next" onClick={() => respond('next')}>Assess at next visit</button>
                <button className="btn small" data-r="und" onClick={() => respond('und')}>Undetermined</button></div>
              {r.query_response && RESP[r.query_response]}
            </>) : <div className="note small" style={{ marginTop: 12 }}>No documentation gaps detected, so no physician query is needed.</div>}
        </div>
      </div>
      <div className="nextbar"><button className="btn" onClick={() => setStep(4)}>‹ Back: review</button>
        <span><button className="btn" onClick={startJourney}>+ Add another record</button> <button className="btn pri" onClick={dlSession}>⬇ Download whole session</button></span></div>
    </>
  )
}
