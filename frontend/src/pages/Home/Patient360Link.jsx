const SNIPPET = `<!-- Patient 360 page -->
<iframe id="codex"
  src="https://codex.your-portal.com/?embed=1&patient=PRISM-P-77502#journey">
</iframe>

<script>
const codex = document.getElementById('codex');

// 1. push the visit note when CODEX is ready
window.addEventListener('message', e => {
  if (e.data.type === 'codex:ready') {
    codex.contentWindow.postMessage({
      type: 'codex:loadRecord',
      patientId: 'PRISM-P-77502',
      record: {
        name: 'NP home visit 20 Feb 2026',
        meta: { enc: 'ENC-2026-0220-40912',
                ptype: 'NP', visit: 'Face-to-face' },
        text: noteText      // from NEXUS / EHR
      }
    }, 'https://codex.your-portal.com');
  }
  // 2. receive the coded outcome
  if (e.data.type === 'codex:result') {
    updatePatient360(e.data);  // timeline, problem list
  }
});
</script>

// Server-to-server alternative:
// set CODEX_PATIENT360_WEBHOOK_URL and CODEX posts codex:result
// to your Patient 360 backend from POST /api/bridge/result/{id}`

const MESSAGES = [['codex:ready', 'CODEX → portal', 'Iframe loaded'], ['codex:loadRecord', 'portal → CODEX', 'Send a note + metadata for a patient'],
  ['codex:selectTab', 'portal → CODEX', 'Open a tab (e.g. journey)'], ['codex:result', 'CODEX → portal', 'Coded outcome for the encounter']]

export default function Patient360Link() {
  const test = () => window.postMessage({ type: 'codex:loadRecord', patientId: 'PRISM-P-77502', record: { curated: 'C' }, step: 2 }, '*')
  return (
    <div className="card" style={{ marginTop: 16 }} id="p360link">
      <div className="eyebrow">Integration</div>
      <h3>Linking CODEX to the Patient 360 portal</h3>
      <div className="grid g2">
        <div>
          <ol className="small" style={{ paddingLeft: 18, marginTop: 0 }}>
            <li><b>Host:</b> deploy this app (Docker) next to the Healthcare 360 portal, e.g. <code>https://codex.your-portal.com</code>.</li>
            <li><b>Embed per patient:</b> load it in an iframe with the PRISM patient ID. <code>embed=1</code> hides CODEX's own header.</li>
            <li><b>Push a record</b> from the Patient 360 page with <code>postMessage</code> (type <code>codex:loadRecord</code>). It opens straight in the journey.</li>
            <li><b>Listen for results:</b> CODEX posts <code>codex:result</code> (submitted, held, deleted codes, queries) when the user clicks "Send to Patient 360". The API can also forward it server-side to <code>CODEX_PATIENT360_WEBHOOK_URL</code>.</li>
            <li><b>Production:</b> set <code>VITE_ALLOWED_ORIGINS</code> and <code>CODEX_CORS_ORIGINS</code> to the portal's domain and run behind the portal's SSO.</li>
          </ol>
          <table className="small"><thead><tr><th>Message</th><th>Direction</th><th>Purpose</th></tr></thead>
            <tbody>{MESSAGES.map(([m, d, p]) => <tr key={m}><td><code>{m}</code></td><td>{d}</td><td>{p}</td></tr>)}</tbody></table>
          <div className="ctrls" style={{ marginTop: 10 }}><button className="btn pri" id="bridgeTest" onClick={test}>Test the bridge: simulate Patient 360 sending Dorothy's visit note</button></div>
        </div>
        <pre className="json" style={{ maxHeight: 'none' }}>{SNIPPET}</pre>
      </div>
    </div>
  )
}
