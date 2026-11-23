import { runMetrics, STAGES, patientIdentity } from './runSpec'

export function ChainBar({ record, step }) {
  const spec = STAGES[step]
  const id = patientIdentity(record)
  if (!record || !spec) return null
  return (
    <section className="chain">
      <div className={`idcheck ${id.same ? 'ok' : 'bad'}`}>
        <b>{id.same ? 'Patient name held' : 'Patient name is not the same in every copy'}</b>
        <span>{id.display}</span>
        <span className="xs">Record “{id.stored || '—'}” · metadata “{id.meta || '—'}” · chart header “{id.header || '—'}”</span>
      </div>
      <div className="handoff">
        <div><span className="xs muted">Input from the previous stage</span><b>{spec.input}</b></div>
        <div><span className="xs muted">This stage · {spec.name}</span><b>{spec.what}</b></div>
        <div><span className="xs muted">Output passed to the next stage</span><b>{spec.output}</b></div>
      </div>
      <div className="spec">
        <p><b>How it works.</b> {spec.how}</p>
        <p><b>Tools, stack, and algorithm running now.</b> {spec.running}</p>
        <p><b>LLM and other models.</b> {spec.later}</p>
      </div>
    </section>
  )
}

export function MetricsPanel({ record }) {
  const { rows, engineOk } = runMetrics(record)
  return (
    <section className="chain">
      <div className={`idcheck ${engineOk ? 'ok' : 'bad'}`}>
        <b>{engineOk ? 'This run is acceptable on the engine checks' : 'This run is not acceptable yet'}</b>
        <span className="xs">Acceptable means identity, eligibility, layout confidence, citations, MEAT, routing, deletes, and the output link all pass. A held code means the submission is not final.</span>
      </div>
      <div className="spec">
        <p><b>How to validate the output.</b> Compare the patient name above with the chart you retrieved. Download the codes file and confirm each submitted code’s source line is in the note. Confirm auto-submitted codes sit at or above the threshold. Confirm a delete is a claim diagnosis the note does not assess. Download the audit log and read it in order: ingested, eligibility, routed, submission.</p>
      </div>
      <table className="mtable">
        <thead><tr><th>Metric</th><th>This run</th><th>What to accept</th><th>How it is measured</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td><b>{row.name}</b></td>
              <td><span className={`tag ${row.ok ? 'ok' : 'bad'}`}>{row.value}</span></td>
              <td>{row.accept}</td>
              <td>{row.how}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
