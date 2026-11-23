import { useState } from 'react'
import RecordViewer from '../../components/RecordViewer'
import { Cite, ConfBar, HccTag, Meat } from '../../components/ui'
import { api } from '../../lib/api'
import { ChainBar } from './RunBrief'
import { useJourney } from '../../state/JourneyContext'
import { useUI } from '../../state/ui'

const STG = ['Layout extraction', 'Entity extraction', 'HCC coder']
const inflight = new Map()

function StageView({ r, view }) {
  const m = r.meta, c = r.chart, e = r.eligibility
  if (view === 0 || !c) return (
    <>
      <h3>Document received</h3>
      <div className="kv"><span>Source</span><span>{r.source}{c ? ` · ${c.fmt}` : ''}</span><span>Encounter</span><span className="mono">{m.enc}</span>
        <span>Member</span><span className="mono">{m.member}</span><span>External patient ID</span><span className="mono">{m.prism}</span>
        <span>Visit type</span><span>{m.visit}</span><span>Rendering provider</span><span>{m.prov} ({m.ptype})</span></div>
      <div className={`note ${e.passed ? (e.warning ? 'warn' : 'ok') : 'bad'} small`} style={{ marginTop: 12 }}>
        {e.passed ? (e.warning ? 'Eligibility: passed with a warning. Codes will all go to coder review.' : 'Eligibility pre-check passed. Codes may be auto-submitted.') : 'Eligibility gate closed: CODEX will still extract a problem list, but nothing can be submitted.'}</div>
      <div className="note small">CODEX does not start on its own. Press <b>Run CODEX</b> for stage 1, then <b>Next stage</b> for each following stage.</div>
    </>)
  if (view === 1) return (
    <>
      <h3>Stage 01 · Layout extraction</h3>
      <div className="small muted">Input is the validated chart text. Engine: {c.ocr.engine} · Mean confidence <b>{c.ocr.mean_confidence.toFixed(2)}</b>. These blocks are the input to entity extraction.</div>
      <table style={{ marginTop: 8 }}><thead><tr><th>Layout block</th><th>Type</th><th>Confidence</th></tr></thead>
        <tbody>{c.ocr.blocks.map((b) => <tr key={b.block}><td>{b.block}</td><td>{b.type}</td><td><ConfBar p={b.confidence} thr={r.threshold} /></td></tr>)}</tbody></table>
      <h4 style={{ marginTop: 14 }}>Knowledge-graph context injected</h4>
      <div className="small muted" style={{ marginBottom: 6 }}>Dictionary context for each matched phrase: ICD-10 and CMS-HCC V28. This demo does not query a graph database.</div>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{c.kg.map((k) => <li key={k}>{k}</li>)}</ul>
      {c.ocr.mean_confidence < 0.9 && <div className="note warn small">Low-confidence source: uncertainty is carried forward into the confidence gate.</div>}
    </>)
  if (view === 2) return (
    <>
      <h3>Stage 02 · Entity extraction</h3>
      <div className="small muted">Input is the line list from stage 01. The running method is the condition dictionary with negation and history windows. BioBERT and Med-BERT are not called.</div>
      <table style={{ marginTop: 8 }}><thead><tr><th>Entity</th><th>Type</th><th>Flag</th><th>Preliminary</th><th>Conf.</th></tr></thead>
        <tbody>{c.entities.length ? c.entities.map((x, i) => <tr key={i}><td>{x.text}</td><td>{x.type}</td><td>{x.flag}</td><td className="mono">{x.preliminary}</td><td>{x.confidence ? <ConfBar p={x.confidence} thr={r.threshold} /> : <span className="tag bad">absent</span>}</td></tr>)
          : <tr><td colSpan={5} className="muted">No clinical entities found.</td></tr>}</tbody></table>
    </>)
  return (
    <>
      <h3>Stage 03 · HCC coder</h3>
      <div className="small muted">Input is the layout from stage 01 and the entities from stage 02. The running coder is the deterministic MEAT and combination-rule program. The fine-tuned LLM hook is not called. Click a <span className="cite">source</span> chip to jump to the evidence.</div>
      <table style={{ marginTop: 8 }}><thead><tr><th>Code</th><th>V28</th><th>MEAT</th><th>Rationale</th><th /></tr></thead>
        <tbody>
          {c.codes.map((x) => <tr key={x.icd10}><td><b className="mono">{x.icd10}</b><div className="xs muted">{x.description}</div></td><td><HccTag hcc={x.hcc} /><div className="xs muted">{x.hcc_label}</div></td><td><Meat m={x.meat} /></td><td className="small">{x.rationale}</td><td><Cite line={x.source_line} /></td></tr>)}
          {!c.codes.length && <tr><td colSpan={5} className="muted">No codable conditions found.</td></tr>}
          {c.deletes.map((x) => <tr key={x.icd10} className="hl-row"><td><b className="mono" style={{ textDecoration: 'line-through' }}>{x.icd10}</b><div className="xs muted">{x.description}</div></td><td><span className="tag bad">unsupported</span></td><td><Meat m="" /></td><td className="small">{x.rationale}</td><td><Cite line={x.source_line} /></td></tr>)}
        </tbody></table>
      {c.interactions.length > 0 && <div className="note small">V28 interaction flags: {c.interactions.map((i) => <span key={i} className="tag t">{i}</span>)}</div>}
      {c.notes.map((n) => <div key={n} className="note small">{n}</div>)}
      {c.gap && <div className="note gap small"><b>Documentation gap:</b> {c.gap.finding} CODEX does <u>not</u> code from labs alone. This goes to the Addendum AI as a query.</div>}
    </>)
}

export default function StepProcess() {
  const { record: r, update, refresh, setStep } = useJourney()
  const { toast } = useUI()
  const [stage, setStage] = useState(0)
  const [view, setView] = useState(0)

  const show = (n) => { setStage(n); setView(n) }
  const codeChart = async (force = false) => {
    if (r.chart && !force) return r
    let job = inflight.get(r.id)
    if (!job) {
      job = api.process(r.id).finally(() => inflight.delete(r.id))
      inflight.set(r.id, job)
    }
    const nextRecord = await job
    update(nextRecord)
    refresh()
    return nextRecord
  }
  const begin = async (force = false) => {
    try {
      await codeChart(force)
      show(1)
    } catch (e) { toast(e.message) }
  }
  const restart = () => show(0)
  const next = async () => {
    try {
      if (stage === 0 || !r.chart) await codeChart(false)
      show(stage >= 3 ? 1 : stage + 1)
    } catch (e) { toast(e.message) }
  }

  return (
    <>
      <ChainBar record={r} step={3} />
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="ctrls">
          <button className="btn pri" id="pRun" onClick={() => begin(false)}>▶ Run CODEX</button>
          <button className="btn" id="pStep" disabled={stage >= 3} onClick={next}>Next stage ›</button>
          <button className="btn" id="pReset" onClick={() => begin(true)}>↺ Re-run</button>
          <button className="btn" id="pRestart" onClick={restart}>↺ Restart</button>
          <span className="small muted" id="pStat">{stage === 0 ? 'CODEX has not started. Press Run CODEX for stage 1, then Next stage for each following stage.' : stage < 3 ? `Stage ${stage} of 3 is ready. Press Next stage to continue.` : 'Extraction and coding complete. The code set is the input to review and route.'}</span>
        </div>
        <div className="stepper" id="pStepper">
          {STG.map((t, i) => (
            <button key={t} className={`step ${i + 1 <= stage ? 'done' : ''} ${i + 1 === view ? 'cur' : ''}`} disabled={i + 1 > stage} onClick={() => setView(i + 1)}>
              <div className="n">STAGE 0{i + 1}{i + 1 <= stage ? ' ✓' : ''}</div><div className="t">{t}</div><div className="bar" />
            </button>
          ))}
          <button className="step" disabled><div className="n">STAGE 04–05</div><div className="t">Gate · submission → step 4–5</div></button>
        </div>
      </div>
      <div className="demo" style={{ marginTop: 12 }}>
        <div><RecordViewer record={stage > 0 ? r : { ...r, chart: null }} blocks={view === 1} ner={stage >= 2 && view >= 2} /></div>
        <div className="card out" id="stageOut"><StageView r={r} view={stage > 0 ? view : 0} /></div>
      </div>
      <div className="nextbar"><button className="btn" onClick={() => setStep(2)}>‹ Back: validate</button>
        <button className="btn pri" id="toRoute" disabled={stage < 3} onClick={() => setStep(4)}>Next: review &amp; route ›</button></div>
    </>
  )
}
