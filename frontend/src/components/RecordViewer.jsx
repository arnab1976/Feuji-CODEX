// Renders a medical record: header, sections, highlighted entities (after NER) and OCR layout blocks (stage 01).
export const Legend = ({ show }) => (
  <div className="legend" style={{ display: show ? 'flex' : 'none' }}>
    <span><i style={{ background: '#ece8ff', borderBottom: '2px solid var(--codex)' }} />Condition</span>
    <span><i style={{ background: '#e2f5f3', borderBottom: '2px solid var(--teal)' }} />Medication</span>
    <span><i style={{ background: '#e5eefd', borderBottom: '2px solid var(--gap)' }} />Lab</span>
    <span><i style={{ background: '#fff3d9', borderBottom: '2px solid var(--warn)' }} />Vital / exam</span>
  </div>
)

export default function RecordViewer({ record, blocks = false, ner = false }) {
  const m = record.meta
  const chart = record.chart
  const sections = chart
    ? chart.sections
    : (record.preview || []).map((s, si) => ({ title: s.title, lines: s.lines.map((t, i) => ({ id: `p${si}-${i}`, segs: [{ t, e: null }] })) }))
  const conf = (title) => {
    if (!chart) return ''
    const b = chart.ocr.blocks.find((x) => x.block === title) || chart.ocr.blocks.find((x) => title.toLowerCase().includes(x.block.toLowerCase().split(' ')[0]))
    return (b ? b.confidence : chart.ocr.mean_confidence).toFixed(2)
  }
  const cls = ['doc', chart?.scan || m.quality !== 'Digital text' ? 'scan' : '', blocks && chart ? 'blocks' : '', ner && chart ? 'ner' : ''].join(' ')
  return (
    <>
      <Legend show={ner && !!chart} />
      <div className={cls} id="doc">
        <div className="dh">
          <div><b>{m.patient}</b> · Member {m.member}<div className="xs muted">{m.visit} · {m.prism}</div></div>
          <div className="xs" style={{ textAlign: 'right' }}>DOS {m.dos}<br />{m.prov} ({m.ptype})</div>
        </div>
        {sections.map((s, i) => (
          <div className="sec" key={i} data-blk={conf(s.title)}>
            <h5>{s.title}</h5>
            {s.lines.map((ln) => (
              <div className="ln" id={`ln-${ln.id}`} key={ln.id}>
                <span className={ln.hand ? 'hand' : undefined}>
                  {ln.segs.map((g, k) => (g.e ? <span key={k} className={`ent ${g.e}`}>{g.t}</span> : <span key={k}>{g.t}</span>))}
                </span>
              </div>
            ))}
          </div>
        ))}
        {!sections.length && <div className="muted small">No text in this record.</div>}
      </div>
    </>
  )
}
