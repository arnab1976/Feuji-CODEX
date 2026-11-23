# Convenience commands (Linux / macOS). On Windows run the commands inside each target manually.
.PHONY: install dev api web test build docker

install:            ## install backend + frontend dependencies
	cd backend && python -m pip install -r requirements-dev.txt
	cd frontend && npm install

api:                ## FastAPI on :8000 (auto-reload)
	cd backend && uvicorn app.main:app --reload --port 8000

web:                ## React dev server on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test:               ## backend unit + API tests
	cd backend && python -m pytest -q

build:              ## production build of the frontend (served by the API)
	cd frontend && npm run build

docker:             ## single container on :8000
	docker compose up --build
