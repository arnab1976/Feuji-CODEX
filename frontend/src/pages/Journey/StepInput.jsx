import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useJourney } from '../../state/JourneyContext'
import { useUI } from '../../state/ui'
import { ChainBar } from './RunBrief'
import { activeOption, downloadDoc, downloadSourceZip, ensureLoaded, forgetLoaded, pickedIds, selectedDocs, SOURCE_DOCS } from './sourceDocs'

const GROUPS = [
  ['ehr', 'Option C · EHR / FHIR R4', 'Selected chart records'],
  ['claims', 'Option D · Claims & encounter feed', 'Selected encounter-packet records'],
  ['docs', 'Option E · Document exchange', 'Selected exchanged documents'],
  ['api', 'Option F · Intake API', 'Selected posted records'],
]

function EhrNote({ doc }) {
  const m = doc.meta
  return (
    <article className="doc ehr">
      <header><span>FHIR R4 · {doc.fhir}</span><b>{m.enc}</b></header>
      <h4>{m.patient}</h4>
      <p className="xs muted">{m.dos} · {m.prov} · {m.visit} · {m.prism}</p>
      {doc.sections.map(([h, t]) => <section key={h}><b>{h}</b><p>{t}</p></section>)}
    </article>
  )
}

function ClaimSheet({ doc }) {
  const m = doc.meta
  return (
    <article className="doc claim">
      <header><span>837P professional encounter</span><b>{m.enc}</b></header>
      <div className="claimgrid">
        <div><span>Patient</span><b>{m.patient}</b></div>
        <div><span>Member</span><b>{m.member}</b></div>
        <div><span>External ID</span><b>{m.prism}</b></div>
        <div><span>Date of service</span><b>{m.dos}</b></div>
        <div><span>Rendering</span><b>{m.prov}</b></div>
        <div><span>Visit</span><b>{m.visit}</b></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>ICD-10</th><th>Diagnosis on the claim</th><th>In the note?</th></tr></thead>
        <tbody>{doc.dx.map(([n, code, name, where]) => <tr key={code}><td>{n}</td><td className="mono">{code}</td><td>{name}</td><td>{where}</td></tr>)}</tbody>
      </table>
      <p>{doc.note}</p>
    </article>
  )
}

function HandRx({ doc }) {
  return (
    <article className="doc rx">
      <div className="rxhead"><b>{doc.who}</b><span>Handwritten doctor's prescription</span></div>
      <p className="xs">{doc.meta.patient} · {doc.meta.dos} · {doc.meta.prism}</p>
      <div className="script">{doc.lines.map((l) => <div key={l}>{l}</div>)}</div>
    </article>
  )
}

function ERx({ doc }) {
  return (
    <article className="doc ehr">
      <header><span>Electronic prescription · MedicationRequest</span><b>{doc.meta.enc}</b></header>
      <h4>{doc.meta.patient}</h4>
      <p className="xs muted">{doc.meta.dos} · signed by {doc.meta.prov} · {doc.meta.prism}</p>
      <section><b>Orders</b>{doc.orders.map((line) => <p key={line}>{line}</p>)}</section>
    </article>
  )
}

function PathReport({ doc }) {
  return (
    <article className="doc ehr">
      <header><span>Pathology report</span><b>{doc.meta.enc}</b></header>
      <h4>{doc.meta.patient}</h4>
      <p className="xs muted">{doc.meta.dos} · {doc.meta.prov} · {doc.meta.prism}</p>
      <section><b>Specimen</b><p>{doc.specimen}</p></section>
      <section><b>Final diagnosis</b><p>{doc.diagnosis}</p></section>
      <section><b>Comment</b><p>{doc.comment}</p></section>
    </article>
  )
}

function ApiPush({ doc }) {
  const preview = {
    type: 'codex.chart.push', partner: doc.partner, patient: doc.meta.patient, prism: doc.meta.prism,
    encounter: doc.meta.enc, dos: doc.meta.dos, provider: doc.meta.prov,
    note: doc.summary,
  }
  return (
    <article className="doc api">
      <header><span>POST /api/records · {doc.partner}</span><b>201 accepted</b></header>
      <pre>{JSON.stringify(preview, null, 2)}</pre>
      <div className="apinote">
        <b>Visit note inside the payload</b>
        <p>{doc.summary} Seen by {doc.meta.prov}.</p>
      </div>
    </article>
  )
}

const VIEW = { ehr: EhrNote, claim: ClaimSheet, rx: HandRx, erx: ERx, path: PathReport, api: ApiPush }

export default function StepInput() {
  const { records, record, setStep, afterCreate, showSources, pin, refresh } = useJourney()
  const { toast } = useUI()
  const [option, setOption] = useState(activeOption)
  const [pickKey, setPickKey] = useState(() => pickedIds().join('|'))
  const chosen = selectedDocs()
  const idKey = `${option}|${pickKey}`
  const systemNames = new Set(SOURCE_DOCS.map((d) => d.sourceName))

  useEffect(() => { setOption(activeOption()); setPickKey(pickedIds().join('|')) }, [])
  useEffect(() => {
    const fromFile = option === 'A' || option === 'B'
    if (record || fromFile) return undefined
    const doc = selectedDocs()[0]
    if (!doc) return undefined
    const row = records.find((r) => r.name === doc.meta.patient && r.source === doc.sourceName)
    if (row) { pin(row.id); return undefined }
    let stop = false
    const t = setTimeout(async () => {
      const list = await refresh()
      if (stop) return
      const found = list.find((r) => r.name === doc.meta.patient && r.source === doc.sourceName)
      if (found) pin(found.id)
    }, 500)
    return () => { stop = true; clearTimeout(t) }
  }, [record, records, option, pin, refresh, idKey])
  useEffect(() => {
    let gone = false
    const run = async () => {
      const current = activeOption()
      const list = await api.list()
      if (current === 'A' || current === 'B') {
        for (const row of list.filter((r) => systemNames.has(r.source))) await api.remove(row.id)
        if (gone) return
        const left = await refresh()
        if (left.length) pin(left[left.length - 1].id)
        return
      }
      const docs = selectedDocs()
      if (!docs.length) return
      const names = new Set(docs.map((d) => d.meta.patient))
      const sourceName = docs[0].sourceName
      for (const row of list) {
        if (row.source !== sourceName || !names.has(row.name)) await api.remove(row.id)
      }
      const kept = (await api.list()).filter((r) => r.source === sourceName && names.has(r.name))
      const have = new Set(kept.map((r) => r.name))
      const missing = docs.filter((d) => !have.has(d.meta.patient))
      missing.forEach((d) => forgetLoaded(d.id))
      const created = await ensureLoaded(missing, api.addText)
      if (created.length) await afterCreate(created, `${docs.length} record${docs.length === 1 ? '' : 's'} taken forward`)
      else await refresh()
      if (gone) return
      const again = await api.list()
      const first = docs.map((d) => again.find((r) => r.name === d.meta.patient && r.source === sourceName)).find(Boolean)
      if (first) pin(first.id)
    }
    run().catch((e) => { if (!gone) toast(e.message) })
    return () => { gone = true }
  }, [idKey, afterCreate, pin, refresh, toast])

  const save = (doc) => { const name = downloadDoc(doc); toast('Downloaded ' + name) }
  const saveGroup = (name, list) => { const file = downloadSourceZip(name, list); toast('Downloaded ' + file) }
  const local = option === 'A' || option === 'B'
  const pinDoc = (doc) => {
    const row = records.find((r) => r.name === doc.meta.patient)
    if (row) pin(row.id)
  }

  return (
    <>
      {record && <ChainBar record={record} step={1} />}
      {local ? (
        <section className="srcband">
          <div className="srcbandhead">
            <div>
              <div className="eyebrow">{option === 'A' ? 'Option A · this computer' : 'Option B · typed note'}</div>
              <h3>{records.length ? 'This chart is the one taken forward' : 'Nothing loaded from this option yet'}</h3>
            </div>
          </div>
          {records.length > 1 && (
            <div className="ctrls">
              {records.map((r) => <button key={r.id} className={`btn small ${r.id === record?.id ? 'pri' : ''}`} onClick={() => pin(r.id)}>{r.name}</button>)}
            </div>
          )}
          {record ? (
            <article className="doc">
              <header><span>{record.source}</span><b>{record.name}</b></header>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{record.text}</pre>
            </article>
          ) : (
            <div className="card">
              <p>Option {option} is active. {option === 'A' ? 'Upload a chart' : 'Paste a note'} on the sources page. No other option is included.</p>
              <button className="btn pri" onClick={showSources}>‹ Sources of input data</button>
            </div>
          )}
        </section>
      ) : chosen.length === 0 ? (
        <div className="card">
          <h3>No patient record is selected</h3>
          <p>On the sources page, connect an option from C to F, get the data, and select one or more patient records. Only those records are shown here.</p>
          <button className="btn pri" onClick={showSources}>‹ Choose records</button>
        </div>
      ) : GROUPS.filter(([id]) => chosen.some((d) => d.sourceId === id)).map(([id, name, blurb]) => {
        const list = chosen.filter((d) => d.sourceId === id)
        return (
          <section className="srcband" key={id}>
            <div className="srcbandhead">
              <div><div className="eyebrow">{name}</div><h3>{blurb} · {list.length} record{list.length === 1 ? '' : 's'}</h3></div>
              <button className="btn small" onClick={() => saveGroup(name, list)}>⬇ Download this source</button>
            </div>
            <div className="docgrid">
              {list.map((doc) => {
                const View = VIEW[doc.layout]
                const on = record?.name === doc.meta.patient
                return (
                  <div className="docwrap" key={doc.id}>
                    <div className="docmeta"><span className="tag">{doc.meta.prism}</span><span className="tag">{doc.kind}</span><b>{doc.meta.patient}</b>{on && <span className="tag ok">Validating</span>}</div>
                    <View doc={doc} />
                    <div className="ctrls">
                      <button className={`btn small ${on ? 'pri' : ''}`} onClick={() => pinDoc(doc)}>{on ? 'Selected for validation' : 'Select for validation'}</button>
                      <button className="btn small" onClick={() => save(doc)}>⬇ Download {doc.filename}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
      <div className="nextbar">
        <span className="small">{option ? `Option ${option}` : 'No option'} · {chosen.length || (local ? records.length : 0)} record{(chosen.length || records.length) === 1 ? '' : 's'} taken forward{record && <> · selected: <b>{record.name}</b></>}</span>
        <button className="btn pri" disabled={!record} onClick={() => setStep(2)}>Next: validate ›</button>
      </div>
    </>
  )
}
