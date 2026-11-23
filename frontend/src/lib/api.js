// Thin REST client for the CODEX FastAPI backend.
// Every call carries a per-browser session id so different users don't see each other's records.
const BASE = import.meta.env.VITE_API_BASE || ''

export const SESSION_ID = (() => {
  try {
    let s = localStorage.getItem('codex-session')
    if (!s) { s = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)); localStorage.setItem('codex-session', s) }
    return s
  } catch { return 'default' }
})()

export const DEFAULT_TENANT = 'harbor'

export function currentTenantId() {
  try {
    let s = localStorage.getItem('codex-tenant')
    if (!s) { s = DEFAULT_TENANT; localStorage.setItem('codex-tenant', s) }
    return s
  } catch { return DEFAULT_TENANT }
}

export function setTenantId(id) {
  try { localStorage.setItem('codex-tenant', id) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('codex-tenant', { detail: id }))
}

export const PATIENT_ID = new URLSearchParams(location.search).get('patient') // optional external patient id

function headers(extra = {}) {
  const h = { 'X-Session-Id': SESSION_ID, 'X-Tenant-Id': currentTenantId(), ...extra }
  if (PATIENT_ID) h['X-Patient-Id'] = PATIENT_ID
  return h
}

async function req(method, path, body) {
  const opt = { method, headers: headers(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }
  if (body) opt.body = body instanceof FormData ? body : JSON.stringify(body)
  const r = await fetch(BASE + path, opt)
  if (!r.ok) {
    let msg = r.statusText
    try { msg = (await r.json()).detail || msg } catch { /* ignore */ }
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return r.json()
}

/** Download a file from the API (keeps the session header) and save it locally. */
export async function download(path, fallbackName = 'download') {
  const r = await fetch(BASE + path, { headers: headers() })
  if (!r.ok) throw new Error('Download failed: ' + r.status)
  const cd = r.headers.get('Content-Disposition') || ''
  const name = (cd.match(/filename="?([^";]+)"?/) || [])[1] || fallbackName
  const blob = await r.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800)
  return name
}

export const api = {
  health: () => req('GET', '/api/health'),
  list: () => req('GET', '/api/records'),
  get: (id) => req('GET', `/api/records/${id}`),
  upload: (files, documentType) => { const fd = new FormData(); files.forEach((f) => fd.append('files', f)); if (documentType) fd.append('document_type', documentType); return req('POST', '/api/records/upload', fd) },
  addText: (text, name, source, meta) => req('POST', '/api/records/text', { text, name, source: source || 'Pasted / typed', meta: meta || {} }),
  simulate: (body) => req('POST', '/api/records/simulate', body),
  patch: (id, body) => req('PATCH', `/api/records/${id}`, body),
  remove: (id) => req('DELETE', `/api/records/${id}`),
  clear: () => req('DELETE', '/api/records'),
  process: (id) => req('POST', `/api/records/${id}/process`),
  processAll: () => req('POST', '/api/records/process-all'),
  decide: (id, code, decision) => req('POST', `/api/records/${id}/decisions`, { code, decision }),
  keepDelete: (id, code, keep) => req('POST', `/api/records/${id}/deletes`, { code, keep }),
  queryResponse: (id, response) => req('POST', `/api/records/${id}/query-response`, { response }),
  bridgeResult: (id) => req('POST', `/api/bridge/result/${id}`),
  curatedCards: () => req('GET', '/api/samples/curated'),
  tenants: () => req('GET', '/api/tenants'),
  account: () => req('GET', '/api/account'),
  subscribe: (body) => req('POST', '/api/account/subscription', body),
  quote: (planId, duration, quantity) => req('GET', `/api/pricing/quote?plan_id=${encodeURIComponent(planId)}&duration=${encodeURIComponent(duration)}&quantity=${encodeURIComponent(quantity)}`),
}
