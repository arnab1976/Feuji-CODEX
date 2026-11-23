// Global journey state: records in the session, selected record, wizard step.
// Lifted to app level so Home buttons and an external intake message can drive the journey.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { go } from '../lib/useHash'
import { useUI } from './ui'

const Ctx = createContext(null)
export const useJourney = () => useContext(Ctx)

export function JourneyProvider({ children }) {
  const { toast } = useUI()
  const [records, setRecords] = useState([])
  const [selId, setSelId] = useState(null)
  const [record, setRecord] = useState(null)        // full detail of the selected record
  const [step, setStepRaw] = useState(1)
  const [phase, setPhase] = useState('sources')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => { const l = await api.list(); setRecords(l); return l }, [])
  const loadDetail = useCallback(async (id) => { if (!id) { setRecord(null); return null } const r = await api.get(id); setRecord(r); return r }, [])

  useEffect(() => { refresh().then((l) => { if (l.length) setSelId(l[l.length - 1].id) }).catch(() => toast('Backend not reachable. Start the API on :8000')) }, [refresh, toast])
  useEffect(() => {
    const onTenant = () => { setSelId(null); setRecord(null); setStepRaw(1); refresh().then((l) => { if (l.length) setSelId(l[l.length - 1].id) }).catch(() => {}) }
    window.addEventListener('codex-tenant', onTenant)
    return () => window.removeEventListener('codex-tenant', onTenant)
  }, [refresh])
  useEffect(() => { loadDetail(selId).catch(() => {}) }, [selId, loadDetail])

  const maxStep = record ? (record.processed ? 5 : 3) : 1
  const setStep = useCallback((n) => {
    const mx = record ? (record.processed ? 5 : 3) : 1
    if (n > mx) { toast(n > 3 ? 'Run CODEX on this record first (step 3)' : 'Load or select a record first'); n = mx }
    setStepRaw(n)
  }, [record, toast])

  const update = useCallback((r) => { setRecord(r); setRecords((l) => l.map((x) => (x.id === r.id ? { ...x, ...r } : x))); return r }, [])
  const afterCreate = useCallback(async (created, msg) => {
    await refresh()
    if (created.length) { setSelId(created[created.length - 1].id); toast(msg || `${created.length} record(s) added`) }
  }, [refresh, toast])

  const openCurated = useCallback(async (key, toStep = 2) => {
    const [r] = await api.simulate({ kind: 'curated', key })
    await refresh(); setSelId(r.id); await loadDetail(r.id)
    setPhase('work'); setStepRaw(toStep >= 3 ? 3 : toStep); go('journey')
    return r
  }, [refresh, loadDetail])

  const pin = useCallback((id) => setSelId(id), [])

  const value = useMemo(() => ({
    records, record, selId, step, phase, maxStep, busy, setBusy,
    select: (id) => { setSelId(id); if (phase === 'work') setStepRaw((s) => (s === 1 ? 2 : s)) },
    pin,
    setStep, refresh, update, afterCreate, openCurated,
    startJourney: () => { setPhase('sources'); setStepRaw(1); go('journey') },
    showSources: () => { setPhase('sources'); go('journey') },
    enterCoding: () => { setPhase('work'); setStepRaw(1); go('journey') },
    openRecord: async (id, toStep = 2) => { await refresh(); setSelId(id); setPhase('work'); setStepRaw(toStep); go('journey') },
    remove: async (id) => { await api.remove(id); const l = await refresh(); if (id === selId) { const n = l.length ? l[l.length - 1].id : null; setSelId(n); if (!n) setStepRaw(1) } },
    clear: async () => { await api.clear(); await refresh(); setSelId(null); setRecord(null); setStepRaw(1) },
  }), [records, record, selId, step, phase, maxStep, busy, setStep, refresh, update, afterCreate, openCurated, pin])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
