# Gesalps Backend (FastAPI)

Endpoints (JWT via Supabase):
- `GET /health`
- `POST /v1/projects {name}` – inserts into `projects` with `owner_id`
- `POST /v1/datasets/upload` (multipart: `project_id`, `file`) – infers schema, uploads raw CSV to `datasets` bucket, inserts `datasets`
- `POST /v1/runs {dataset_id, method, mode}` – enqueues run
- `GET /v1/runs/{id}/status` – returns status
- `GET /v1/runs/{id}/metrics` – returns metrics JSON
- `GET /v1/runs/{id}/artifacts` – returns signed URLs for artifacts

Worker: background thread polls queued runs, writes dummy metrics & artifacts.

Env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended)
- `SUPABASE_ANON_KEY` (fallback for local dev)

Local setup with .env:
- Create `backend/.env` (already added) containing your Supabase values:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY` for server-only use)
- For convenience, `NEXT_PUBLIC_*` variants are also included and recognized by the app.

Run locally:
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Storage:
- Buckets (private): `datasets`, `artifacts`

Database schema

An idempotent SQL is included under `sql/schema.sql` to create tables, RLS policies and storage buckets. Apply with the Supabase CLI:

```bash
# From the backend folder
supabase link --project-ref <your-project-ref>   # one time
bash scripts/apply_schema.sh
```

Alternatively, open the Supabase SQL editor and run the contents of `sql/schema.sql` once.

Security notes:
- JWT is verified against Supabase JWKS when possible; falls back to unverified claims if JWKS fails (adjust as needed).
- For production, keep `SERVICE_ROLE` key private and run on server-side only.
