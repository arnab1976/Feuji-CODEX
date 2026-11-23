import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { useJourney } from '../../state/JourneyContext'
import { useUI } from '../../state/ui'
import { ACTIVE_KEY, DOC_TYPES, forgetLoaded, OPTION_SOURCE, pickedIds, selectedDocs, setActiveOption, setPickedIds, SOURCE_DOCS, SOURCE_STORE as STORE } from './sourceDocs'

export const SOURCES = [
  {
    id: 'ehr',
    name: 'EHR / FHIR R4',
    option: 'C',
    kind: 'Clinical documents',
    blurb: 'Epic, Cerner, athenahealth, or any FHIR R4 server. CODEX pulls the signed documents on the chart, including a handwritten doctor’s prescription.',
    about: {
      receives: 'Five chart records from the chart system, in the document types an EHR can hold.',
      fields: 'Each record has a patient name, external ID (PT-), encounter ID, date of service, provider and provider type, a face-to-face visit, and a signed document.',
      features: 'After Get data, select one ID or several. CODEX codes the conditions written in the records you select.',
      types: 'Office visit, electronic prescription, handwritten doctor’s prescription, and pathology report.',
    },
    endpoint: 'https://ehr.example.org/fhir/R4',
    auth: 'Client credentials',
    pull: { kind: 'curated', key: 'A', source: 'EHR / FHIR R4' },
    brings: '5 chart records',
  },
  {
    id: 'claims',
    name: 'Claims & encounter feed',
    option: 'D',
    kind: '837 / prior submissions',
    blurb: 'The plan encounter packet. Claim diagnoses arrive with the chart, and a handwritten doctor’s prescription can arrive in the same batch.',
    about: {
      receives: 'Five records from the encounter packet: four 837 professional claims and one handwritten doctor’s prescription that arrived with the batch.',
      fields: 'A claim has a patient ID, member ID, date of service, rendering provider, and the ICD-10 diagnoses already on the claim. The prescription has the patient ID, the prescribing physician, and the handwritten orders.',
      features: 'Select the records to take forward. A diagnosis that is on the claim and not in the note can be deleted.',
      types: '837 encounter claim and handwritten doctor’s prescription.',
    },
    endpoint: 'sftp://claims.example.org/outbound/837',
    auth: 'SSH key',
    pull: { kind: 'curated', key: 'B', source: 'Claims & encounter feed' },
    brings: '5 encounter-packet records',
  },
  {
    id: 'docs',
    name: 'Document exchange',
    option: 'E',
    kind: 'PDF, TIFF, HL7 MDM',
    blurb: 'An SFTP drop, object store, or health-information exchange. Scanned and handwritten charts land here.',
    about: {
      receives: 'Five documents from the drop: handwritten doctor’s prescriptions, a pathology report, and a scanned office visit.',
      fields: 'Each record has a patient ID, date, clinician, and a signed document. A prescription lists the handwritten orders. A pathology report lists the specimen and the final diagnosis.',
      features: 'Select the documents to take forward. CODEX codes the conditions written on the paper.',
      types: 'Handwritten doctor’s prescription, pathology report, and scanned office visit.',
    },
    endpoint: 's3://codex-intake/charts/',
    auth: 'Access key',
    pull: { kind: 'curated', key: 'C', source: 'Document exchange' },
    brings: '5 exchanged documents',
  },
  {
    id: 'api',
    name: 'Intake API',
    option: 'F',
    kind: 'Push from any sender',
    blurb: 'Any external system can POST a chart to CODEX. Connect a partner, or accept inbound charts on the intake API.',
    about: {
      receives: 'Five records a partner posted. The payload can be any chart type.',
      fields: 'Each record has a patient ID, encounter ID, date, provider, and the document carried inside the payload.',
      features: 'Select the posted records to take forward. CODEX codes the document the partner sent.',
      types: 'Home-visit note, handwritten doctor’s prescription, electronic prescription, pathology report, and 837 encounter claim.',
    },
    endpoint: 'https://codex.local/api/records',
    auth: 'Bearer token',
    pull: { kind: 'random', count: 1, source: 'Intake API' },
    brings: '5 posted records',
  },
]

const FILE_ABOUT = {
  receives: 'One chart file from this computer for each file you add. Choose the document type before you add it.',
  fields: 'Text, JSON, CSV, and a PDF with a text layer are read as the note. A scan or photo needs the note typed under the file. Patient, provider, visit type, and date are taken from header lines when the file has them. The type you choose is stored with the chart.',
  features: 'While Option A is active, these files are the only charts taken forward.',
  types: 'Office visit, handwritten doctor’s prescription, electronic prescription, pathology report, 837 encounter claim, and home-visit note.',
}
const PASTE_ABOUT = {
  receives: 'One note you paste or type. Choose the document type before you add it.',
  fields: 'Free text. Header lines for the patient, provider, provider type, visit type, and date of service are optional. The type you choose is stored with the note.',
  features: 'Use it for a note copied from an EHR window, a fax, or a handwritten prescription. While Option B is active, only this note is taken forward.',
  types: 'Office visit, handwritten doctor’s prescription, electronic prescription, pathology report, 837 encounter claim, and home-visit note.',
}

function DataBrief({ about }) {
  return (
    <div className="srcdef">
      <p><b>You receive.</b> {about.receives}</p>
      <p><b>Types.</b> {about.types}</p>
      <p><b>Each record.</b> {about.fields}</p>
      <p><b>What you can do.</b> {about.features}</p>
    </div>
  )
}

const PLACEHOLDER = 'Patient: Jane D., 72 F\nProvider: K. Osei, NP\nProvider type: NP\nVisit type: Face-to-face\nDate of service: 2026-10-02\n\nAssessment & plan:\n1. COPD: stable, continue tiotropium 18 mcg.\n2. CKD stage 3b: eGFR 38, nephrology referral.'

function TypeSelect({ value, onChange }) {
  return (
    <label className="small" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
      Document type
      <select className="btn small" value={value} onChange={(e) => onChange(e.target.value)}>
        {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
    </label>
  )
}

function FileSource({ on, held, choose }) {
  const { afterCreate, setBusy } = useJourney()
  const { toast } = useUI()
  const fileIn = useRef(null)
  const [over, setOver] = useState(false)
  const [pending, setPending] = useState([])
  const [brought, setBrought] = useState('')
  const [docType, setDocType] = useState(DOC_TYPES[1])

  useEffect(() => { if (!on) { setBrought(''); setPending([]) } }, [on])

  const handleFiles = async (files) => {
    if (!files.length) return
    await choose('A')
    setBusy(true)
    try {
      const res = await api.upload(files, docType)
      res.errors.forEach((e) => toast(`Could not read ${e.file}: ${e.error}`))
      setPending((p) => [...p, ...res.pending.map((x) => {
        const f = files.find((ff) => ff.name === x.file)
        return { ...x, url: f && /\.(png|jpe?g)$/i.test(f.name) ? URL.createObjectURL(f) : null, text: '', quality: x.quality || 'Scanned' }
      })])
      if (res.created.length) setBrought(`${res.created.length} file${res.created.length === 1 ? '' : 's'} from this computer`)
      await afterCreate(res.created, res.created.length ? `${res.created.length} record(s) loaded from your computer` : 'File received; paste the note text below')
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const setP = (i, k, v) => setPending((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const addPending = async (i) => {
    const p = pending[i]
    if (!p.text.trim()) { toast('Paste the note text first'); return }
    await choose('A')
    const quality = docType.startsWith('Handwritten') ? 'Handwritten' : p.quality
    const r = await api.addText(p.text, p.file, `Local upload (${p.file.split('.').pop()}, transcribed) · ${docType}`, { quality, documentType: docType })
    setPending((l) => l.filter((_, k) => k !== i))
    setBrought(p.file)
    await afterCreate([r], 'Record added from ' + p.file)
  }

  return (
    <div className={`card srcard ${cardClass(on, held)}`} onClick={() => choose('A')}>
      <div className="top">
        <div>
          <div className="eyebrow">Option A · this computer</div>
          <h3 style={{ marginBottom: 4 }}>Upload from your computer</h3>
        </div>
        <span className={`tag ${on ? 'ok' : 'grey'}`}>{optionTag(on, held, 'Ready')}</span>
      </div>
      <p className="small" style={{ margin: 0 }}>Charts already on this computer. Text, JSON, CSV, and text-layer PDFs are read directly. Scanned PDFs and images need the note text pasted under the file.</p>
      <DataBrief about={FILE_ABOUT} />
      <TypeSelect value={docType} onChange={setDocType} />
      <label className={`drop ${over ? 'over' : ''}`} onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles([...e.dataTransfer.files]) }}>
        <input ref={fileIn} type="file" multiple hidden accept=".txt,.md,.json,.csv,.pdf,.png,.jpg,.jpeg,.tif,.tiff"
          onChange={(e) => { handleFiles([...e.target.files]); e.target.value = '' }} />
        <span className="big">📄</span><b>Drop files here or click to browse</b>
        <span className="xs muted">.txt · .md · .json · .csv (batch) · .pdf · .png · .jpg · .tif</span>
      </label>
      {pending.map((p, i) => (
        <div key={p.file + i}>
          <b className="small">{p.file}</b> <span className="tag warn">needs OCR</span>
          <p className="xs muted" style={{ margin: '4px 0 6px' }}>{p.note}</p>
          <textarea rows={4} placeholder={`Paste the note text from ${p.file}…`} value={p.text} onChange={(e) => setP(i, 'text', e.target.value)} />
          <div className="ctrls" style={{ marginTop: 6 }}>
            <select className="btn small" value={p.quality} onChange={(e) => setP(i, 'quality', e.target.value)}><option>Scanned</option><option>Handwritten</option><option>Digital text</option></select>
            <button className="btn small pri" onClick={() => addPending(i)}>Add with this text</button>
            <button className="btn small" onClick={() => setPending((l) => l.filter((_, k) => k !== i))}>Discard</button>
          </div>
        </div>
      ))}
      {on && brought && <div className="note ok small" style={{ margin: 0 }}>Last retrieval: {brought}</div>}
    </div>
  )
}

function PasteSource({ on, held, choose }) {
  const { afterCreate } = useJourney()
  const { toast } = useUI()
  const [paste, setPaste] = useState('')
  const [brought, setBrought] = useState('')
  const [docType, setDocType] = useState(DOC_TYPES[1])
  useEffect(() => { if (!on) setBrought('') }, [on])

  const addPaste = async () => {
    if (!paste.trim()) { toast('Paste or type a note first'); return }
    await choose('B')
    const quality = docType.startsWith('Handwritten') ? 'Handwritten' : 'Digital text'
    const created = await api.addText(paste, undefined, `Pasted / typed · ${docType}`, { documentType: docType, quality })
    setBrought('Pasted note')
    setPaste('')
    await afterCreate([created], 'Pasted note added')
  }
  return (
    <div className={`card srcard ${cardClass(on, held)}`} onClick={() => choose('B')}>
      <div className="top">
        <div>
          <div className="eyebrow">Option B · typed note</div>
          <h3 style={{ marginBottom: 4 }}>Paste or type a note</h3>
        </div>
        <span className={`tag ${on ? 'ok' : 'grey'}`}>{optionTag(on, held, 'Ready')}</span>
      </div>
      <p className="small" style={{ margin: 0 }}>A visit note copied from an EHR window, a fax, or typed here. Header lines for the patient, provider, and visit are optional.</p>
      <DataBrief about={PASTE_ABOUT} />
      <TypeSelect value={docType} onChange={setDocType} />
      <textarea rows={8} placeholder={PLACEHOLDER} value={paste} onClick={(e) => e.stopPropagation()} onChange={(e) => setPaste(e.target.value)} />
      <div className="ctrls">
        <button className="btn small pri" onClick={(e) => { e.stopPropagation(); addPaste() }}>Add pasted note</button>
      </div>
      {on && brought && <div className="note ok small" style={{ margin: 0 }}>Last retrieval: {brought}</div>}
    </div>
  )
}

function RecordPicker({ sourceId }) {
  const docs = SOURCE_DOCS.filter((d) => d.sourceId === sourceId)
  const [picked, setPicked] = useState(() => new Set(pickedIds().filter((id) => docs.some((d) => d.id === id))))
  const write = (next) => { setPicked(next); setPickedIds([...next]) }
  const toggle = (id) => {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    write(next)
  }
  return (
    <div className="picklist" onClick={(e) => e.stopPropagation()}>
      <div className="pickhead">
        <b>{docs.length} patient records</b>
        <button type="button" className="btn small" onClick={() => write(new Set(docs.map((d) => d.id)))}>Select all</button>
        <button type="button" className="btn small" onClick={() => write(new Set())}>Clear</button>
      </div>
      {docs.map((doc) => (
        <label key={doc.id} className={`pickrow ${picked.has(doc.id) ? 'on' : ''}`}>
          <input type="checkbox" checked={picked.has(doc.id)} onChange={() => toggle(doc.id)} />
          <span><b>{doc.meta.patient}</b></span>
          <span className="xs muted">{doc.kind}</span>
          <b className="mono">{doc.meta.prism}</b>
        </label>
      ))}
      <p className="xs muted" style={{ margin: 0 }}>{picked.size} selected to take forward</p>
    </div>
  )
}

function cardClass(on, held) {
  if (on) return 'on'
  if (held) return 'off'
  return ''
}

function optionTag(on, held, idle) {
  if (on) return 'Active'
  if (held) return 'Inactive'
  return idle
}

function loadLinks() {
  let saved = {}
  try { saved = JSON.parse(sessionStorage.getItem(STORE) || '{}') } catch { /* ignore */ }
  let active = sessionStorage.getItem(ACTIVE_KEY) || ''
  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(active)) {
    const first = SOURCES.find((s) => saved[s.id]?.status === 'connected')
    active = first ? first.option : ''
    if (active) sessionStorage.setItem(ACTIVE_KEY, active)
  }
  const keep = OPTION_SOURCE[active]
  return {
    active,
    links: Object.fromEntries(SOURCES.map((s) => [s.id, {
      endpoint: saved[s.id]?.endpoint || s.endpoint,
      status: s.id === keep ? 'connected' : 'idle',
      brought: s.id === keep ? (saved[s.id]?.brought || '') : '',
    }])),
  }
}

export default function Sources() {
  const { records, enterCoding, clear } = useJourney()
  const { toast } = useUI()
  const initial = useState(loadLinks)[0]
  const [active, setActive] = useState(initial.active)
  const [links, setLinks] = useState(initial.links)
  const held = Boolean(active)

  useEffect(() => {
    const slim = Object.fromEntries(Object.entries(links).map(([id, l]) => [id, { endpoint: l.endpoint, status: l.status, brought: l.brought }]))
    try { sessionStorage.setItem(STORE, JSON.stringify(slim)) } catch { /* ignore */ }
  }, [links])

  const setLink = (id, patch) => setLinks((all) => ({ ...all, [id]: { ...all[id], ...patch } }))

  const choose = async (option) => {
    if (active === option) return
    const sourceId = OPTION_SOURCE[option]
    setActive(option)
    setActiveOption(option)
    setLinks((all) => Object.fromEntries(Object.entries(all).map(([id, link]) => [id, {
      ...link,
      status: id === sourceId ? 'connected' : 'idle',
      brought: id === sourceId ? link.brought : '',
    }])))
    forgetLoaded()
    setPickedIds([])
    try { await clear() } catch (e) { toast(e.message); return }
    toast(`Option ${option} is active. The other options are inactive.`)
  }

  const connect = async (src) => {
    if (active === src.option) {
      setActive('')
      setActiveOption('')
      setLink(src.id, { status: 'idle', brought: '' })
      forgetLoaded()
      setPickedIds([])
      try { await clear() } catch (e) { toast(e.message); return }
      toast(`${src.name} is inactive`)
      return
    }
    if (!links[src.id].endpoint.trim()) { toast('Enter an endpoint for ' + src.name); return }
    await choose(src.option)
  }

  const retrieve = async (src) => {
    await choose(src.option)
    setLink(src.id, { status: 'connected', brought: src.brings })
    const mine = new Set(SOURCE_DOCS.filter((d) => d.sourceId === src.id).map((d) => d.id))
    setPickedIds(pickedIds().filter((id) => mine.has(id)))
    toast(`${mine.size} patient records are ready. Select the ones to take forward.`)
  }

  const forward = () => {
    if (!active) { toast('Choose one option first'); return }
    if (OPTION_SOURCE[active]) {
      const src = SOURCES.find((s) => s.option === active)
      if (!links[src.id].brought) { toast('Get data, then select the patient records to take forward'); return }
      if (!selectedDocs().length) { toast('Select one or more patient records'); return }
    }
    enterCoding()
  }

  return (
    <>
      <div className="srcgrid">
        <FileSource on={active === 'A'} held={held && active !== 'A'} choose={choose} />
        <PasteSource on={active === 'B'} held={held && active !== 'B'} choose={choose} />
        {SOURCES.map((src) => {
          const link = links[src.id]
          const on = active === src.option
          return (
            <div className={`card srcard ${cardClass(on, held && !on)}`} key={src.id} onClick={() => choose(src.option)}>
              <div className="top">
                <div>
                  <div className="eyebrow">Option {src.option} · {src.kind}</div>
                  <h3 style={{ marginBottom: 4 }}>{src.name}</h3>
                </div>
                <span className={`tag ${on ? 'ok' : 'grey'}`}>{optionTag(on, held && !on, 'Not connected')}</span>
              </div>
              <p className="small" style={{ margin: 0 }}>{src.blurb}</p>
              <DataBrief about={src.about} />
              <div className="fld">
                <label>Endpoint</label>
                <input className="ep" value={link.endpoint} onClick={(e) => e.stopPropagation()} onChange={(e) => setLink(src.id, { endpoint: e.target.value })} />
              </div>
              <div className="fld">
                <label>{src.auth} <span className="muted">(demo only, kept in this browser)</span></label>
                <input type="password" placeholder="Paste a token or key" autoComplete="off" onClick={(e) => e.stopPropagation()} />
              </div>
              <div className="ctrls">
                <button className={`btn small ${on ? '' : 'pri'}`} onClick={(e) => { e.stopPropagation(); connect(src) }}>
                  {on ? 'Disconnect' : 'Connect'}
                </button>
                <button className="btn small" disabled={!on} onClick={(e) => { e.stopPropagation(); retrieve(src) }}>Get data</button>
              </div>
              {on && link.brought && <RecordPicker key={src.id} sourceId={src.id} />}
            </div>
          )
        })}
      </div>
      <div className="note small" style={{ marginTop: 14 }}>
        One option is active at a time. For Options C to F, connect and get the data, then select one or more patient records. Only the selected records are taken forward.
      </div>
      <div className="nextbar">
        <span className="small">{active ? `Option ${active} active` : 'No option active'} · {records.length} record{records.length === 1 ? '' : 's'} in session</span>
        <button className="btn pri" onClick={forward}>Continue to input ›</button>
      </div>
    </>
  )
}
