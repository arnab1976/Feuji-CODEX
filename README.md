# CODEX: Clinical Outcome Documentation EXtraction Engine

Feuji Healthcare 360 · Use case SA-07 · Risk adjustment

CODEX reads medical records (PDF, TIFF, handwriting, text), codes every risk-adjusting condition to ICD-10 and CMS-HCC V28
with cited MEAT evidence, then routes each code: **auto-submit**, **coder review**, **delete** (two-way coding) or
**physician query**. This repository is the full application behind the CODEX interactive portal:

| Layer | Tech | What it does |
|---|---|---|
| `frontend/` | React 18 + Vite | The portal UI: Home, 5-step Journey (input → output), Gate lab, ROI, Agents, Healthcare 360 link, Customers, Compliance |
| `backend/` | FastAPI + SQLAlchemy | REST API, the 5-agent pipeline, storage, uploads, exports (CSV/JSON/ZIP), Patient 360 bridge |
| Docker | one container | API on :8000 also serves the built UI |

> All patients and records are synthetic. The built-in agents run in **rules mode**: a deterministic,
> dependency-free stand-in for Textract / BioBERT / the fine-tuned LLM, so the whole journey works offline.
> Production hooks are marked `TODO(production)` in `backend/app/agents/`.

---

## Quick start

### Option 1: Docker (one command)
```bash
docker compose up --build
# open http://localhost:8000      API docs: http://localhost:8000/docs
```

### Option 2: local development (hot reload)
```bash
# terminal 1: API
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# terminal 2: UI
cd frontend
npm install
npm run dev            # http://localhost:5173  (proxies /api → :8000)
```
`make install`, `make api`, `make web`, `make test` and `make docker` wrap the same commands.

### Tests
```bash
cd backend && python -m pytest -q      # engine + full API journey (9 tests)
```

---

## Repository layout
```
codex-healthcare360/
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI app; also serves frontend/dist
│   │   ├── config.py               settings (env prefix CODEX_)
│   │   ├── db.py                   SQLAlchemy model `Record` (SQLite default, PostgreSQL ready)
│   │   ├── schemas.py              request bodies
│   │   ├── agents/                 ★ the five SA-07 agents
│   │   │   ├── ocr_agent.py        01 OCR Extraction: file → text (pypdf / optional Tesseract) → layout blocks
│   │   │   ├── ner_agent.py        02 NLP Coding: entity candidates, negation/history, highlights
│   │   │   ├── llm_coder_agent.py  03 LLM HCC Coder: codes, MEAT, combination rules, deletes, gaps
│   │   │   ├── gate_agent.py       04 Confidence Gate: eligibility + calibrated routing
│   │   │   ├── addendum_agent.py   05 Addendum AI: non-leading physician query
│   │   │   └── pipeline.py         orchestrates 01→03 for a record
│   │   ├── engine/
│   │   │   ├── dictionary.py       ★ clinical concept dictionary (regex → ICD-10 → V28 HCC); extend here
│   │   │   ├── parser.py           note text → metadata + sections
│   │   │   ├── curated.py          demo charts A/B/C (data/curated.json)
│   │   │   └── simulator.py        random synthetic charts + downloadable sample pack
│   │   ├── services/
│   │   │   ├── results.py          result builder: lanes, summary, EDS payload, audit log, CSVs, Patient 360 message
│   │   │   └── exporter.py         per-record ZIP and whole-session ZIP
│   │   ├── routers/                records · exports · samples · bridge
│   │   └── data/                   curated.json, simbank.json
│   ├── tests/                      pytest: engine + API
│   └── requirements*.txt
├── frontend/
│   ├── public/                     favicon, CODEX_Cheat_Sheet.html
│   └── src/
│       ├── App.jsx                 tabs, hash routing, Patient 360 bridge listener
│       ├── styles/portal.css       ★ the portal design system (CSS variables at the top: re-theme here)
│       ├── lib/                    api.js (REST client + downloads) · bridge.js (postMessage) · useHash.js
│       ├── state/                  JourneyContext (records, selection, step) · ui (toast/modal)
│       ├── components/             RecordViewer, Topbar/Tabs, ConfBar/Meat/HccTag …
│       ├── data/content.json       static copy: agents, edges, journey, segments, compliance cards
│       └── pages/
│           ├── Home/               hero + animated picture, objective, purpose, requirements, animated architecture,
│           │                       benefits, Patient 360 link, I/O explorer, Start journey
│           ├── Journey/            StepInput · StepValidate · StepProcess · StepRoute · StepOutput · Queue
│           └── GateLab · Roi · Agents · H360 · Customers · Compliance
├── Dockerfile · docker-compose.yml · Makefile · .env.example
```

---

## The journey (input → output)

| Step | UI | API |
|---|---|---|
| 1 Input | upload files · simulated data (charts A/B/C, random, batch) · paste | `POST /api/records/upload` · `POST /api/records/simulate` · `POST /api/records/text` · `GET /api/samples/pack.zip` |
| 2 Validate | edit metadata, live eligibility gate | `PATCH /api/records/{id}` |
| 3 Process | run the agents, inspect stages 01–03 | `POST /api/records/{id}/process` |
| 4 Review & route | threshold, accept / reject, keep / delete | `PATCH …{threshold}` · `POST …/decisions` · `POST …/deletes` |
| 5 Output | downloads, physician query response, send to Patient 360 | `GET …/export/{zip,json,codes,audit,eds,input,query}` · `GET /api/session/export` · `POST …/query-response` · `POST /api/bridge/result/{id}` |

**Upload formats:** `.txt`/`.md` (one note, optional header lines `Patient:`, `Provider type:`, `Visit type:` …,
headings ending in `:`, `Dx on claim:` line for two-way coding) · `.csv` batch (`record_id, patient, member_id,
prism_id, encounter_id, date_of_service, provider, provider_type, visit_type, source_quality, signed, note_text, claim_dx`)
· `.json` (one record or a list) · `.pdf` (a text layer is read automatically) · images (`pytesseract` if installed, otherwise paste the text).
Download the sample pack from step 1 to see every format.

Records are scoped by an `X-Session-Id` header the browser generates, so different users don't see each other's work.

---

## Linking to the Patient 360 portal
```html
<iframe id="codex" src="https://codex.your-portal.com/?embed=1&patient=PRISM-P-77502#journey"></iframe>
<script>
  window.addEventListener('message', (e) => {
    if (e.data.type === 'codex:ready')
      document.getElementById('codex').contentWindow.postMessage(
        { type: 'codex:loadRecord', patientId: 'PRISM-P-77502',
          record: { name: 'NP visit', meta: { ptype: 'NP', visit: 'Face-to-face' }, text: noteText } },
        'https://codex.your-portal.com')
    if (e.data.type === 'codex:result') updatePatient360(e.data)   // submitted / held / deleted / problemList
  })
</script>
```
* `?patient=` sets the PRISM ID for new records; `embed=1` hides the CODEX header.
* Server-to-server: set `CODEX_PATIENT360_WEBHOOK_URL` (and `_TOKEN`) and `POST /api/bridge/result/{id}` forwards `codex:result`.
* Production: set `VITE_ALLOWED_ORIGINS` (frontend build) and `CODEX_CORS_ORIGINS` (API) to the portal origin.

---

## Where to change things
| I want to… | Edit |
|---|---|
| Re-theme to the Healthcare 360 palette | `frontend/src/styles/portal.css` → `:root` variables |
| Change page copy | `frontend/src/pages/**`, `frontend/src/data/content.json` |
| Add a condition / code | `backend/app/engine/dictionary.py` (add a `DICT` entry; most specific first in its group) |
| Change confidence scoring / routing | `llm_coder_agent.py` (`_code_with_rules`) · `gate_agent.py` |
| Plug in AWS Textract / BioBERT / an LLM | set `CODEX_*_MODE=production` and implement the `TODO(production)` methods |
| Use PostgreSQL | `CODEX_DATABASE_URL=postgresql+psycopg://…` and add `psycopg[binary]` to requirements |
| Add an export | `backend/app/routers/exports.py` + a button in `pages/Journey/StepOutput.jsx` |

## Compliance guardrails built into the code
Two-way coding (unsupported claim diagnoses → delete) · encounter-linked submissions only · eligibility before
confidence (acceptable provider type, face-to-face/video, signed, encounter ID) · no coding from labs or inferred
severity (gaps become non-leading queries) · per-code MEAT evidence with source line · full audit log of every routing
decision and coder action.

## Notes
* Rules mode is for demonstration only and is **not** a certified coding product. HCC mappings follow CMS-HCC V28 for
  illustration; production must use the current CMS tables and certified-coder validation.
* There is no authentication. Put the app behind the portal's SSO / API gateway before using any real PHI, and sign BAAs with any LLM/OCR provider.
