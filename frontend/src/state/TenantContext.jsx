import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, currentTenantId, setTenantId } from '../lib/api'

const Ctx = createContext(null)
export const useTenant = () => useContext(Ctx)

export function TenantProvider({ children }) {
  const [tenants, setTenants] = useState([])
  const [account, setAccount] = useState(null)
  const [id, setId] = useState(currentTenantId)
  const reload = useCallback(async () => {
    const [list, acct] = await Promise.all([api.tenants(), api.account()])
    setTenants(list)
    setAccount(acct)
    return acct
  }, [])
  useEffect(() => { reload().catch(() => setAccount(null)) }, [reload, id])
  const choose = useCallback((next) => {
    if (!next || next === currentTenantId()) return
    setTenantId(next)
    setId(next)
  }, [])
  const value = useMemo(() => ({ tenants, account, id, choose, reload }), [tenants, account, id, choose, reload])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
