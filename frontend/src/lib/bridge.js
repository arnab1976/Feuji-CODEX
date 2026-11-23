// Patient 360 ⇄ CODEX postMessage bridge (browser side).
// Inbound : {type:'codex:loadRecord', patientId, record:{curated?:'A'|'B'|'C', name?, meta?, text?}, step?}
//           {type:'codex:selectTab', tab}
// Outbound: {type:'codex:ready', version} on load · {type:'codex:result', ...} when the user sends a result.
export const ALLOWED_ORIGINS = (import.meta.env.VITE_ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim())
export const VERSION = '1.1'
export const isEmbedded = () => window.parent && window.parent !== window

export function postToParent(msg) {
  if (!isEmbedded()) return false
  window.parent.postMessage(msg, ALLOWED_ORIGINS[0] === '*' ? '*' : ALLOWED_ORIGINS[0])
  return true
}

export function listen(handler) {
  const fn = (e) => {
    const m = e.data
    if (!m || typeof m !== 'object' || typeof m.type !== 'string' || !m.type.startsWith('codex:')) return
    if (ALLOWED_ORIGINS[0] !== '*' && !ALLOWED_ORIGINS.includes(e.origin)) return
    handler(m)
  }
  window.addEventListener('message', fn)
  return () => window.removeEventListener('message', fn)
}
