import { useEffect, useState } from 'react'

export const TABS = ['home', 'knowledge', 'journey', 'gate', 'roi', 'compliance', 'billing']
const LEGACY = { agents: 'knowledge/agents', customers: 'knowledge/customers' }
const read = () => {
  const tab = location.hash.slice(1).split('?')[0].split('/')[0]
  if (LEGACY[tab]) return 'knowledge'
  return TABS.includes(tab) ? tab : 'home'
}
function redirectLegacy() {
  const raw = location.hash.slice(1).split('?')[0]
  const next = LEGACY[raw]
  if (!next) return false
  location.replace('#' + next)
  return true
}

export function go(tab) {
  const next = LEGACY[tab] || tab
  if (location.hash.slice(1) !== next) location.hash = next
  else window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useHashTab() {
  const [tab, setTab] = useState(read)
  useEffect(() => {
    const f = () => { if (redirectLegacy()) return; setTab(read()); window.scrollTo({ top: 0 }) }
    redirectLegacy()
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return tab
}
