import { useMemo, useState } from 'react'
import { fmt, rng } from '../lib/format'

// 5,000 simulated code suggestions: p = true (calibrated) acceptance probability, raw = over-confident model score.
const POP = (() => { const R = rng(42), out = []; for (let i = 0; i < 5000; i++) { const u = R(); let p = R() < 0.82 ? 1 - 0.42 * Math.pow(u, 2.6) : 0.15 + 0.7 * u; p = Math.min(0.995, Math.max(0.05, p)); out.push({ p, raw: Math.pow(p, 0.38) }) } return out })()

function Histogram({ t, cal }) {
  const bins = 40, lo = 0.2, W = 640, H = 300, pl = 40, pb = 48, pt = 24, cw = (W - pl - 10) / bins
  const sc = (x) => (cal ? x.p : x.raw)
  const hc = Array(bins).fill(0), he = Array(bins).fill(0)
  POP.forEach((x) => { const s = sc(x); if (s < lo) return; const b = Math.min(bins - 1, Math.floor(((s - lo) / (1 - lo)) * bins)); hc[b]++; he[b] += 1 - x.p })
  const mx = Math.max(...hc), tx = pl + ((t - lo) / (1 - lo)) * (W - pl - 10)
  return (
    <svg id="hist" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 10 }}>
      {hc.map((n, i) => { const x = pl + i * cw, h = (n / mx) * (H - pb - pt), h2 = (he[i] / mx) * (H - pb - pt), on = lo + (i / bins) * (1 - lo) >= t - 1e-9
        return <g key={i}><rect x={x + 1} y={H - pb - h} width={cw - 2} height={h} fill={on ? '#9fdcb9' : '#f6d58f'} /><rect x={x + 1} y={H - pb - h2} width={cw - 2} height={h2} fill={on ? '#c23b1a' : '#a86a00'} opacity=".85" /></g> })}
      <line x1={tx} x2={tx} y1={pt} y2={H - pb} stroke="#4f3cc9" strokeWidth="2.5" strokeDasharray="5 3" />
      <text x={tx - 10} y={pt - 8} textAnchor="end" fontSize="12" fill="#4f3cc9" fontWeight="700">← coder review</text>
      <text x={Math.min(tx + 10, W - 92)} y={pt - 8} fontSize="12" fill="#1b8f4e" fontWeight="700">auto-submit →</text>
      {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => <text key={v} x={pl + ((v - lo) / (1 - lo)) * (W - pl - 10)} y={H - pb + 16} fontSize="11" textAnchor="middle" fill="#7a869c">{v.toFixed(1)}</text>)}
      <line x1={pl} x2={W - 10} y1={H - pb} y2={H - pb} stroke="#cfd6e3" />
      <text x={(W + pl) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#7a869c">{cal ? 'Calibrated' : 'Raw'} confidence score</text>
      <rect x={pl + 10} y={pt + 6} width="10" height="10" fill="#9fdcb9" /><text x={pl + 25} y={pt + 15} fontSize="11" fill="#44526a">correct codes</text>
      <rect x={pl + 10} y={pt + 22} width="10" height="10" fill="#c23b1a" /><text x={pl + 25} y={pt + 31} fontSize="11" fill="#44526a">expected errors</text>
    </svg>
  )
}

export default function GateLab() {
  const [t, setT] = useState(0.9)
  const [cal, setCal] = useState(true)
  const m = useMemo(() => {
    const auto = POP.filter((x) => (cal ? x.p : x.raw) >= t), err = auto.reduce((s, x) => s + (1 - x.p), 0)
    return { autoPct: Math.round((auto.length / POP.length) * 100), acc: auto.length ? 1 - err / auto.length : 1, err: (err / POP.length) * 10000, rev: ((POP.length - auto.length) * 2.5) / 60, n: auto.length }
  }, [t, cal])
  const cls = m.acc >= 0.97 ? 'ok' : m.acc >= 0.93 ? 'warn' : 'bad'
  return (
    <>
      <div className="eyebrow">Confidence gate lab</div>
      <h2>Where should the auto-submit line sit?</h2>
      <p className="lead">Every code suggestion gets a confidence score. Above the threshold it goes straight to CMS; below it, a coder reviews it with the evidence already assembled. Move the threshold and see the trade-off between automation and errors reaching CMS. Switch calibration off to see why Platt calibration matters: raw model scores are over-confident, so the same threshold lets more errors through.</p>
      <div className="labwrap">
        <div className="card">
          <div className="ctrls" style={{ justifyContent: 'space-between' }}>
            <div className="toggle" id="calTog"><button className={cal ? 'on' : ''} onClick={() => setCal(true)}>Platt-calibrated</button><button className={!cal ? 'on' : ''} data-c="0" onClick={() => setCal(false)}>Raw model score</button></div>
            <span className="small muted">5,000 simulated code suggestions</span>
          </div>
          <Histogram t={t} cal={cal} />
          <div className="slider"><span className="small" style={{ whiteSpace: 'nowrap' }}>Auto-submit threshold</span><input type="range" min="0.5" max="0.99" step="0.01" value={t} onChange={(e) => setT(+e.target.value)} /><b className="mono">{t.toFixed(2)}</b></div>
        </div>
        <div>
          <div className="grid g2">
            <div className="metric"><div className="v" style={{ color: 'var(--ok)' }}>{m.autoPct}%</div><div className="l">Suggestions auto-submitted</div></div>
            <div className="metric"><div className="v">{m.n ? (m.acc * 100).toFixed(1) + '%' : '–'}</div><div className="l">Actual accuracy in the auto lane</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--bad)' }}>{fmt(m.err)}</div><div className="l">Errors reaching CMS per 10,000 codes</div></div>
            <div className="metric"><div className="v" style={{ color: 'var(--warn)' }}>{fmt(m.rev)} h</div><div className="l">Coder review hours (2.5 min / code)</div></div>
          </div>
          <div className={`note small ${cls}`} style={{ marginTop: 14 }}>
            {cal ? (m.acc >= 0.97 ? <>At {t.toFixed(2)} the auto lane meets the 97%+ first-pass acceptance target while removing {m.autoPct}% of the coding work.</> : <>Below target: auto-lane accuracy {(m.acc * 100).toFixed(1)}%. Raise the threshold or improve upstream extraction.</>)
              : <><b>Uncalibrated.</b> The model "feels" {t.toFixed(2)} confident, but actual accuracy in the auto lane is {(m.acc * 100).toFixed(1)}%. That gap between stated and real confidence is what Platt calibration removes.</>}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h4>How the gate stays honest</h4>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Calibration is trained on historical submission acceptance, so a 0.92 really means about 92 of 100 such codes are accepted.</li>
              <li>The gate is recalibrated every quarter against actual submission and audit outcomes.</li>
              <li>A random QA sample of the auto lane is still reviewed by coders, which keeps the calibration measurable.</li>
              <li>Diagnoses from unacceptable sources (lab-only, chatbot conversations, non-clinician visits) are blocked before scoring. Confidence never overrides eligibility.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
