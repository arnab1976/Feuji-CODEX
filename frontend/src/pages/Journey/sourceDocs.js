// Simulated charts for each connected source. The on-screen preview and the downloaded file
// are built from the same record, so what the coder sees is what lands in the local folder.
export const SOURCE_STORE = 'codex-source-links'
const LOADED_KEY = 'codex-source-docs-loaded-v3'
export const ACTIVE_KEY = 'codex-active-option'
export const OPTION_SOURCE = { C: 'ehr', D: 'claims', E: 'docs', F: 'api' }

export function activeOption() {
  const value = sessionStorage.getItem(ACTIVE_KEY) || ''
  return ['A', 'B', 'C', 'D', 'E', 'F'].includes(value) ? value : ''
}

export function setActiveOption(option) {
  if (option) sessionStorage.setItem(ACTIVE_KEY, option)
  else sessionStorage.removeItem(ACTIVE_KEY)
}

export function forgetLoaded(id) {
  if (!id) { sessionStorage.removeItem(LOADED_KEY); return }
  let loaded
  try { loaded = new Set(JSON.parse(sessionStorage.getItem(LOADED_KEY) || '[]')) } catch { loaded = new Set() }
  loaded.delete(id)
  sessionStorage.setItem(LOADED_KEY, JSON.stringify([...loaded]))
}

export function connectedSourceIds() {
  const id = OPTION_SOURCE[activeOption()]
  if (!id) return []
  try {
    const saved = JSON.parse(sessionStorage.getItem(SOURCE_STORE) || '{}')
    return saved[id]?.status === 'connected' ? [id] : []
  } catch { return [] }
}

const PICK_KEY = 'codex-picked-docs'

export function pickedIds() {
  try {
    const ids = JSON.parse(sessionStorage.getItem(PICK_KEY) || '[]')
    return Array.isArray(ids) ? ids : []
  } catch { return [] }
}

export function setPickedIds(ids) {
  sessionStorage.setItem(PICK_KEY, JSON.stringify(ids))
}

function chart(meta, body) {
  return [
    `Patient: ${meta.patient}`,
    `Member ID: ${meta.member}`,
    `External patient ID: ${meta.prism}`,
    `Encounter ID: ${meta.enc}`,
    `Date of service: ${meta.dos}`,
    `Provider: ${meta.prov}`,
    `Provider type: ${meta.ptype}`,
    `Visit type: ${meta.visit}`,
    `Source quality: ${meta.quality}`,
    `Signed: ${meta.signed}`,
    '',
    body.trim(),
  ].join('\n')
}

function person(patient, member, prism, enc, dos, prov, ptype, quality) {
  return { patient, member, prism, enc, dos, prov, ptype, visit: 'Face-to-face', quality, signed: 'yes' }
}

const EHR = 'EHR / FHIR R4'
const CLAIMS = 'Claims & encounter feed'
const DOCS = 'Document exchange'
const API = 'Intake API'

export const DOC_TYPES = [
  'Office visit',
  "Handwritten doctor's prescription",
  'Electronic prescription',
  'Pathology report',
  '837 encounter claim',
  'Home-visit note',
]

function ehr(sourceId, sourceName, file, meta, sections) {
  return {
    id: `${sourceId}-visit-${meta.prism}`, sourceId, sourceName, layout: 'ehr',
    kind: 'Office visit', title: 'Office visit · DocumentReference', filename: `EHR_${file}.txt`,
    meta, fhir: 'DocumentReference / Encounter / Condition', sections,
  }
}
function erx(sourceId, sourceName, file, meta, orders) {
  return {
    id: `${sourceId}-erx-${meta.prism}`, sourceId, sourceName, layout: 'erx',
    kind: 'Electronic prescription', title: 'Signed medication orders', filename: `ERx_${file}.txt`,
    meta, orders,
  }
}
function rx(sourceId, sourceName, file, meta, who, lines, plan) {
  return {
    id: `${sourceId}-rx-${meta.prism}`, sourceId, sourceName, layout: 'rx',
    kind: "Handwritten doctor's prescription", title: "Handwritten doctor's prescription", filename: `Rx_handwritten_${file}.html`,
    meta, who, role: 'Physician', lines, plan,
  }
}
function pathDoc(sourceId, sourceName, file, meta, spec) {
  return {
    id: `${sourceId}-path-${meta.prism}`, sourceId, sourceName, layout: 'path',
    kind: 'Pathology report', title: 'Pathology report', filename: `Pathology_${file}.html`,
    meta, ...spec,
  }
}
function claim(sourceId, sourceName, file, meta, dx, plan, note) {
  return {
    id: `${sourceId}-claim-${meta.prism}`, sourceId, sourceName, layout: 'claim',
    kind: '837 encounter claim', title: 'Encounter claim with diagnoses', filename: `Claim_${file}_837P.txt`,
    meta, dx, plan, note,
  }
}
function push(file, meta, summary, plan) {
  return {
    id: `api-${meta.prism}`, sourceId: 'api', sourceName: API, layout: 'api',
    kind: 'Home-visit note', title: 'Home-visit note posted by a partner', filename: `Intake_${file}_visit.json`,
    meta, partner: 'Northline Home Visits', summary, plan,
  }
}

export const SOURCE_DOCS = [
  ehr('ehr', EHR, 'Helen_P', person('Helen P., 68 F', 'MA-220441', 'PT-44120', 'ENC-2026-1002-44120', '2026-10-02', 'L. Okonkwo, MD', 'MD', 'Digital text'), [
    ['Chief complaint', 'Follow-up of type 2 diabetes, kidney disease, and COPD.'],
    ['History of present illness', 'Type 2 diabetes mellitus with diabetic chronic kidney disease. CKD stage 3b, eGFR 41 today, was 44 in June. COPD, chronic obstructive pulmonary disease, stable, no exacerbation.'],
    ['Medications', 'Metformin 1000 mg twice daily. Empagliflozin 10 mg daily. Tiotropium 18 mcg inhaled daily. Lisinopril 20 mg daily.'],
    ['Assessment & plan', '1. Type 2 diabetes mellitus with diabetic chronic kidney disease. Continue metformin and empagliflozin.\n2. CKD stage 3b. eGFR 41. Nephrology already following.\n3. COPD. Continue tiotropium.\n4. Essential hypertension. Continue lisinopril.'],
  ]),
  ehr('ehr', EHR, 'Arthur_S', person('Arthur S., 74 M', 'MA-220518', 'PT-44121', 'ENC-2026-1008-44121', '2026-10-08', 'R. Shah, DO', 'DO', 'Digital text'), [
    ['Chief complaint', 'Follow-up of heart failure and atrial fibrillation.'],
    ['History of present illness', 'Chronic systolic heart failure. Weight stable, mild dyspnea on stairs. Paroxysmal atrial fibrillation, last episode two weeks ago. No chest pain.'],
    ['Medications', 'Carvedilol 12.5 mg twice daily. Furosemide 40 mg daily. Apixaban 5 mg twice daily.'],
    ['Assessment & plan', '1. Chronic systolic heart failure. Continue carvedilol and furosemide.\n2. Paroxysmal atrial fibrillation. Continue apixaban.'],
  ]),
  erx('ehr', EHR, 'Nina_K', person('Nina K., 62 F', 'MA-220630', 'PT-44130', 'ENC-2026-1006-44130', '2026-10-06', 'A. Nair, MD', 'MD', 'Digital text'), [
    'metformin 1000 mg twice daily — type 2 diabetes mellitus with diabetic chronic kidney disease',
    'continue current care for CKD stage 3b',
  ]),
  rx('ehr', EHR, 'Owen_T', person('Owen T., 70 M', 'MA-220714', 'PT-44131', 'ENC-2026-1007-44131', '2026-10-07', 'A. Nair, MD', 'MD', 'Handwritten'), 'A. Nair, MD', ['Rx', 'Tiotropium 18 mcg inh daily', 'COPD — chronic obstructive pulmonary disease', 'Disp 30 days · refill × 3', 'A. Nair, MD'], 'COPD, chronic obstructive pulmonary disease. Continue tiotropium 18 mcg daily.'),
  pathDoc('ehr', EHR, 'Ida_S', person('Ida S., 66 F', 'MA-220880', 'PT-44132', 'ENC-2026-1008-44132', '2026-10-08', 'S. Feldman, MD', 'MD', 'Digital text'), { specimen: 'Breast, left, core biopsy', diagnosis: 'Invasive breast carcinoma, intermediate grade.', comment: 'Breast carcinoma. No other chronic condition is assessed in this report.' }),

  claim('claims', CLAIMS, 'Nora_V', person('Nora V., 76 F', 'MA-318902', 'PT-31890', 'ENC-2026-0918-31890', '2026-09-18', 'R. Shah, DO', 'DO', 'Digital text'), [
    ['1', 'I50.22', 'Chronic systolic heart failure', 'In the note'],
    ['2', 'I48.0', 'Paroxysmal atrial fibrillation', 'In the note'],
    ['3', 'J44.9', 'COPD', 'On the claim only'],
  ], '1. Chronic systolic heart failure. Continue carvedilol and furosemide. Weight stable.\n2. Paroxysmal atrial fibrillation. Continue apixaban.', 'The note supports chronic systolic heart failure and paroxysmal atrial fibrillation. COPD is on the claim and was not assessed at this visit.'),
  claim('claims', CLAIMS, 'Paul_H', person('Paul H., 69 M', 'MA-318911', 'PT-31891', 'ENC-2026-0922-31891', '2026-09-22', 'L. Okonkwo, MD', 'MD', 'Digital text'), [
    ['1', 'E11.22', 'Type 2 diabetes with diabetic chronic kidney disease', 'In the note'],
    ['2', 'N18.32', 'CKD stage 3b', 'In the note'],
  ], '1. Type 2 diabetes mellitus with diabetic chronic kidney disease. Continue metformin.\n2. CKD stage 3b. eGFR 38. Nephrology following.', 'Both diagnoses on the claim are assessed in the note.'),
  claim('claims', CLAIMS, 'Irene_K', person('Irene K., 72 F', 'MA-318924', 'PT-31892', 'ENC-2026-1004-31892', '2026-10-04', 'A. Nair, MD', 'MD', 'Digital text'), [
    ['1', 'J44.9', 'COPD', 'In the note'],
  ], '1. COPD, chronic obstructive pulmonary disease. Continue tiotropium. No exacerbation.', 'The claim diagnosis is assessed in the note.'),
  claim('claims', CLAIMS, 'Sam_T', person('Sam T., 77 M', 'MA-318933', 'PT-31893', 'ENC-2026-1016-31893', '2026-10-16', 'S. Feldman, MD', 'MD', 'Digital text'), [
    ['1', 'I50.32', 'Chronic diastolic heart failure', 'In the note'],
    ['2', 'I10', 'Essential hypertension', 'In the note'],
  ], '1. Chronic diastolic heart failure. Mild edema. Continue furosemide.\n2. Essential hypertension. Continue amlodipine.', 'Both diagnoses on the claim are assessed in the note.'),
  rx('claims', CLAIMS, 'Vera_L', person('Vera L., 64 F', 'MA-318955', 'PT-31895', 'ENC-2026-0925-31895', '2026-09-25', 'A. Nair, MD', 'MD', 'Handwritten'), 'A. Nair, MD', ['Rx', 'Metformin 1000 mg twice daily', 'Type 2 diabetes mellitus with diabetic neuropathy', 'Disp 30 days · refill × 3', 'A. Nair, MD'], 'Type 2 diabetes mellitus with diabetic neuropathy. Continue metformin.'),

  rx('docs', DOCS, 'Nair_James', person('James O., 71 M', 'MA-550218', 'PT-55021', 'ENC-2026-1014-55021', '2026-10-14', 'A. Nair, MD', 'MD', 'Handwritten'), 'A. Nair, MD', ['Rx', 'Tiotropium 18 mcg inh daily', 'Albuterol HFA 2 puffs q6h prn', 'COPD — chronic obstructive pulmonary disease', 'Lisinopril 10 mg daily — hypertension', 'Disp 30 days · refill × 3', 'A. Nair, MD'], 'COPD, chronic obstructive pulmonary disease. Treatment with tiotropium continued.'),
  rx('docs', DOCS, 'Nair_Anita', person('Anita R., 67 F', 'MA-550230', 'PT-55022', 'ENC-2026-1015-55022', '2026-10-15', 'A. Nair, MD', 'MD', 'Handwritten'), 'A. Nair, MD', ['Rx', 'Metformin 1000 mg twice daily', 'Type 2 diabetes mellitus', 'Empagliflozin 10 mg daily', 'Disp 30 days · refill × 3', 'A. Nair, MD'], 'Type 2 diabetes mellitus. Continue metformin and empagliflozin.'),
  rx('docs', DOCS, 'Shah_Luis', person('Luis M., 75 M', 'MA-550244', 'PT-55023', 'ENC-2026-1018-55023', '2026-10-18', 'R. Shah, DO', 'DO', 'Handwritten'), 'R. Shah, DO', ['Rx', 'Carvedilol 12.5 mg twice daily', 'Furosemide 40 mg daily', 'Chronic systolic heart failure', 'Disp 30 days · refill × 2', 'R. Shah, DO'], 'Chronic systolic heart failure. Continue carvedilol and furosemide.'),
  pathDoc('docs', DOCS, 'Victor_P', person('Victor P., 69 M', 'MA-550300', 'PT-55030', 'ENC-2026-1013-55030', '2026-10-13', 'S. Feldman, MD', 'MD', 'Digital text'), { specimen: 'Prostate, needle biopsy', diagnosis: 'Adenocarcinoma of the prostate, Gleason 3+4.', comment: 'Prostate carcinoma, active, not a history code.' }),
  ehr('docs', DOCS, 'Nadia_Q', person('Nadia Q., 60 F', 'MA-550311', 'PT-55031', 'ENC-2026-1014-55031', '2026-10-14', 'L. Okonkwo, MD', 'MD', 'Scanned'), [
    ['Chief complaint', 'Scanned office note for weight and blood pressure.'],
    ['History of present illness', 'Morbid obesity, BMI 41.2. Essential hypertension.'],
    ['Assessment & plan', '1. Morbid obesity. Continue weight management. BMI 41.2.\n2. Essential hypertension. Continue lisinopril 20 mg daily.'],
  ]),

  push('Walter_G', person('Walter G., 79 M', 'MA-774310', 'PT-77431', 'ENC-2026-1103-77431', '2026-11-03', 'S. Iyer, NP', 'NP', 'Digital text'), 'Dementia, moderate. Chronic diastolic heart failure. Essential hypertension.', '1. Dementia, moderate. Daughter confirms missed medications. Continue donepezil.\n2. Chronic diastolic heart failure. Mild edema. Continue furosemide.\n3. Essential hypertension. Continue amlodipine.'),
  rx('api', API, 'Marta_V', person('Marta V., 73 F', 'MA-774400', 'PT-77440', 'ENC-2026-1112-77440', '2026-11-12', 'A. Nair, MD', 'MD', 'Handwritten'), 'A. Nair, MD', ['Rx', 'Tiotropium 18 mcg inh daily', 'COPD — chronic obstructive pulmonary disease', 'Disp 30 days · refill × 3', 'A. Nair, MD'], 'COPD, chronic obstructive pulmonary disease. Continue tiotropium 18 mcg daily.'),
  pathDoc('api', API, 'Leo_K', person('Leo K., 68 M', 'MA-774411', 'PT-77441', 'ENC-2026-1114-77441', '2026-11-14', 'S. Feldman, MD', 'MD', 'Digital text'), { specimen: 'Prostate, needle biopsy', diagnosis: 'Adenocarcinoma of the prostate, Gleason 3+4.', comment: 'Prostate carcinoma, active, not a history code.' }),
  erx('api', API, 'Tara_S', person('Tara S., 66 F', 'MA-774422', 'PT-77442', 'ENC-2026-1115-77442', '2026-11-15', 'R. Shah, DO', 'DO', 'Digital text'), ['apixaban 5 mg twice daily for paroxysmal atrial fibrillation']),
  claim('api', API, 'Jonah_P', person('Jonah P., 71 M', 'MA-774433', 'PT-77443', 'ENC-2026-1116-77443', '2026-11-16', 'K. Osei, NP', 'NP', 'Digital text'), [
    ['1', 'J44.9', 'COPD', 'In the note'],
  ], '1. COPD, chronic obstructive pulmonary disease. Continue tiotropium. No exacerbation.', 'The claim diagnosis is assessed in the note.'),
]

function bodyOf(doc) {
  if (doc.layout === 'ehr') return doc.sections.map(([h, t]) => `${h}:\n${t}`).join('\n\n')
  if (doc.layout === 'claim') return `Claim submitted for this encounter:\nDx on claim: ${doc.dx.map((d) => d[1]).join(', ')}\n\nAssessment & plan:\n${doc.plan}`
  if (doc.layout === 'rx') return `Handwritten doctor's prescription:\n${doc.lines.filter((l) => l !== 'Rx').join('\n')}\n\nAssessment & plan:\n${doc.plan}`
  if (doc.layout === 'erx') return `Electronic prescription, signed by ${doc.meta.prov}:\n${doc.orders.join('\n')}`
  if (doc.layout === 'path') return `Pathology report:\nSpecimen: ${doc.specimen}\nFinal diagnosis: ${doc.diagnosis}\nComment: ${doc.comment}`
  return `Pushed visit note from ${doc.partner}.\n\nAssessment & plan:\n${doc.plan}`
}

SOURCE_DOCS.forEach((doc) => { doc.text = chart(doc.meta, bodyOf(doc)) })

export function docsForConnected(ids) {
  const want = new Set(ids)
  return SOURCE_DOCS.filter((d) => want.has(d.sourceId))
}

export function selectedDocs() {
  const sourceId = OPTION_SOURCE[activeOption()]
  if (!sourceId) return []
  const want = new Set(pickedIds())
  return SOURCE_DOCS.filter((d) => d.sourceId === sourceId && want.has(d.id))
}

const inflight = new Set()

export async function ensureLoaded(docs, addText) {
  let loaded
  try { loaded = new Set(JSON.parse(sessionStorage.getItem(LOADED_KEY) || '[]')) } catch { loaded = new Set() }
  const todo = docs.filter((d) => !loaded.has(d.id) && !inflight.has(d.id))
  todo.forEach((d) => inflight.add(d.id))
  const created = []
  for (const doc of todo) {
    try {
      created.push(await addText(doc.text, doc.meta.patient, doc.sourceName, doc.meta))
      loaded.add(doc.id)
      sessionStorage.setItem(LOADED_KEY, JSON.stringify([...loaded]))
    } finally { inflight.delete(doc.id) }
  }
  return created
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

function page(title, css, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{margin:24px;font-family:Segoe UI,sans-serif;color:#1a1a1a}${css}</style></head><body>${inner}</body></html>`
}

export function displayFile(doc) {
  if (doc.layout === 'rx') {
    const css = '.paper{max-width:520px;background:#fffef6;border:1px solid #e6d7b0;padding:28px 32px;background-image:repeating-linear-gradient(#fffef6,#fffef6 31px,#e7dcc0 32px);font-family:"Segoe Script","Segoe Print",cursive;font-size:22px;line-height:32px}'
    const inner = `<div class="paper"><div style="font-family:Segoe UI,sans-serif;font-size:13px;line-height:1.4">${esc(doc.who)} · ${esc(doc.meta.patient)} · ${esc(doc.meta.dos)}</div>${doc.lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`
    return { name: doc.filename, type: 'text/html', body: page(doc.title, css, inner) }
  }
  if (doc.layout === 'path') {
    const css = '.sheet{max-width:640px;border:1px solid #d5d8e0;padding:24px 28px} h1{font-size:18px;margin:0 0 8px} p{margin:6px 0}'
    const inner = `<div class="sheet"><h1>Pathology report</h1><p><b>${esc(doc.meta.patient)}</b> · ${esc(doc.meta.dos)} · ${esc(doc.meta.prism)}</p><p>Pathologist: ${esc(doc.meta.prov)}</p><p><b>Specimen.</b> ${esc(doc.specimen)}</p><p><b>Final diagnosis.</b> ${esc(doc.diagnosis)}</p><p>${esc(doc.comment)}</p></div>`
    return { name: doc.filename, type: 'text/html', body: page(doc.title, css, inner) }
  }
  if (doc.layout === 'api') {
    const payload = {
      type: 'codex.chart.push', partner: doc.partner, receivedAt: `${doc.meta.dos}T15:04:00Z`,
      patient: doc.meta, text: doc.text,
    }
    return { name: doc.filename, type: 'application/json', body: JSON.stringify(payload, null, 2) }
  }
  return { name: doc.filename, type: 'text/plain', body: doc.text }
}

export function saveLocal(name, body, type) {
  const blob = new Blob([body], { type: type + ';charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800)
}

function crc32(bytes) {
  let c = ~0
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b }
function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b }

function zip(files) {
  const enc = new TextEncoder()
  const locals = []
  const central = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = enc.encode(f.body)
    const crc = crc32(data)
    const local = [u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]
    locals.push(...local)
    central.push(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name)
    offset += 30 + name.length + data.length
  }
  const centralBytes = central.reduce((n, p) => n + p.length, 0)
  const end = [u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes), u32(offset), u16(0)]
  const all = [...locals, ...central, ...end]
  const size = all.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(size)
  let o = 0
  all.forEach((p) => { out.set(p, o); o += p.length })
  return out
}

export function downloadDoc(doc) {
  const file = displayFile(doc)
  saveLocal(file.name, file.body, file.type)
  return file.name
}

export function downloadSourceZip(sourceName, docs) {
  const files = docs.flatMap((doc) => {
    const file = displayFile(doc)
    const extra = file.name.endsWith('.txt') ? [] : [{ name: file.name.replace(/\.(html|json)$/, '.txt'), body: doc.text }]
    return [{ name: file.name, body: file.body }, ...extra]
  })
  const safe = sourceName.replace(/[^\w]+/g, '_')
  const bytes = zip(files)
  const blob = new Blob([bytes], { type: 'application/zip' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `CODEX_${safe}.zip`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800)
  return a.download
}
