import { useEffect } from 'react'
import { Tabs, Topbar } from './components/Topbar'
import { api, PATIENT_ID } from './lib/api'
import { listen, postToParent, VERSION } from './lib/bridge'
import { go, useHashTab } from './lib/useHash'
import Billing from './pages/Billing'
import Compliance from './pages/Compliance'
import GateLab from './pages/GateLab'
import Home from './pages/Home/Home'
import Journey from './pages/Journey/Journey'
import Knowledge from './pages/Knowledge/Knowledge'
import Roi from './pages/Roi'
import { JourneyProvider, useJourney } from './state/JourneyContext'
import { TenantProvider } from './state/TenantContext'
import { UIProvider, useUI } from './state/ui'

const PAGES = { home: Home, knowledge: Knowledge, journey: Journey, gate: GateLab, roi: Roi, compliance: Compliance, billing: Billing }

function Bridge() {
  // Receives charts pushed by an external system (iframe parent or an intake message).
  const { openCurated, openRecord } = useJourney()
  const { toast } = useUI()
  useEffect(() => listen(async (m) => {
    if (m.type === 'codex:selectTab' && m.tab) go(m.tab)
    if (m.type !== 'codex:loadRecord') return
    const rec = m.record || {}
    try {
      let r
      if (rec.curated) r = await openCurated(rec.curated, m.step || 2)
      else if (rec.text) {
        r = await api.addText(rec.text, rec.name, 'External intake', { ...(rec.meta || {}), ...(m.patientId ? { prism: m.patientId } : {}) })
        await openRecord(r.id, m.step || 2)
      }
      if (r && m.patientId && rec.curated) await api.patch(r.id, { meta: { prism: m.patientId } })
      toast('Chart received from an external source' + (m.patientId ? ' for ' + m.patientId : ''))
    } catch (e) { toast('Bridge error: ' + e.message) }
  }), [openCurated, openRecord, toast])
  useEffect(() => { postToParent({ type: 'codex:ready', version: VERSION }) }, [])
  return null
}

function Shell() {
  const tab = useHashTab()
  const Page = PAGES[tab]
  useEffect(() => { if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed') }, [])
  return (
    <>
      <Bridge />
      <Topbar />
      <Tabs tab={tab} />
      <main>
        {PATIENT_ID && <div className="ctx">Opened for external patient <b>{PATIENT_ID}</b>. New records default to this patient ID.</div>}
        <section className="tab on"><Page /></section>
      </main>
      <footer>All patients, providers, identifiers and clinical details in this portal are synthetic and for demonstration only. HCC mappings are shown per CMS-HCC V28 for illustration; production uses current CMS mapping tables. Figures in the ROI calculator are illustrative assumptions. © Feuji Software Solutions · AI Practice.</footer>
    </>
  )
}

export default function App() {
  return <UIProvider><TenantProvider><JourneyProvider><Shell /></JourneyProvider></TenantProvider></UIProvider>
}
