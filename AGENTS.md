# SmartRoute AI — Codex Agent Instructions

## Read before starting any work
1. Read .agents/skills/specification.md completely before writing any code.
2. For GraphCanvas work, read specs/references/SmartRouteAI_GraphCanvas_Design.md.
3. For Phase 006B (OCR), read specs/references/SmartRouteAI_OCR_ImageExtraction_Design.md fully.
4. For algorithm implementations, read the notebooks in specs/references/notebooks/ for IDEAS ONLY.
   Do NOT copy the VeRoLog domain classes: Gene, VeRoLogProblem, VeRoLogSolution,
   ChromosomeDecoder, BestFitDecreasingPacking, VeRoLogDataParser. These are specific to
   logistics scheduling and have no place in a generic routing platform.

## Project identity
SmartRoute AI is a GENERIC routing optimization SaaS platform.
It accepts any routing problem expressible as: nodes + distances + objectives.
It does NOT model machines, technicians, trucks, delivery dates, or installation dates.
Users: anyone with a routing problem — cities, warehouses, delivery stops, abstract graphs.

## Technology stack (frozen — do not change without explicit approval)
- Frontend: Next.js 14 App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui, Recharts, react-konva
- Backend: FastAPI, Pydantic v2, PostgreSQL 15, Redis 7, Celery 5
- Solvers: OR-Tools, GA, ACO, SA, PSO, NSGA-II, Tabu Search, Differential Evolution
- Infrastructure: Docker Compose, Alembic migrations, pnpm workspaces

## Generic problem model (never add domain-specific fields)
Every problem normalizes to exactly:
  problemType: "tsp | atsp | weighted_tsp | matrix_tsp | open_tsp"
  nodes: [{id, label, x, y}]          ← x/y can be null for matrix_tsp
  distanceMatrix: [[...]] | null       ← null when coords are available
  startNodeId: string
  returnToStart: boolean
  objective: "min_distance | min_cost | min_time"
  constraints: {}

No machine_id. No technician_id. No delivery_date. No installation_date. No truck_capacity.

Geo/map note: map ingestion (Malaysia first) stores geo context only in `metadata.geo` (e.g. `coordinateSystem=latlon`)
and computes a haversine distance matrix so solvers continue to consume the same generic schema.

## BaseSolver contract (frozen — never change)
Every solver extends BaseSolver and implements:
  solve(problem: dict) → dict
  validate_route(route, nodes) → bool
  get_distance_matrix(problem) → np.ndarray
    # Uses distanceMatrix if present, otherwise builds from x/y coordinates
    # This is how all solvers handle both tsp AND matrix_tsp with zero extra code

## Algorithm ideas to use from notebooks
- GA notebook: adaptive crossover switching by generation (OX → PMX), 2-opt post-processing, elitism
- PSO notebook: continuous float vector → rank decoding → valid permutation
- NSGA-II notebook: pymoo integration, knee-point extraction from Pareto front
- ACO notebook: multi-phase pipeline (ACO → SA → VNS), elite ant reinforcement, stagnation detection

## Solver registry
SOLVER_REGISTRY = { "ortools", "ga", "aco", "sa", "pso", "nsga2", "tabu", "de" }
All solvers extend BaseSolver in apps/api/solvers/base.py.
All solvers must: accept seed, record convergence[], call validate_route() before returning.

## Recommendation scoring formula
score = 0.40*quality + 0.20*runtime + 0.15*stability + 0.15*scalability + 0.10*constraint_fit
Rule-based only — never call an LLM inside the recommendation engine.

## Rules — always follow without exception
1. Implement ONE phase at a time — never implement Phase N+1 without explicit human approval
2. Stop at every phase gate and list all acceptance criteria for the human to verify
3. All Python: Pydantic v2 models, typed signatures, no bare dicts
4. All TypeScript: strict mode, zero `any` types
5. Every solver extends BaseSolver — no standalone solver scripts ever
6. Solvers ALWAYS run in Celery workers — never block the FastAPI thread
7. All secrets in .env — never hardcode credentials
8. Every new module needs tests: solvers get seeded unit tests, API gets integration tests
9. Run `git add . && git commit` after every confirmed phase

## UI design direction
- Dark-first: deep navy (#0A0F1E) background, electric blue (#3B82F6) accents, white text
- Typography: DM Sans for UI text, JetBrains Mono for data/numbers/routes
- shadcn/ui as component base, customized with Tailwind utility classes
- Smooth animated transitions on all route maps and convergence charts
- Mobile-responsive from Phase 005 onward
