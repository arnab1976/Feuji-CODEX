// Small presentational building blocks reused across pages.
export const Html = ({ html, as: Tag = 'span', ...p }) => <Tag {...p} dangerouslySetInnerHTML={{ __html: html }} /> // trusted static copy only

export function ConfBar({ p, thr = 0.9 }) {
  const col = p >= thr ? 'var(--ok)' : p < 0.3 ? 'var(--bad)' : 'var(--warn)'
  return (
    <div className="conf"><div className="b"><i style={{ width: `${p * 100}%`, background: col }} /></div><span className="mono">{Number(p).toFixed(2)}</span></div>
  )
}

const MEAT = { M: 'Monitor', E: 'Evaluate', A: 'Assess', T: 'Treat' }
export const Meat = ({ m = '' }) => (
  <span className="meat">{['M', 'E', 'A', 'T'].map((l) => <span key={l} className={m.includes(l) ? 'y' : ''} title={MEAT[l]}>{l}</span>)}</span>
)

export const HccTag = ({ hcc }) => (hcc ? <span className="tag">HCC {hcc}</span> : <span className="tag grey">no HCC</span>)

export function Kpis({ items }) {
  return (
    <div className="grid g6" style={{ marginBottom: 16 }}>
      {items.map(([v, l]) => <div key={l} className="card kpi"><div className="v">{v}</div><div className="l">{l}</div></div>)}
    </div>
  )
}

export const KPIS = [['3×', 'Certified coder throughput'], ['97%+', 'First-pass CMS acceptance (from 85–90%)'], ['>90%', 'HCC code accuracy'],
  ['$1.5M', 'Backlog cost saved per plan / yr'], ['40%', 'Error-rate reduction'], ['12 wks', 'Go-live']]

export function flashLine(id) {
  const el = document.getElementById('ln-' + id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800)
}

export const Cite = ({ line, children }) => <button className="cite" onClick={() => flashLine(line)}>{children || 'source'}</button>
