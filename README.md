# SmartRoute AI

Phase 001 provides the monorepo foundation for SmartRoute AI:

- `apps/web`: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui-style base components
- `apps/api`: FastAPI, Pydantic Settings, SQLAlchemy, Alembic shell, `/api/health`
- `apps/worker`: Celery worker with Redis broker and startup `ping` task
- `packages/shared`: shared TypeScript types and Python Pydantic schemas

Phase 002 adds stateless preview + persistence for generic problems (nodes + distances), including:
- text, table, matrix ingestion
- draw canvas ingestion
- map ingestion (Malaysia cities first, plus starter Indonesia/Singapore/Thailand), which stores geo info in metadata and computes a haversine distance matrix

Map datasets live in:
- `apps/web/app/new-problem/malaysia-cities.ts` (Malaysia city list and simple outlines)
- `apps/web/app/new-problem/country-cities.ts` (country registry; to add a new country, add another `CountryDefinition`)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.12+
- Docker with Compose

## Environment

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Review the values in `.env`.

The defaults are set for Docker Compose. If you run the API or worker directly on your host while
PostgreSQL and Redis run in Docker, override `POSTGRES_HOST=localhost` and `REDIS_HOST=localhost`
for those commands.

## Local install

Install the web workspace dependencies:

```bash
pnpm install
```

Create a virtual environment and install the Python packages in editable mode:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e packages/shared/python -e apps/api[dev] -e apps/worker[dev] pre-commit
```

Install the git hooks:

```bash
pre-commit install
```

## Run with Docker Compose

Build and start the full stack:

```bash
docker compose up --build
```

Expected endpoints:

- Web UI: `http://localhost:3000`
- API health: `http://localhost:8000/api/health`

The worker dispatches a startup `ping` task to itself. To confirm it processed successfully:

```bash
docker compose logs worker
```

Look for a log line containing `Processed ping task`.

## Run without containers

Start infrastructure only:

```bash
docker compose up -d postgres redis
```

Run the API:

```bash
source .venv/bin/activate
POSTGRES_HOST=localhost REDIS_HOST=localhost uvicorn app.main:app --app-dir apps/api --reload
```

Run the worker:

```bash
source .venv/bin/activate
POSTGRES_HOST=localhost REDIS_HOST=localhost celery -A worker_app.celery_app:celery_app worker --workdir apps/worker --loglevel=info
```

Run the web app:

```bash
pnpm --dir apps/web dev
```

## Checks

Run the web lint and type-check:

```bash
pnpm lint
pnpm typecheck
```

Run the Python tests:

```bash
source .venv/bin/activate
pytest
```

Run pre-commit across the repository:

```bash
source .venv/bin/activate
pre-commit run --all-files
```

## Phase 001 Notes

- `apps/api/alembic/versions/` is intentionally empty in this phase.
- The health endpoint verifies database connectivity before returning `db: connected`.
- All Python configuration flows through Pydantic Settings in `packages/shared/python/smartroute_shared/settings.py`.
