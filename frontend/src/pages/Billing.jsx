import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useTenant } from '../state/TenantContext'
import { useUI } from '../state/ui'

const TERMS = [['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']]
const usd = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function Billing() {
  const { tenants, account, id, choose, reload } = useTenant()
  const { toast } = useUI()
  const [planId, setPlanId] = useState('retrospective')
  const [duration, setDuration] = useState('year')
  const [quantity, setQuantity] = useState(10000)
  const [quote, setQuote] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!account || account.tenant.id !== id) return
    setPlanId(account.subscription.plan_id)
    setDuration(account.subscription.duration)
    setQuantity(account.subscription.quantity)
  }, [id, account])

  useEffect(() => {
    if (!planId || !quantity) return undefined
    let stop = false
    api.quote(planId, duration, Number(quantity) || 1).then((q) => { if (!stop) setQuote(q) }).catch(() => {})
    return () => { stop = true }
  }, [planId, duration, quantity])

  if (!account) {
    return <div className="card"><h2>Tenants & pricing</h2><p className="lead">Waiting for the API on port 8000.</p><button className="btn pri" onClick={() => reload().catch((e) => toast(e.message))}>Try again</button></div>
  }

  const sub = account.subscription
  const price = sub.price
  const cap = price.included || 1
  const used = account.usage.charts
  const pct = Math.min(100, Math.round((used / cap) * 100))
  const plan = (account.plans || []).find((p) => p.id === planId)
  const same = planId === sub.plan_id && duration === sub.duration && Number(quantity) === sub.quantity

  const apply = async () => {
    setBusy(true)
    try {
      await api.subscribe({ plan_id: planId, duration, quantity: Number(quantity) })
      await reload()
      toast('Pricing saved for ' + account.tenant.name)
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="eyebrow">Multi-tenant · usage and term</div>
      <h2>Each organisation has its own charts and its own price</h2>
      <p className="lead">A tenant is the company that buys CODEX. Switching organisation hides the other company’s charts. The price depends on what is counted — a chart, a member, or a covered life — and on how long they commit. A longer term uses a lower unit price. These amounts are proposal figures for the demo, not a live invoice.</p>

      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Organisation</div>
          <h3>{account.tenant.name}</h3>
          <span className="tag">{account.tenant.kind_label}</span>
          <p className="small">{account.tenant.summary}</p>
          <label className="small" htmlFor="tenantPick"><b>Switch organisation</b></label>
          <select id="tenantPick" className="btn" style={{ display: 'block', marginTop: 6, width: '100%' }} value={id} onChange={(e) => choose(e.target.value)}>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.kind_label}</option>)}
          </select>
        </div>
        <div className="card">
          <div className="eyebrow">This term</div>
          <h3>{price.plan_name}</h3>
          <p className="small" style={{ marginTop: 0 }}>{price.line}</p>
          <div className="grid g3">
            <div className="metric"><div className="v" style={{ color: 'var(--codex)' }}>{usd(price.total)}</div><div className="l">Term total</div></div>
            <div className="metric"><div className="v">{usd(price.monthly_equivalent)}</div><div className="l">Per month</div></div>
            <div className="metric"><div className="v">{used.toLocaleString()}</div><div className="l">Charts coded</div></div>
          </div>
          <div className="meter" style={{ marginTop: 12 }} title={`${used} of ${price.included}`}><span style={{ width: pct + '%' }} /></div>
          <p className="xs muted" style={{ margin: '6px 0 0' }}>
            {price.usage === 'chart' || price.usage === 'platform'
              ? `${used.toLocaleString()} charts coded of ${price.included.toLocaleString()} included. Coding the same note again does not count twice.`
              : `The bill follows ${price.quantity.toLocaleString()} ${price.unit === 'covered life' ? 'covered lives' : 'members'}, not the chart count. Charts coded this term: ${used.toLocaleString()}.`}
            {price.overage > 0 ? ` Overage so far: ${usd(price.overage)}.` : ''}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Choose a price</h3>
        <div className="ctrls" style={{ marginBottom: 12 }}>
          {TERMS.map(([k, label]) => (
            <button key={k} className={`btn ${duration === k ? 'pri' : ''}`} onClick={() => setDuration(k)}>{label}</button>
          ))}
          <label className="small">Quantity
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ marginLeft: 8, width: 140 }} />
          </label>
          <span className="xs muted">{plan ? plan.unit : 'units'} for this term</span>
        </div>
        <div className="kcards">
          {(account.plans || []).map((p) => (
            <button key={p.id} className={p.id === planId ? 'on' : ''} onClick={() => { setPlanId(p.id); if (!quantity) setQuantity(p.example) }}>
              <div className="eyebrow">{p.fits_tenant ? 'Fits this organisation' : 'Also available'}</div>
              <h3>{p.name}</h3>
              <p className="small" style={{ margin: 0 }}>{p.blurb}</p>
            </button>
          ))}
        </div>
        {quote && (
          <div className="note" style={{ marginTop: 14 }}>
            <b>{quote.plan_name} · {quote.duration}</b>
            <p className="small" style={{ margin: '4px 0' }}>{quote.line}</p>
            <p className="small" style={{ margin: 0 }}>Term total <b>{usd(quote.total)}</b> · about {usd(quote.monthly_equivalent)} a month.
              {quote.overage > 0 ? ` That includes ${usd(quote.overage)} because the quantity is ${quote.extra_units.toLocaleString()} past the charts included in the fee.` : ''}
            </p>
            <button className="btn pri" style={{ marginTop: 8 }} disabled={busy || same} onClick={apply}>{same ? 'This is the current price' : 'Save this price'}</button>
          </div>
        )}
      </div>
    </>
  )
}
