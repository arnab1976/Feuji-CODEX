import { useState } from 'react'
import { fmt, money } from '../lib/format'

// [key, label, min, max, step, default, formatter]
const RF = [['charts', 'Charts reviewed per year', 50000, 1000000, 10000, 250000, (v) => fmt(v)], ['rate', 'Coder throughput today (charts / hour)', 2, 8, 0.5, 3.5, (v) => v],
  ['cost', 'Loaded coder cost ($ / hour)', 25, 90, 1, 48, (v) => '$' + v], ['auto', 'Charts fully cleared by the gate (%)', 20, 85, 1, 60, (v) => v + '%'],
  ['speed', 'Review speed-up with pre-assembled evidence (×)', 1, 3, 0.1, 1.6, (v) => v + '×'], ['qa', 'QA sample of auto lane (%)', 0, 20, 1, 5, (v) => v + '%'],
  ['acc0', 'First-pass CMS acceptance today (%)', 80, 95, 1, 87, (v) => v + '%'], ['acc1', 'First-pass acceptance with CODEX (%)', 90, 99, 1, 97, (v) => v + '%'],
  ['rw', 'Rework cost per rejected chart ($)', 10, 80, 1, 30, (v) => '$' + v]]
const DEF = Object.fromEntries(RF.map((f) => [f[0], f[5]]))

export default function Roi() {
  const [v, setV] = useState(DEF)
  const base = v.charts / v.rate, auto = (v.charts * v.auto) / 100, rev = v.charts - auto
  const cx = rev / (v.rate * v.speed) + (auto * v.qa) / 100 / v.rate
  const lab = (base - cx) * v.cost, rj0 = v.charts * (1 - v.acc0 / 100), rj1 = v.charts * (1 - v.acc1 / 100), rw = (rj0 - rj1) * v.rw
  const mx = Math.max(base, cx), m2 = Math.max(rj0, rj1, 1)
  const Bar = ({ label, val, max, color }) => <div className="barrow"><span>{label}</span><div className="track"><i style={{ width: `${(val / max) * 100}%`, background: color }} /></div><b className="mono">{fmt(val)}</b></div>
  return (
    <>
      <div className="eyebrow">ROI calculator · illustrative</div>
      <h2>What CODEX does to a plan's coding economics</h2>
      <p className="lead">Defaults are illustrative assumptions chosen to line up with the SA-07 targets (about 3× throughput, 97% first-pass acceptance). Replace them with the prospect's own volumes in discovery.</p>
      <div className="roi">
        <div className="card"><h3>Assumptions</h3>
          {RF.map(([k, l, mn, mxv, st, , f]) => (
            <div className="field" key={k}><label>{l}<output>{f(v[k])}</output></label>
              <input type="range" min={mn} max={mxv} step={st} value={v[k]} onChange={(e) => setV({ ...v, [k]: +e.target.value })} /></div>))}
          <button className="btn" onClick={() => setV(DEF)}>Reset defaults</button>
        </div>
        <div className="card">
          <div className="small muted">Estimated annual savings</div>
          <div className="bigv">{money(lab + rw)}</div>
          <div className="small">Coder labour <b>{money(lab)}</b> + avoided rework <b>{money(rw)}</b></div>
          <div style={{ marginTop: 14 }}>
            <Bar label="Coder hours · today" val={base} max={mx} color="#9aa6bd" />
            <Bar label="Coder hours · CODEX" val={cx} max={mx} color="var(--codex)" />
            <Bar label="Rejected charts · today" val={rj0} max={m2} color="#e3a08f" />
            <Bar label="Rejected charts · CODEX" val={rj1} max={m2} color="var(--bad)" />
          </div>
          <div className="grid g3" style={{ marginTop: 12 }}>
            <div className="metric"><div className="v" style={{ color: 'var(--codex)' }}>{(base / cx).toFixed(1)}×</div><div className="l">Effective coder throughput</div></div>
            <div className="metric"><div className="v">{(base / 1880).toFixed(1)}</div><div className="l">Coder FTE needed today</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--ok)' }}>{(cx / 1880).toFixed(1)}</div><div className="l">Coder FTE with CODEX</div></div>
          </div>
          <div className="note warn small">Savings exclude any change in risk-adjusted revenue. We deliberately do not sell CODEX on "more codes": two-way coding removes unsupported codes too, and revenue should move only where documentation supports it.</div>
        </div>
      </div>
    </>
  )
}
