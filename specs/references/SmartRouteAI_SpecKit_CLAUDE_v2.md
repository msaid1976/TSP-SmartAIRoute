# SmartRoute AI — Spec Kit Implementation Plan v2.0
### Agent: **Claude Code** | Methodology: Spec-Driven Development (SDD)
### Role: Code reviewer and quality gate — NOT the builder
### Status: **REVISED** — Generic TSP Platform

---

> **How to use this spec:**
> 1. Place this file at `specs/references/SmartRouteAI_SpecKit_CLAUDE_v2.md`
> 2. In Claude Code: `/specify` → `/clarify` → `/plan` → `/tasks` → `/implement` — one phase at a time
> 3. Claude's role is reviewer and advisor. Codex writes the code. Claude checks it.
> 4. Never skip a phase gate. Human must confirm acceptance criteria before proceeding.

---

## Project vision

SmartRoute AI is a **generic routing optimization SaaS** platform. It accepts any problem that can
be expressed as nodes with distances, runs multiple algorithms, and recommends the best solver.

The platform is **domain-agnostic**. It does not model machines, technicians, or trucks.
It models nodes, edges, distances, and objectives.

---

## Claude's review responsibilities per phase

### Phase 001 checks
- Docker Compose starts cleanly — no port conflicts, no missing env vars
- `GET /api/health` actually tests the DB connection, not just returns OK
- Worker processes Celery ping task — not just registered, actually processed
- pre-commit hooks actually block on lint errors (test by introducing a lint error)

### Phase 002 checks
- Parser functions are pure — no DB imports, no side effects, no global state
- Text parser handles malformed input gracefully (returns warnings, not crashes)
- Normalizer is deterministic: same input → same UUID? (no — UUID is generated fresh each call, that is correct)
- Distance matrix is correct: symmetric for Euclidean, asymmetric allowed for matrix_tsp
- Map ingestion works (Malaysia first): lat/lon payload produces a haversine distance matrix (km) and stays generic via metadata.geo
- `POST /problems/preview` never writes to DB — verify with query log
- Validation errors are human-readable strings, not Python exception messages

### Phase 003 checks
- Every solver result passes `validate_route()` before returning — check the code, not just tests
- GA crossover produces a valid permutation (no duplicates, no missing nodes)
- ACO pheromone matrix initializes correctly — no divide-by-zero on iteration 1
- Seeded runs are truly reproducible: run `ga.solve(TEST_PROBLEM, seed=42)` twice, compare routes
- `convergence` array is monotonically non-increasing (each entry ≤ previous)
- Celery task timeout is applied — solver cannot run forever

### Phase 004 checks
- PSO final result is a valid permutation (decoded from float vector — verify decoding logic)
- NSGA-II stores Pareto front data in `solverParams.paretoFront` (verify non-empty)
- Recommendation scores are all in [0.0, 1.0] — add assertion test
- Explanation string references actual metric values (distance, solver name, etc.)
- Benchmark mode runs exactly 18 solver tasks (6 solvers × 3 seeds) — verify job count

### Phase 005 checks
- TypeScript build has zero errors — `pnpm build` must pass
- No `any` types — `pnpm type-check` must pass
- Polling hook stops on terminal states — does not keep polling after `completed`
- `RouteViewer` handles empty/null route gracefully — no crash
- API client is typed — no inline `fetch()` calls in components

### Phase 006 checks
- JWT tokens expire — verify access token TTL is enforced
- User A cannot access User B's problems — integration test with two users
- Rate limiting is active — send 11 requests in < 60 seconds, expect 429
- `pytest --cov` reports ≥ 80% — check it is measuring the right source paths
- Production Dockerfile uses non-root user — verify `USER` directive exists

---

## CONSTITUTION quick reference

- Stack is frozen: Next.js 14 · FastAPI · PostgreSQL 15 · Redis 7 · Celery 5
- Pydantic v2 everywhere in Python. TypeScript strict everywhere in frontend
- No solver logic outside `/solvers/`. No secrets hardcoded
- Generic problem model: nodes + distances only — no domain entities
- Canonical schemas frozen after Phase 002 — changes need human approval (map inputType is included as part of Phase 002 ingestion)
- Recommendation engine is rule-based only — never calls an LLM
- Phase gates are hard stops — human must confirm before proceeding
- All stochastic solvers accept `seed` for reproducibility

---

## Canonical schemas (for quick reference during reviews)

### Problem schema key fields
```json
{
  "problemId": "uuid",
  "problemType": "tsp | atsp | weighted_tsp | matrix_tsp | open_tsp",
  "nodes": [{"id": "A", "label": "City A", "x": 0.0, "y": 0.0}],
  "distanceMatrix": null,
  "startNodeId": "A",
  "returnToStart": true,
  "objective": "min_distance | min_cost | min_time",
  "constraints": {"maxRuntimeSeconds": 60}
}
```

### Solver result schema key fields
```json
{
  "runId": "uuid",
  "solver": "ga | aco | ortools | sa | pso | nsga2",
  "status": "completed | failed | timeout",
  "route": ["A", "C", "B", "D", "A"],
  "totalDistance": 125.4,
  "runtimeMs": 842,
  "convergence": [200.4, 180.2, 125.4],
  "seed": 42
}
```

---

## Standard test fixture (use in all solver reviews)

```python
TEST_PROBLEM = {
    "problemType": "tsp",
    "nodes": [
        {"id": "A", "x": 565, "y": 575}, {"id": "B", "x": 25,  "y": 185},
        {"id": "C", "x": 345, "y": 750}, {"id": "D", "x": 945, "y": 685},
        {"id": "E", "x": 845, "y": 655}, {"id": "F", "x": 880, "y": 660},
        {"id": "G", "x": 25,  "y": 230}, {"id": "H", "x": 525, "y": 1000},
        {"id": "I", "x": 580, "y": 1175},{"id": "J", "x": 650, "y": 1130},
    ],
    "startNodeId": "A", "returnToStart": True,
    "objective": "min_distance", "constraints": {}
}

def is_valid_route(route, problem):
    """Every solver result must satisfy this."""
    node_ids = {n["id"] for n in problem["nodes"]}
    return_to_start = route and route[-1] == route[0]
    core = route[:-1] if return_to_start else route
    return set(core) == node_ids and len(core) == len(node_ids)
```

---

## Algorithm review notes (notebook-inspired implementations)

When reviewing solver implementations, verify these notebook-inspired patterns are correct:

**GA (notebook 1 ideas):**
- Crossover must produce valid permutations — no duplicate nodes
- Adaptive crossover switching: OX for early generations, PMX for later
- 2-opt local search must improve or equal the current best (never worsen)
- Elitism: top N solutions must appear unchanged in next generation

**PSO (notebook 2 ideas):**
- Float position vector must be decoded to valid permutation via rank
- Inertia weight must decay over iterations (verify it does not stay constant)
- Personal and global best updates must use route cost, not float distance

**NSGA-II (notebook 3 ideas):**
- Two objectives only: total distance + max single edge
- Pareto front must contain multiple solutions (single solution = bug)
- Knee-point extraction must use the normalized distance-from-ideal method
- pymoo version must be pinned in requirements — NSGA-II API changed between versions

**ACO (notebook 4 ideas):**
- Pheromone matrix must be positive everywhere (min floor value prevents zeroing)
- Elite ant reinforcement: verify only top-3 ants reinforce, not all ants
- Stagnation detection: if best cost unchanged for 20 iterations, increase rho
- 2-opt phase 2 must run after ACO phase 1, not inside it

---

## Phase map

| Phase | Focus | Claude's gate question |
|---|---|---|
| 001 | Foundation | Does the full stack start? |
| 002 | Ingestion | Do all 4 parsers produce valid canonical schemas? |
| 003 | Solvers core | Do all 3 solvers pass `validate_route` on the standard fixture? |
| 004 | Benchmark | Does the comparison produce a ranked list with explanation? |
| 005 | UI | Does the full end-to-end user flow work in the browser? |
| 006 | SaaS hardening | Does `pytest` pass at ≥ 80% with user auth enforced? |

---

## Reference files

- **Codex full spec:** `.agents/skills/specification.md`
- **Canvas component design:** `specs/references/SmartRouteAI_GraphCanvas_Design.md`
- **OCR pipeline design:** `specs/references/SmartRouteAI_OCR_ImageExtraction_Design.md`
