import { useJourney } from '../state/JourneyContext'
import { useTenant } from '../state/TenantContext'
import { go } from '../lib/useHash'

export const TAB_LABELS = [['home', '🏠 Home'], ['knowledge', 'Knowledge bank'], ['journey', '▶ Journey: input → output'], ['gate', 'Confidence gate lab'], ['roi', 'ROI calculator'],
  ['compliance', 'Compliance guardrails'], ['billing', 'Tenants & pricing']]

export function Topbar() {
  const { startJourney } = useJourney()
  const tenant = useTenant()
  return (
    <header className="topbar">
      <div className="brand"><div className="logo">CX</div><div><h1>CODEX</h1><small>Clinical Outcome Documentation EXtraction Engine</small></div></div>
      <span className="crumb">Independent coder › Risk adjustment › SA-07</span>
      <span className="sp" />
      {tenant?.tenants?.length > 0 && (
        <select className="tenantpick" aria-label="Organisation" value={tenant.id} onChange={(e) => tenant.choose(e.target.value)}>
          {tenant.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      <span className="pill">● Demo mode · synthetic charts</span>
      <button className="tbtn" onClick={startJourney} style={{ background: '#7c66ff', color: '#fff' }}>▶ Start journey</button>
    </header>
  )
}

export function Tabs({ tab }) {
  return (
    <nav className="tabs" id="tabs">
      {TAB_LABELS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
    </nav>
  )
}
