# Manufacturing SOP Training Platform

Turn a Standard Operating Procedure PDF into a structured, quiz-backed training course — automatically.

An admin uploads an SOP PDF, a background worker sends it to Google Gemini and gets back a
multi-module training program with per-module practice quizzes and a scored final quiz. The admin
assigns the training to employees, who read the modules at their own pace and take the final quiz
to get a pass/fail score.

---

## Contents

| Directory | What it is | Details |
|---|---|---|
| [manufacturing-backend/](manufacturing-backend/) | FastAPI API, Postgres, RQ worker, Gemini integration | [backend README](manufacturing-backend/README.md) |
| [manufacturing-frontend/](manufacturing-frontend/) | React 19 + Vite SPA for both roles | [frontend README](manufacturing-frontend/README.md) |

---

## Architecture

```
┌──────────────┐   JWT / REST    ┌──────────────────┐
│   React SPA  │ ───────────────▶│   FastAPI app    │
│  (Vite, TS)  │◀─────────────── │  auth / admin /  │
└──────────────┘                 │     employee     │
                                 └────────┬─────────┘
                                          │ enqueue job
                                          ▼
                                 ┌──────────────────┐      ┌────────────────┐
                                 │  Redis  +  RQ    │─────▶│  RQ worker     │
                                 └──────────────────┘      │ PyPDF2 extract │
                                                           │ Gemini 2.5     │
                                                           │ Flash → JSON   │
                                                           └───────┬────────┘
                                          ┌───────────────────────┘
                                          ▼
                                 ┌──────────────────┐
                                 │ Postgres (Neon)  │
                                 │ users, documents │
                                 │ trainings,       │
                                 │ assignments,     │
                                 │ progress         │
                                 └──────────────────┘
```

**Stack:** Python 3.13 · FastAPI · SQLAlchemy 2.x · Alembic · Neon Postgres · Redis + RQ ·
Google Gemini 2.5 Flash · PyPDF2 — and React 19 · TypeScript · Vite 7 · React Router v7 ·
TanStack Query · Tailwind CSS v4.

---

## Quick start

Four processes: Postgres (hosted on Neon), Redis, the API, the worker — plus the frontend dev server.

### 1. Backend

```bash
cd manufacturing-backend
cp .env.example .env          # fill in DATABASE_URL, SECRET_KEY, GEMINI_API_KEY

uv sync                       # or: pip install -r requirements.txt

brew services start redis     # macOS; verify with `redis-cli ping` → PONG
uv run alembic upgrade head   # apply migrations

uv run uvicorn app.main:app --reload
```

API on `http://localhost:8000`, interactive docs at `http://localhost:8000/docs`.

### 2. Worker (separate terminal)

```bash
cd manufacturing-backend
uv run python worker.py
```

Training generation runs here, not in the request cycle — the API returns immediately and the
frontend polls for status. Without a running worker, uploaded documents stay stuck in `processing`.

### 3. Frontend (separate terminal)

```bash
cd manufacturing-frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

App on `http://localhost:5173`.

### 4. Create the first admin

There is no signup screen — seed an admin through the API, then create employees from the
admin UI (`/admin/users`) or the same endpoint:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"changeme","role":"admin"}'
```

---

## Environment variables

**Backend** (`manufacturing-backend/.env`) — see [`.env.example`](manufacturing-backend/.env.example):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql+psycopg2://user:pass@host/db` |
| `SECRET_KEY` | yes | JWT signing key |
| `ALGORITHM` | no | Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | Defaults to `1440` (24h) |
| `REDIS_URL` | yes | Defaults to `redis://localhost:6379` |
| `GEMINI_API_KEY` | yes | Google Gemini API key |
| `AWS_*`, `S3_BUCKET_NAME` | no | S3 upload is currently disabled — see below |

**Frontend** (`manufacturing-frontend/.env`): `VITE_API_URL` — base URL of the FastAPI server.

---

## How it works

### Training generation

1. Admin uploads a PDF → bytes stored in `documents.file_data`, status `uploaded`.
2. Admin clicks **Generate Training** → `POST /admin/documents/{id}/generate-training` sets
   status `processing`, enqueues an RQ job, and stores the `job_id`.
3. The worker ([`training_worker.py`](manufacturing-backend/app/workers/training_worker.py)):
   extracts text with PyPDF2 (capped at 12k chars), prompts Gemini 2.5 Flash for a strict JSON
   schema, validates the response, and writes a row to `trainings`.
4. Status becomes `training_ready` (or `failed` with an `error_message`). Progress is surfaced
   through `progress_message` while the job runs.
5. The admin documents page polls `GET /admin/documents` every 5s and swaps in a **View Training**
   button when the job lands.

The generated JSON — stored whole in `trainings.modules` — looks like:

```jsonc
{
  "title": "…",
  "modules": [
    {
      "id": "module-1",
      "title": "…",
      "summary": "…",
      "content": [ { "type": "paragraph", "text": "…" },
                   { "type": "bullet_list", "items": ["…"] } ],
      "quiz": { "questions": [ { "id": "q1", "question": "…",
                                 "options": ["…","…","…"],
                                 "correct_index": 0, "explanation": "…" } ] }
    }
  ],
  "final_quiz": { "questions": [ { "id": "fq1", … } ] }
}
```

Module quizzes are **practice only** — ungraded, for self-checking while reading. Only the
`final_quiz` is scored.

### Assignment and progress

An admin assigns a training to employees (`assignments`, unique per training + user). As an
employee moves through modules, the frontend saves a resume point via
`PATCH /employee/trainings/{id}/progress` (`current_module_index`), so they can pick up where they
left off.

### Scoring

- Score = `round(correct / total × 100)` over the final-quiz questions only.
- Pass threshold: **≥ 80%**.
- Stored in `progress` as an upsert — retaking overwrites the previous score and clears the resume
  point. `completed` is set only on a pass.
- Trainings generated before `final_quiz` existed fall back to scoring all module questions.

---

## API reference

All routes except `/auth/register`, `/auth/login`, and `/health` require
`Authorization: Bearer <token>`; `/admin/*` requires the `admin` role, `/employee/*` the `employee` role.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an admin or employee user |
| POST | `/auth/login` | Returns `{ access_token, user }` |
| GET | `/auth/me` | Current user |
| POST | `/auth/change-password` | Change own password |

### Admin
| Method | Path | Description |
|---|---|---|
| POST | `/admin/documents` | Upload a SOP PDF |
| GET | `/admin/documents` | List documents with status + `training_id` |
| GET | `/admin/documents/{id}` | Single document status |
| POST | `/admin/documents/{id}/generate-training` | Enqueue generation |
| POST | `/admin/documents/{id}/cancel-training` | Cancel an in-flight job |
| GET | `/admin/trainings/{id}` | Training with modules + quizzes |
| POST | `/admin/trainings/{id}/assign` | Assign to employees |
| GET | `/admin/users` | List employees |
| POST | `/admin/users/{id}/reset-password` | Reset an employee's password |

### Employee
| Method | Path | Description |
|---|---|---|
| GET | `/employee/trainings` | Assigned trainings with progress |
| GET | `/employee/trainings/{id}` | Modules, quizzes, progress |
| PATCH | `/employee/trainings/{id}/progress` | Save resume point |
| POST | `/employee/trainings/{id}/submit-quiz` | Submit final quiz → score |

---

## Frontend routes

| Path | Role | Page |
|---|---|---|
| `/login` | public | Email + password |
| `/admin/documents` | admin | Upload SOPs, generate trainings |
| `/admin/trainings/:id` | admin | Review modules, assign employees |
| `/admin/users` | admin | Manage employees, reset passwords |
| `/employee/trainings` | employee | Assigned trainings |
| `/employee/trainings/:id` | employee | Read modules, take the final quiz |

`/` redirects by role; unauthenticated visits go to `/login`. A 401 from any request clears the
stored token and bounces to `/login`.

---

## Database migrations

Schema changes go through Alembic. `Base.metadata.create_all()` in
[`app/main.py`](manufacturing-backend/app/main.py) is a development convenience only — don't rely
on it for schema evolution.

```bash
cd manufacturing-backend
uv run alembic revision --autogenerate -m "describe_your_change"
uv run alembic upgrade head
uv run alembic downgrade -1     # roll back one
```

---

## Deployment

- **Backend** — [`Procfile`](manufacturing-backend/Procfile) declares separate `web` and `worker`
  processes. On single-dyno hosts, [`start.sh`](manufacturing-backend/start.sh) runs the worker in
  the background alongside uvicorn.
- **Frontend** — `npm run build` → `dist/`. [`vercel.json`](manufacturing-frontend/vercel.json)
  rewrites all paths to `index.html` for client-side routing.

Before going live: lock down `allow_origins` in [`app/main.py`](manufacturing-backend/app/main.py)
(currently `["*"]`) and set a real `SECRET_KEY`.

---

## Known limitations

- **PDF bytes live in Postgres.** S3 upload is wired up in
  [`app/services/s3.py`](manufacturing-backend/app/services/s3.py) but commented out at both call
  sites — fill in the AWS env vars and re-enable the blocks in `routers/admin.py` and
  `workers/training_worker.py` to switch over.
- **JWT in `localStorage`**, which is XSS-exposed; `httpOnly` cookies would be safer in production.
- **Only the first ~12,000 characters** of a PDF reach Gemini, so very long SOPs are truncated.
- **CORS is fully open** and `/auth/register` is unauthenticated — both fine for development,
  neither is production-ready.
