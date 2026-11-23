export function patientIdentity(record) {
  const stored = (record?.name || '').trim()
  const meta = (record?.meta?.patient || '').trim()
  const header = ((record?.text || '').match(/^Patient:\s*(.+)$/m)?.[1] || '').trim()
  const names = [stored, meta, header].filter(Boolean)
  const same = names.length > 0 && names.every((n) => n === names[0])
  return { stored, meta, header, same, display: meta || stored || header || 'Unknown patient' }
}

export const STAGES = {
  1: {
    name: 'Retrieve',
    input: 'The records selected on the one active option.',
    output: 'The chart selected for validation. Validate reads this same chart.',
    what: 'Intake. CODEX receives a chart. It does not write the clinical note.',
    how: 'The selected document is stored as one record. The next stage opens that record. No code is assigned here.',
    running: 'React 18 and Vite in the browser. FastAPI stores the chart in SQLite through SQLAlchemy. The browser sends the session in the X-Session-Id header.',
    later: 'No model runs at intake.',
  },
  2: {
    name: 'Validate',
    input: 'The retrieved chart: the same text, patient name, encounter, provider, visit, and signature.',
    output: 'The eligibility result and the confirmed header. Process reads this same chart.',
    what: 'Validation decides whether this encounter may supply risk-adjustment diagnoses. It does not assign ICD-10 codes.',
    how: 'The checklist runs as soon as this page opens, using the chart from Retrieve. A failed check blocks submission. An audio-only visit is a warning: every later code goes to coder review. Editing a header field runs the checklist again on the edited chart.',
    running: 'Python rules in the eligibility gate. An acceptable provider is MD, DO, NP, or PA. The visit must be face-to-face or video. The date must contain a digit. The note must be signed. An encounter ID is required.',
    later: 'No LLM and no classifier. Eligibility is a checklist.',
  },
  3: {
    name: 'Process',
    input: 'The validated chart. Stage 01 reads the text. Stage 02 reads the lines from stage 01. Stage 03 reads stage 01 and stage 02.',
    output: 'ICD-10 codes with confidence, MEAT, a source line, and any claim deletes. Review reads that set.',
    what: 'Three agents run in order on this one patient. Each agent’s output is the next agent’s input.',
    how: 'Stage 01 splits the note into sections and lines and assigns a layout confidence. Stage 02 finds conditions, medicines, and labs, and skips negated phrases. Stage 03 maps conditions to ICD-10-CM and CMS-HCC V28, applies combination rules, and compares the note with diagnoses already on a claim.',
    running: 'Python. A text chart is parsed from its headings. A PDF with a text layer is read with pypdf. An image uses Tesseract when it is installed, otherwise the pasted transcription. Conditions come from a dictionary of regular expressions with negation and history windows. Coding is a deterministic MEAT and combination-rule program. The chart is marked engine "rules".',
    later: 'Not called in this demo: AWS Textract and LayoutLMv3 for page layout, BioBERT or Med-BERT for entities, and a fine-tuned LLM for coding. Those production hooks are not executed while the agent mode is "rules".',
  },
  4: {
    name: 'Review and route',
    input: 'The code set from Process, plus the eligibility result from Validate, for the same patient.',
    output: 'A lane for every code: auto-submit, coder review, blocked, or delete. Output reads those lanes.',
    what: 'The confidence gate decides what can be submitted without a person, what a coder must confirm, and what should be deleted.',
    how: 'Eligibility is applied first. A failed encounter blocks every code. A passed encounter auto-submits a code only when its confidence is at or above the threshold and the visit is not audio-only. Anything else waits for Accept or Reject. A claim diagnosis with no support in the note is a delete.',
    running: 'A threshold comparison. The default threshold is 0.90. Accept, reject, and keep decisions are stored on the record and written to the audit log with a timestamp.',
    later: 'Not called here: a Platt-calibrated XGBoost acceptance model. Confidence in this demo comes from the rules coder.',
  },
  5: {
    name: 'Output',
    input: 'The routed lanes, deletes, and any documentation gap. The patient is still the patient from Retrieve.',
    output: 'The encounter submission payload, the code file, the audit log, and a physician query when a gap exists.',
    what: 'Assembly. This stage does not code the chart again. It packages the decisions already made and gives you a way to check them.',
    how: 'Submitted codes go on the encounter add list. Held codes stay off that list. Deletes go on the delete list when the encounter is eligible. You check the patient name, the metrics below, and the downloaded files.',
    running: 'Python builds the JSON result, the CSV files, and the query from a fixed non-leading template. The browser downloads those files.',
    later: 'Not called here: an LLM draft of the physician query, or sending that query through a portal or email service.',
  },
}

function lineIds(chart) {
  const ids = new Set()
  ;(chart?.sections || []).forEach((s) => (s.lines || []).forEach((l) => ids.add(l.id)))
  return ids
}

export function runMetrics(record) {
  const id = patientIdentity(record)
  const e = record?.eligibility
  const c = record?.chart
  const res = record?.result
  const rows = [{
    name: 'Patient identity',
    value: id.same ? 'Match' : 'Mismatch',
    accept: 'Accept only an exact match of the record name, the metadata patient, and the Patient header.',
    how: 'The three copies are compared at every stage. A later stage does not rename the patient.',
    ok: id.same,
  }]
  if (e) {
    rows.push({
      name: 'Eligibility',
      value: !e.passed ? 'Not eligible' : e.warning ? 'Pass with review' : 'Pass',
      accept: 'Accept a pass. Accept a warning only when every code stays in coder review. Do not submit from a failed check.',
      how: 'Five checks run before submission: provider type, encounter type, date of service, signature, and encounter ID.',
      ok: e.passed,
    })
  }
  if (c?.ocr) {
    const quality = record.meta?.quality || 'Digital text'
    const bar = quality === 'Handwritten' ? 0.85 : quality === 'Scanned' ? 0.90 : 0.95
    const mean = Number(c.ocr.mean_confidence)
    rows.push({
      name: 'Layout confidence',
      value: mean.toFixed(2),
      accept: `Accept ${bar.toFixed(2)} or higher for a ${quality.toLowerCase()} source. Below that, the uncertainty belongs in coder review.`,
      how: 'This demo sets the score to 0.99 minus a quality penalty: 0 for digital text, 0.04 for a scan, 0.12 for handwriting. It is not a live Textract measurement.',
      ok: mean >= bar,
    })
  }
  if (res) {
    const codes = res.codes || []
    const ids = lineIds(c)
    const cited = codes.filter((x) => x.source_line && ids.has(x.source_line)).length
    rows.push({
      name: 'Citation coverage',
      value: codes.length ? `${Math.round((cited / codes.length) * 100)}%` : 'No codes',
      accept: 'Accept 100%. Every code must cite a line that is still in this chart.',
      how: 'The coder stores a source-line id. This counts codes whose id is present in the parsed note.',
      ok: !codes.length || cited === codes.length,
    })
    const submitted = codes.filter((x) => x.final_status === 'submit')
    const withMeat = submitted.filter((x) => x.meat).length
    rows.push({
      name: 'MEAT on submitted codes',
      value: submitted.length ? `${withMeat} of ${submitted.length}` : 'None submitted',
      accept: 'Accept only when every submitted code shows at least one of Monitor, Evaluate, Assess, or Treat.',
      how: 'MEAT is taken from the diagnosis line: a monitoring phrase, an evaluation phrase, the assessment section, or a treatment.',
      ok: withMeat === submitted.length,
    })
    const thr = Number(record.threshold)
    const routeOk = codes.every((x) => {
      if (!e?.passed) return x.lane === 'blocked'
      if (e.warning || x.confidence < thr) return x.lane === 'rev'
      return x.lane === 'auto'
    })
    rows.push({
      name: 'Routing against the threshold',
      value: routeOk ? 'Consistent' : 'Inconsistent',
      accept: `Accept auto-submit only at or above ${thr.toFixed(2)}, on an eligible encounter that is not audio-only.`,
      how: 'The gate compares each confidence with the threshold after the eligibility result. The default threshold is 0.90.',
      ok: routeOk,
    })
    const dels = res.deletes || []
    rows.push({
      name: 'Delete support',
      value: dels.length ? dels.map((d) => Number(d.support_score).toFixed(2)).join(', ') : 'No deletes',
      accept: 'Accept a delete when support is 0.20 or lower. The claim diagnosis is not assessed in the note.',
      how: 'Two-way coding compares ICD-10 codes on the claim with conditions written in the note. An unsupported HCC code is marked for deletion.',
      ok: dels.every((d) => Number(d.support_score) <= 0.20),
    })
    const eds = res.eds_payload || {}
    const linkOk = eds.encounter_id === record.meta?.enc && (!eds.member_id || eds.member_id === record.meta?.member) && res.record?.name === id.display
    rows.push({
      name: 'Output link',
      value: linkOk ? 'Same encounter' : 'Link broken',
      accept: 'Accept when the payload encounter, member, and patient name are the ones validated at the start.',
      how: 'The result is built from the routed record. It does not open a different patient.',
      ok: linkOk,
    })
    const held = res.summary?.held_for_review?.length || 0
    rows.push({
      name: 'Submission readiness',
      value: held ? `${held} held` : 'Nothing held',
      accept: 'Accept the output as final only when no code is still held for a coder. Held is a waiting state, not an engine error.',
      how: 'Held codes are left off the encounter add list until a coder accepts or rejects them.',
      ok: held === 0,
    })
    if (c?.time) {
      rows.push({
        name: 'Estimated turnaround',
        value: `${c.time.codex_min} min vs ${c.time.human_min} min`,
        accept: 'Accept when the CODEX estimate is below the manual estimate. These are planning figures, not a measured clock time.',
        how: 'The estimate is 0.8 + 0.1 × code count minutes for CODEX, and 6 + 3 × code count minutes for a manual review.',
        ok: c.time.codex_min < c.time.human_min,
      })
    }
  }
  const engineNames = ['Patient identity', 'Eligibility', 'Layout confidence', 'Citation coverage', 'MEAT on submitted codes', 'Routing against the threshold', 'Delete support', 'Output link']
  const engine = rows.filter((row) => engineNames.includes(row.name))
  return { id, rows, engineOk: engine.length > 0 && engine.every((row) => row.ok) }
}
