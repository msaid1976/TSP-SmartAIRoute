# SmartRoute AI — Spec Kit Implementation Plan v2.1
### Agent: **OpenAI Codex** | Methodology: Spec-Driven Development (SDD)
### Status: **REVISED v2.1** — 8 solvers, 4 new visualization components, Phase 007 roadmap

---

> **How to use this spec with Codex + Spec Kit:**
> 1. `uvx --from git+https://github.com/github/spec-kit.git specify init smartroute-ai --ai codex --ai-skills`
> 2. Skills are installed to `.agents/skills/` — rename this file to `.agents/skills/specification.md`
> 3. Implement one phase at a time. Codex must not advance without human sign-off on acceptance criteria.
> 4. The notebooks in `specs/references/notebooks/` are **inspiration for algorithm ideas only** — do not import or copy their VeRoLog-specific domain model.

---

## Project vision

SmartRoute AI is a **generic routing optimization SaaS platform**. Users describe a routing or TSP
problem in any natural format, run multiple CI algorithms against it, compare results visually, and
receive a plain-language recommendation. The platform works for any routing problem that can be
expressed as nodes with distances — cities, warehouses, delivery stops, circuit board drill points,
DNA sequencing, or abstract distance matrices.

**The platform is domain-agnostic.** It does not know about machines, technicians, or truck capacity.
It knows about nodes, distances, objectives, and constraints.

---

## Repository structure

```text
smartroute-ai/
├── .agents/
│   └── skills/
│       └── specification.md         ← this file (renamed)
├── apps/
│   ├── web/                         ← Next.js 14 App Router
│   ├── api/                         ← FastAPI backend
│   └── worker/                      ← Celery async workers
├── packages/
│   └── shared/                      ← Shared TS types + Python schemas
├── specs/
│   ├── 001-foundation/
│   ├── 002-ingestion-normalization/
│   ├── 003-solvers-core/
│   ├── 004-benchmark-recommend/
│   ├── 005-ui-workflows/
│   └── 006-saas-hardening/
└── specs/references/
    ├── SmartRouteAI_SpecKit_CLAUDE_v2.md
    ├── SmartRouteAI_GraphCanvas_Design.md
    ├── SmartRouteAI_OCR_ImageExtraction_Design.md
    └── notebooks/                   ← algorithm inspiration only
```

---

## CONSTITUTION — Non-negotiable constraints across all phases

- **Stack:** Next.js 14 (App Router, TypeScript strict) · FastAPI 0.110+ · PostgreSQL 15 · Redis 7 · Celery 5 · shadcn/ui · Recharts
- **Type safety:** Pydantic v2 everywhere in Python. TypeScript strict — no `any` types
- **Generic problem model:** The canonical schema uses nodes + distance matrix only — no domain entities (machines, technicians, trucks). Domain problems map to this generic model before any solver sees them
- **Solver contract:** Every solver extends `BaseSolver`. No solver logic outside `/solvers/`
- **Schema stability:** Canonical schemas frozen after Phase 002. Changes require human approval
- **Async-first:** Solver execution always runs via Celery. API thread never runs optimization
- **Deterministic seeds:** All stochastic solvers accept a `seed` parameter
- **No hardcoded secrets:** `.env` and Pydantic Settings everywhere
- **Test coverage:** Unit tests for every solver with the standard benchmark fixture. Integration tests for every endpoint
- **Phase discipline:** Complete one phase fully before starting the next
- **Explainability:** Recommendation engine outputs a human-readable explanation string. No LLM calls inside it

---

## Canonical data contracts (frozen after Phase 002)

### Problem schema

```json
{
  "problemId": "uuid",
  "problemType": "tsp | atsp | weighted_tsp | matrix_tsp | open_tsp",
  "name": "10-city benchmark",
  "nodes": [
    {"id": "A", "label": "City A", "x": 0.0, "y": 0.0},
    {"id": "B", "label": "City B", "x": 3.0, "y": 5.0}
  ],
  "distanceMatrix": null,
  "startNodeId": "A",
  "returnToStart": true,
  "objective": "min_distance | min_cost | min_time",
  "secondaryObjectives": [],
  "constraints": {
    "maxRuntimeSeconds": 60,
    "maxNodeCount": 500
  },
  "metadata": {
    "inputSources": ["text", "table", "matrix", "gui", "map", "image"],
    "sourceText": "",
    "sourceTableRows": [],
    "sourceImageRef": null,
    "geo": {
      "countryCode": "MY",
      "countryName": "Malaysia",
      "coordinateSystem": "latlon"
    }
  }
}
```

**Distance matrix path:** When `distanceMatrix` is provided (not null), solvers use it directly
and ignore `x`/`y` coordinates. This enables asymmetric TSP and any custom distance function.

**Map ingestion path (Phase 002):** When `metadata.geo.coordinateSystem` is `latlon`, the normalizer
computes a haversine distance matrix (km). The canonical schema stays generic; geo context remains
in `metadata.geo` only.

**Country/city datasets (Phase 002):**
- Malaysia city list + simple outlines: `apps/web/app/new-problem/malaysia-cities.ts`
- Country registry (add more countries by adding another `CountryDefinition`): `apps/web/app/new-problem/country-cities.ts`

**problemType values:**
- `tsp` — symmetric, Euclidean coordinates
- `atsp` — asymmetric, requires distanceMatrix
- `weighted_tsp` — edge weights differ from Euclidean distance
- `matrix_tsp` — only distanceMatrix provided, no coordinates
- `open_tsp` — route does not need to return to start

### Solver result schema

```json
{
  "runId": "uuid",
  "solver": "ortools | ga | aco | sa | pso | nsga2 | tabu | de",
  "status": "completed | failed | timeout",
  "route": ["A", "C", "B", "D", "A"],
  "totalDistance": 125.4,
  "totalCost": 125.4,
  "runtimeMs": 842,
  "iterations": 300,
  "convergence": [200.4, 180.2, 150.1, 125.4],
  "seed": 42,
  "solverParams": {},
  "notes": []
}
```

### Comparison result schema

```json
{
  "comparisonId": "uuid",
  "problemId": "uuid",
  "recommendedSolver": "aco",
  "recommendationReason": "ACO achieved the best route quality with low variance across 5 runs.",
  "ranking": [
    {"solver": "aco",     "score": 0.91, "totalDistance": 118.2, "runtimeMs": 1200},
    {"solver": "ga",      "score": 0.88, "totalDistance": 121.4, "runtimeMs": 980},
    {"solver": "ortools", "score": 0.85, "totalDistance": 119.8, "runtimeMs": 340}
  ],
  "aggregates": [],
  "runs": []
}
```

---

## Architecture baseline

**Frontend:** Next.js 14 App Router · TypeScript strict · Tailwind CSS · shadcn/ui · react-konva · Recharts
**Backend:** FastAPI · Pydantic v2 · PostgreSQL 15 (SQLAlchemy + Alembic) · Redis 7 · Celery 5
**Solvers:** OR-Tools (exact) · GA · ACO · SA · PSO · NSGA-II · Tabu Search · DE (heuristic + hybrid + exact)
**Deployment target:** Docker Compose (dev) → single VPS e.g. Hetzner CX21 (prod)

---

## Supported problem families

**Phase 003 (MVP):**
- Symmetric TSP with Euclidean coordinates (nodes have x, y)
- Symmetric TSP with named nodes and distance matrix
- Open TSP (no return to start)

**Phase 004 (extended):**
- Asymmetric TSP (directional distances via distanceMatrix)
- Weighted TSP (edge weights provided, override Euclidean)
- Multi-objective TSP (minimize distance AND minimize cost simultaneously — NSGA-II)

**Phase 005+ (future):**
- VRP-lite (multiple vehicles, capacity constraints)
- Time-window routing (nodes have time windows)

---

## Solver registry

```python
# apps/api/solvers/__init__.py

SOLVER_REGISTRY: dict[str, type[BaseSolver]] = {
    "ortools": ORToolsSolver,                    # Phase 003 — exact, best for small problems
    "ga":      GeneticAlgorithmSolver,           # Phase 003 — population-based, adaptive crossover
    "aco":     AntColonySolver,                  # Phase 003 — multi-phase, elite ants
    "sa":      SimulatedAnnealingSolver,         # Phase 004 — single-solution, 2-opt cooling
    "pso":     ParticleSwarmSolver,              # Phase 004 — swarm, float encoding
    "nsga2":   NSGAIISolver,                     # Phase 004 — multi-objective Pareto
    "tabu":    TabuSearchSolver,                 # Phase 004 — memory-guided local search
    "de":      DifferentialEvolutionSolver,      # Phase 004 — continuous mutation, population
}
```

---

## BaseSolver contract (frozen)

```python
# apps/api/solvers/base.py
from abc import ABC, abstractmethod
from typing import Optional
import numpy as np

class BaseSolver(ABC):
    """Generic TSP solver base. All solvers must extend this."""

    name: str                    # must match key in SOLVER_REGISTRY
    supports_asymmetric: bool = False
    supports_multi_objective: bool = False

    def __init__(self, params: dict, seed: Optional[int] = None):
        self.params = params
        self.seed = seed
        if seed is not None:
            import random
            random.seed(seed)
            np.random.seed(seed)

    @abstractmethod
    def solve(self, problem: dict) -> dict:
        """
        Accepts canonical problem dict. Returns canonical solver result dict.
        Must call self.validate_route() before returning.
        Must record convergence at each iteration/generation.
        """
        ...

    def validate_route(self, route: list, nodes: list) -> bool:
        """Check route is a valid Hamiltonian cycle (or path for open TSP)."""
        node_ids = {n["id"] for n in nodes}
        return_to_start = route and route[-1] == route[0]
        core = route[:-1] if return_to_start else route
        return set(core) == node_ids and len(core) == len(node_ids)

    def build_distance_matrix(self, nodes: list) -> np.ndarray:
        """Build Euclidean distance matrix from node coordinates."""
        n = len(nodes)
        coords = np.array([[node["x"], node["y"]] for node in nodes])
        diff = coords[:, np.newaxis, :] - coords[np.newaxis, :, :]
        return np.sqrt((diff ** 2).sum(axis=2))

    def get_distance_matrix(self, problem: dict) -> np.ndarray:
        """
        Returns distance matrix for the problem.
        If distanceMatrix is provided, use it directly (supports ATSP).
        Otherwise build from x,y coordinates.
        """
        if problem.get("distanceMatrix"):
            return np.array(problem["distanceMatrix"])
        return self.build_distance_matrix(problem["nodes"])
```

---

## Algorithm implementation notes (from notebook analysis)

The 4 uploaded notebooks contain production-quality algorithm ideas. Extract these **concepts**
into the generic BaseSolver framework — do not copy the VeRoLog domain model:

### GA ideas (from GA_Heterogeneous_Design.ipynb)
- Adaptive crossover switching: BLX-α blend (exploration) → SBX (balanced) → arithmetic (exploitation), switch by generation progress
- Tournament selection with configurable pressure
- Polynomial and Gaussian mutation
- Local search: 2-opt improvement as post-processing step after each generation
- Memory-managed population sizing based on available RAM
- Elitism: preserve top N solutions across generations unchanged

### PSO ideas (from GA-Heterogeneous_with_PSO.ipynb)
- Encode tour as continuous position vector (one float per node representing visit order)
- Inertia weight decay over iterations (0.9 → 0.4)
- Global-best + personal-best velocity update
- Quantum-inspired perturbation for exploration escape
- Hybrid: run GA for N generations, feed best solution into PSO, alternate

### NSGA-II ideas (from GA_Heterogeneous_Design_with_NSGA_Pareto_Front.ipynb)
- Two simultaneous objectives: minimize total distance + minimize max edge (balance)
- pymoo integration: `PyMOOProblemWrapper` pattern for clean integration
- MultiObjectiveAnalyzer: extract knee-point solution as single recommended route
- Quiet callback pattern: suppress verbose output for web context

### ACO ideas (from Multi_Phase_Ant_Colony_Optimization__ACO_.ipynb)
- Multi-phase: ACO → Simulated Annealing refinement → Variable Neighborhood Search (2-opt, 3-opt)
- Strict feasibility repair at every stage
- Elite solution archive: keep top-K solutions, reinforce their edges with extra pheromone
- Adaptive evaporation rate based on stagnation detection

---

## Recommendation scoring formula

```
score = 0.40 × quality_score      # normalized: best distance = 1.0, worst = 0.0
      + 0.20 × runtime_score      # normalized: fastest = 1.0, slowest = 0.0
      + 0.15 × stability_score    # 1.0 - (stdDev / mean) across 3 runs with different seeds
      + 0.15 × scalability_score  # heuristic: ortools=0.3 (degrades at scale), ga=0.7, aco=0.8, sa=0.6, pso=0.6, nsga2=0.5, tabu=0.7, de=0.65
      + 0.10 × constraint_fit     # 1.0 if no active constraints; adjusted if limits hit
```

All components in [0.0, 1.0]. Rule-based only — no LLM calls inside recommendation engine.

---

## API endpoint catalogue

### Phase 002 endpoints

```
POST /api/problems/preview
  Body: {inputType, payload}
  Returns: {nodes, warnings, inputSource}

POST /api/problems
  Body: canonical problem dict
  Returns: {problemId, ...}

GET  /api/problems/{id}
GET  /api/problems/{id}/distance-matrix
```

### Phase 003 endpoints

```
POST /api/jobs
  Body: {problemId, solvers[], mode: "quick|compare|goal", goalObjective}
  Returns: {jobId, status: "queued"}

GET  /api/jobs/{id}
  Returns: {jobId, status, progress, runs[]}

GET  /api/runs/{jobId}
  Returns: SolverResult[]
```

### Phase 004 endpoints

```
POST /api/comparisons/{problemId}
GET  /api/comparisons/{problemId}
  Returns: ComparisonResult
```

### Phase 006 endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/me
GET  /api/me/problems
GET  /api/me/runs
```

---

## Input format support

### Text format (Phase 002)
```
A(0,0), B(3,5), C(6,2), D(2,8)
```
```
Cities: London(51.5, -0.1), Paris(48.8, 2.3), Berlin(52.5, 13.4)
```

### Table / CSV format (Phase 002)
```csv
id,label,x,y
A,City A,0,0
B,City B,3,5
```
```csv
,A,B,C
A,0,10,15
B,10,0,20
C,15,20,0
```
Second format → distanceMatrix path, problemType = "matrix_tsp"

### Canvas (GraphCanvas component, Phase 002/005)
User places nodes, draws edges. Serializes as node list with coordinates.

### Image (OCR, Phase 006B)
See `SmartRouteAI_OCR_ImageExtraction_Design.md`

---

# Phase 001 — Foundation and Repo Setup

### Goal
Production monorepo skeleton that all phases can build on.

### In scope
- Monorepo: `apps/web`, `apps/api`, `apps/worker`, `packages/shared`
- Next.js 14 frontend shell (App Router, TypeScript strict, Tailwind + shadcn/ui base)
- FastAPI backend shell with Pydantic Settings config
- Celery worker shell with Redis broker
- Docker Compose: PostgreSQL 15-alpine + Redis 7-alpine
- Alembic migration setup (empty initial migration — no tables yet)
- `packages/shared` exports typed schemas importable from both apps
- Linting: Ruff + ESLint + pre-commit hooks
- `.env.example` with all required variables documented

### Deliverables
- `docker compose up` starts entire stack without errors
- `GET /api/health` → `{"status": "ok", "db": "connected", "version": "1.0.0"}`
- Worker processes a `ping` task and logs confirmation
- Frontend renders at `localhost:3000` with health status
- `README.md` with complete local setup instructions

### Acceptance criteria
- [ ] `docker compose up` completes without errors
- [ ] `GET /api/health` returns 200 with `db: connected`
- [ ] Celery worker logs confirm ping task processed
- [ ] Frontend renders without TypeScript errors
- [ ] `.env.example` documents all required variables
- [ ] Ruff, ESLint, pre-commit run clean on empty codebase

### Out of scope
Solver logic · Parsing · Auth · Any product features

### Codex notes
- pnpm workspaces (`pnpm-workspace.yaml` at root)
- Pydantic Settings — never `os.environ` directly
- Docker: comment every non-obvious decision
- Alembic: empty `versions/` directory is correct for Phase 001

### ✋ Stop — do not start Phase 002 until human confirms all criteria above

---

# Phase 002 — Problem Ingestion and Normalization

### Goal
Accept problems in multiple formats and normalize all of them into the canonical problem schema.

### In scope

**Input parsers (all pure functions — no DB, no side effects):**
- `parse_text(text: str) → ParseResult` — extracts nodes from natural language / coordinate strings
- `parse_table(rows: list[list]) → ParseResult` — CSV/table to node list OR distance matrix
- `parse_matrix(data: list[list]) → ParseResult` — raw distance matrix → `matrix_tsp` schema
- `parse_canvas(payload: dict) → ParseResult` — canvas serialization → node list

**Normalizer:** `normalize(parsed: ParseResult) → CanonicalProblem`
- Assigns UUIDs, validates node count (2–500), calculates distance matrix if not provided
- Returns human-readable warnings (duplicate nodes, disconnected graph, etc.)

**Database tables (Alembic migration):**
- `problems`: id, user_id (nullable), name, problem_type, raw_input_type, raw_input_json, normalized_json, created_at

**API:**
- `POST /api/problems/preview` — parse without saving, returns preview
- `POST /api/problems` — parse, normalize, save to DB

### Acceptance criteria
- [ ] Text parser handles coordinate strings: `A(0,0), B(3,5)`, `A: 0,0` and similar variants
- [ ] Table parser handles: node-list CSV, distance matrix CSV
- [ ] Matrix parser infers `problemType = "matrix_tsp"` when no coordinates exist
- [ ] Normalizer produces identical output for identical input (deterministic)
- [ ] `POST /problems/preview` returns nodes + warnings in < 500ms with no DB write
- [ ] All 4 input formats round-trip: raw → normalized → parseable again
- [ ] Validation errors are human-readable strings (not codes)
- [ ] Alembic migration creates `problems` table cleanly

### Out of scope
Canvas is UI — spec the component in Phase 002, build it in Phase 005.
Image/OCR is Phase 006B.

### Standard test input (use in all parser tests)
```python
TEXT_INPUT_1 = "A(0,0), B(3,5), C(6,2), D(2,8)"
TEXT_INPUT_2 = "London(51.5,-0.1), Paris(48.8,2.3), Berlin(52.5,13.4)"
TABLE_NODES  = [["id","x","y"],["A","0","0"],["B","3","5"],["C","6","2"]]
TABLE_MATRIX = [[0,10,15],[10,0,20],[15,20,0]]
```

### ✋ Stop — do not start Phase 003 until human confirms all criteria above
**Schema is now frozen. Any later change requires explicit human approval.**

---

# Phase 003 — Async Solver Core

### Goal
Three working solvers (OR-Tools, GA, ACO) running asynchronously via Celery, returning valid routes.

### In scope

**Solvers (all extend BaseSolver):**

`ORToolsSolver` — exact TSP solver using Google OR-Tools routing library
- Use `pywrapcp.RoutingModel` with CHRISTOFIDES first-solution strategy
- Timeout controlled by `constraints.maxRuntimeSeconds`
- `supports_asymmetric = True` (OR-Tools handles ATSP via distance matrix)

`GeneticAlgorithmSolver` — GA with ideas from notebook 1
- Permutation chromosome (tour as ordered list of node indices)
- Order Crossover (OX) as default; adaptive switching to partially mapped crossover (PMX) after gen 50
- Gaussian mutation on swap probability, decaying from 0.15 to 0.05
- 2-opt local search applied to best individual each generation
- Elitism: top 10% preserved unchanged
- Default params: `population=100, generations=300, mutation_rate=0.1`

`AntColonySolver` — multi-phase ACO with ideas from notebook 4
- Phase 1: ACO with elite ant reinforcement (top 3 ants deposit extra pheromone)
- Phase 2: 2-opt improvement on best solution found
- Adaptive evaporation: increase rho if best cost hasn't improved in 20 iterations
- Default params: `ants=50, iterations=100, alpha=1.0, beta=2.0, rho=0.1`

**Job lifecycle:**
- `POST /api/jobs` → Celery task queued → returns immediately
- Worker picks task, runs solver, writes `SolverRun` to DB
- `GET /api/jobs/{id}` → job status + all runs so far
- Job timeout: 300s. Retry: 3 attempts. Dead-letter on final failure.

**Database tables (Alembic migration):**
- `jobs`: id, user_id (nullable), problem_id, mode, status, submitted_at, started_at, completed_at, failure_reason
- `solver_runs`: id, job_id, solver_name, run_index, seed, status, total_distance, runtime_ms, route_json, convergence_json, created_at

### Acceptance criteria
- [ ] All 3 solvers produce valid Hamiltonian cycles on the standard 10-city benchmark
- [ ] `validate_route()` passes for every solver result before DB write
- [ ] Seeded runs are reproducible: same seed → same route (GA, ACO)
- [ ] `convergence` array has ≥ 1 entry and is monotonically non-increasing
- [ ] `POST /api/jobs` returns in < 200ms (task queued, not run)
- [ ] `GET /api/jobs/{id}` returns correct status at each lifecycle stage
- [ ] Job timeout triggers gracefully — status = "timeout", not crash
- [ ] Unit tests pass with the 10-city fixture for all 3 solvers
- [ ] OR-Tools handles matrix_tsp (distance matrix only, no coordinates)

### Standard 10-city test fixture

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
    "startNodeId": "A",
    "returnToStart": True,
    "objective": "min_distance",
    "constraints": {}
}
```

### ✋ Stop — do not start Phase 004 until human confirms all criteria above

---

# Phase 004 — Benchmark Engine and Recommendation

### Goal
Add SA, PSO, NSGA-II, Tabu Search, and Differential Evolution solvers. Build the comparison engine and recommendation system.

### In scope

**New solvers:**

`SimulatedAnnealingSolver` — single-solution metaheuristic
- Start with nearest-neighbour greedy tour
- 2-opt neighbourhood: swap two edges, accept worse with probability `exp(-Δ/T)`
- Cooling: geometric `T = T0 × 0.995^iteration`, stop at `T_min = 0.01`
- Default params: `T0=1000, cooling=0.995, max_iter=10000`

`ParticleSwarmSolver` — continuous encoding, ideas from notebook 2
- Encode tour as continuous vector: node i's position = its visit rank
- Inertia weight decays from 0.9 to 0.4 over iterations
- After each PSO iteration: decode position to nearest valid permutation using rank-to-permutation mapping
- Apply 2-opt to personal best and global best each iteration
- Default params: `particles=50, iterations=200, w_max=0.9, w_min=0.4, c1=2.0, c2=2.0`

`NSGAIISolver` — multi-objective, ideas from notebook 3
- Two objectives: minimize total_distance + minimize max_single_edge (route balance)
- Use pymoo: `NSGA2` algorithm with `FloatRandomSampling`, `SBX` crossover, `PM` mutation
- Extract knee-point solution from Pareto front as the single recommended route
- Store full Pareto front in `solverParams.paretoFront` for frontend visualization
- Default params: `pop_size=100, n_gen=200`

`TabuSearchSolver` — memory-guided neighbourhood search
- Maintain a tabu list (circular buffer) of the last `tabu_tenure` moves to prevent cycling
- Neighbourhood: all 2-opt swaps of the current tour (~N²/2 candidates)
- Aspiration criterion: accept a tabu move if it produces a new global best
- Intensification: every 50 iterations, restart from the best solution found so far
- Diversification: if no improvement for `diversification_threshold` iterations, perturb by 4-opt double-bridge
- Default params: `max_iter=2000, tabu_tenure=15, diversification_threshold=100`
- Record best distance in `convergence[]` every 10 iterations

`DifferentialEvolutionSolver` — continuous-space population-based metaheuristic
- Encode tour as a continuous permutation vector (random-key representation)
- DE mutation: `v = x_r1 + F × (x_r2 − x_r3)` with three distinct random individuals
- Binomial crossover: each dimension accepted from mutant with probability `CR`
- Selection: greedy — offspring replaces parent only if it produces a shorter decoded tour
- Decode float vector → valid permutation via argsort at every evaluation
- Apply 2-opt improvement to the best individual in each generation
- Default params: `population=80, max_iter=500, F=0.8, CR=0.9`
- Record best distance in `convergence[]` every 10 generations

**Benchmark engine:**
- Runs all 8 solvers on the same problem with 3 different seeds each (24 total Celery tasks)
- Collects per solver: best distance, avg distance, std deviation, runtime, feasibility rate, stability score
- Computes recommendation score for each solver using the scoring formula
- Writes `ComparisonResult` to DB including `summaryCards` payload (best_distance, fastest, most_stable, recommended)

**Recommendation engine:**
```python
def compute_recommendation(runs: list[SolverRun]) -> ComparisonResult:
    # Pure function — no DB calls, no LLM
    # Groups runs by solver, computes aggregates
    # Applies scoring formula
    # Returns ranked list + recommended solver + explanation string
    ...
```

Explanation examples:
- "OR-Tools found the shortest route (118.2) but is expected to slow significantly above 50 nodes."
- "ACO produced the most consistent results across seeds (σ = 1.2) with competitive distance (121.4)."
- "GA delivered the best balance of quality and runtime for this 10-node problem."

### Acceptance criteria
- [ ] All 8 solvers produce valid routes on the 10-city benchmark
- [ ] All 8 solvers produce valid routes on the matrix_tsp fixture
- [ ] Tabu Search tabu list prevents immediate cycle-back (run 2 identical seeds, verify path differs)
- [ ] DE decoder produces a valid permutation (not a float vector) in every result
- [ ] PSO produces a valid permutation (not a float vector) in the final result
- [ ] NSGA-II stores Pareto front data in result for frontend
- [ ] Recommendation score for all 8 solvers is in [0.0, 1.0]
- [ ] Explanation string is human-readable and references actual metric values
- [ ] `ComparisonResult` includes `summaryCards` with best_distance_solver, fastest_solver, most_stable_solver, recommended_solver
- [ ] `POST /api/comparisons/{problemId}` triggers all 8 solvers and returns comparison
- [ ] Benchmark completes within 8 minutes for a 20-node problem (8 solvers × 3 seeds)

### ✋ Stop — do not start Phase 005 until human confirms all criteria above

---

# Phase 005 — User Workflows and Frontend Visualization

### Goal
Complete Next.js UI connecting all backend capabilities into a usable product.

### Modes of operation (3 modes, selector in UI)

**Quick Solve** — user picks one solver, gets result immediately
**Benchmark Mode** — system runs all 8 solvers, shows comparison dashboard
**Goal-Driven** — user picks an objective ("fastest", "best quality", "most balanced"), system picks solver automatically

### Component list

| Component | Library | Notes |
|---|---|---|
| `TextProblemForm` | shadcn/ui | Text/coordinate input with live validation |
| `TablePasteForm` | shadcn/ui | CSV paste with parse preview |
| `MatrixInputForm` | shadcn/ui | Distance matrix grid input |
| `GraphCanvas` | react-konva | See `SmartRouteAI_GraphCanvas_Design.md` |
| `ParsedPreviewCard` | shadcn/ui | Node list + warnings before confirming |
| `SolverSelector` | shadcn/ui | Checkbox grid + goal preset buttons |
| `JobProgressPanel` | shadcn/ui | Polling progress bar + per-solver status chips |
| `RouteViewer` | SVG inline | Route drawn as SVG overlay on node canvas; solver switcher tabs |
| `ConvergenceChart` | Recharts LineChart | Best distance per iteration, one labelled line per solver |
| `SolverSummaryCards` | shadcn/ui | Four metric cards at top of compare page: Best Distance · Fastest · Most Stable · Recommended. Each shows solver name + value badge |
| `ComparisonBarChart` | Recharts BarChart | Grouped bar chart — one bar group per solver, bars for avg distance and avg runtime |
| `ComparisonRadar` | Recharts RadarChart | Five axes: quality / runtime / stability / scalability / constraint_fit. One polygon per solver |
| `ComparisonTable` | shadcn/ui Table | Sortable by distance / runtime / score; score shown as coloured badge |
| `TradeOffPanel` | shadcn/ui | Below RecommendationCard. Shows second-best solver + plain-language explanation of when to prefer it over the winner (e.g. "If runtime matters more than distance, use OR-Tools") |
| `RecommendationCard` | shadcn/ui | Winning solver + score + explanation paragraph + key metric badges |
| `ParetoFrontChart` | Recharts ScatterChart | NSGA-II Pareto front — distance vs max-edge. Shown only when nsga2 ran |

### API client (typed, in packages/shared)

```typescript
const api = {
  problems: {
    preview: (data: PreviewRequest) => post<PreviewResponse>('/problems/preview', data),
    create:  (data: CreateProblemRequest) => post<ProblemResponse>('/problems', data),
    get:     (id: string) => get<ProblemResponse>(`/problems/${id}`),
  },
  jobs: {
    create:  (data: CreateJobRequest) => post<JobResponse>('/jobs', data),
    status:  (id: string) => get<JobStatusResponse>(`/jobs/${id}`),
    runs:    (jobId: string) => get<SolverResult[]>(`/runs/${jobId}`),
  },
  comparisons: {
    run: (problemId: string) => post<ComparisonResponse>(`/comparisons/${problemId}`, {}),
    get: (problemId: string) => get<ComparisonResponse>(`/comparisons/${problemId}`),
  },
}
```

### Acceptance criteria
- [ ] User completes full Quick Solve flow in browser without touching API directly
- [ ] User completes full Benchmark Mode flow: inputs problem → runs all 8 solvers → sees comparison
- [ ] `GraphCanvas` supports: place nodes, draw edges, edit labels, delete, undo
- [ ] Job polling auto-stops when job reaches terminal state
- [ ] `RouteViewer` draws correct route and solver switcher tabs work
- [ ] `SolverSummaryCards` shows correct winner for Best Distance, Fastest, Most Stable, Recommended
- [ ] `ComparisonBarChart` renders grouped bars for all 8 solvers with distance and runtime
- [ ] `ComparisonRadar` renders polygon per solver across all 5 axes
- [ ] `ComparisonTable` is sortable by distance, runtime, and score
- [ ] `TradeOffPanel` shows second-best solver with a plain-language "when to prefer" explanation
- [ ] `RecommendationCard` shows winner + explanation string
- [ ] `ParetoFrontChart` renders when NSGA-II result is available
- [ ] `ConvergenceChart` shows separate labelled line per solver
- [ ] Failed jobs show readable error message with retry button
- [ ] No TypeScript errors in production build (`pnpm build` passes)

### ✋ Stop — do not start Phase 006 until human confirms all criteria above

---

# Phase 006 — SaaS Hardening and Product Readiness

### Goal
Add authentication, user ownership, test coverage, and production deployment.

### In scope
- JWT auth: register, login, refresh token
- User ownership enforced on all resources (problems, jobs, runs, comparisons)
- Saved history pages: `/me/problems`, `/me/runs`
- Object storage abstraction for uploaded images (S3-compatible, FileSystem for dev)
- Quota enforcement: max problems per user, max runs per job (configurable via env)
- Rate limiting on auth endpoints: 10 req/min per IP (`slowapi`)
- Structured logging: `jobId`, `userId`, `solver`, `status` in every log line
- Production Dockerfiles (multi-stage, non-root user)
- Test coverage gate: `pytest ≥ 80%`
- Playwright E2E: 3 critical journeys (Quick Solve, Benchmark, Goal-Driven)

### Acceptance criteria
- [ ] Unauthorized requests return 401
- [ ] Users access only their own resources — enforced at DB query level
- [ ] Image uploads persist to object storage and are retrievable by URL
- [ ] Structured logs contain required fields
- [ ] `pytest` passes with ≥ 80% coverage
- [ ] Playwright tests pass for all 3 journeys
- [ ] `docker compose up --build` runs production containers

### ✋ Final project gate — human must confirm before declaring project complete

---

# Phase 006B — OCR Image Extraction (optional, runs in parallel with 006)

See `SmartRouteAI_OCR_ImageExtraction_Design.md` for full spec.

Summary: 4-tier OCR pipeline (Tesseract → EasyOCR → OpenCV blob detection → VLM fallback),
image validation UI with confidence badges, confirm/edit before running solvers.

---

# Phase 007 — Version 3 Roadmap (post-launch enhancements)

### Goal
Extend the platform beyond single-vehicle TSP into real-world logistics and richer output.

### 7A — Map integration (Leaflet.js real-world routing)

**In scope:**
- Add `Leaflet.js` to the frontend as an optional map tile layer for the `RouteViewer`
- When nodes have real GPS coordinates (lat/lng), show them on an OpenStreetMap tile layer
- Toggle between abstract SVG canvas view and real map view
- Route drawn as a polyline over the map tiles
- Node markers show label + distance to next stop on hover

**Acceptance criteria:**
- [ ] `RouteViewer` has "Map view" toggle that activates when nodes have lat/lng fields
- [ ] Route renders as a coloured polyline on OpenStreetMap tiles
- [ ] Toggle between SVG canvas view and map view without data loss

### 7B — VRP-lite (Vehicle Routing Problem with capacity)

**In scope:**
- Extend the problem schema with optional `vehicles` array and `nodeCapacity` demand field
- Add `problemType: "vrp"` to the canonical schema
- Implement `VRPSolver` wrapping OR-Tools VRP model (Clarke-Wright savings heuristic as fallback)
- Route result returns an array of routes (one per vehicle) instead of a single route
- `RouteViewer` renders multiple routes in different colours (one per vehicle)

**Acceptance criteria:**
- [ ] `parse_text()` and `parse_table()` accept vehicle count and node demand fields
- [ ] `VRPSolver` extends `BaseSolver` and returns multi-route result
- [ ] `RouteViewer` displays multiple vehicle routes in distinct colours
- [ ] Benchmark mode supports VRP problems alongside TSP problems

### 7C — Export reports

**In scope:**
- `POST /api/comparisons/{problemId}/export?format=pdf|csv|json`
- PDF report: problem summary, solver ranking table, route map image, recommendation paragraph, convergence chart
- CSV export: one row per solver run with all metrics
- JSON export: full `ComparisonResult` schema
- Frontend: "Export" dropdown button on the compare page

**Acceptance criteria:**
- [ ] PDF export generates a readable multi-page report with route diagram
- [ ] CSV export includes all 8 solver metrics
- [ ] JSON export matches the canonical `ComparisonResult` schema exactly
- [ ] Frontend export button triggers download without page refresh

### ✋ Phase 007 is post-launch. Do not implement until Phase 006 is fully confirmed complete.

---

# Database schema

```sql
users
  id UUID PK, email TEXT UNIQUE, password_hash TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

problems
  id UUID PK, user_id UUID FK NULLABLE, name TEXT,
  problem_type TEXT, raw_input_type TEXT,
  raw_input_json JSONB, normalized_json JSONB,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

jobs
  id UUID PK, user_id UUID FK NULLABLE, problem_id UUID FK,
  mode TEXT, status TEXT, failure_reason TEXT,
  submitted_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ

solver_runs
  id UUID PK, job_id UUID FK, solver_name TEXT, run_index INT, seed INT,
  params_json JSONB, status TEXT, total_distance FLOAT, total_cost FLOAT,
  runtime_ms INT, route_json JSONB, convergence_json JSONB,
  metrics_json JSONB, created_at TIMESTAMPTZ

comparisons
  id UUID PK, problem_id UUID FK, job_id UUID FK,
  recommended_solver TEXT, ranking_json JSONB,
  explanation_text TEXT, created_at TIMESTAMPTZ

uploads
  id UUID PK, user_id UUID FK, storage_key TEXT,
  mime_type TEXT, metadata_json JSONB, created_at TIMESTAMPTZ
```

---

# Non-functional requirements

| Requirement | Target |
|---|---|
| Preview response (text/table input) | < 500ms |
| Job submission API | < 200ms |
| Max problem size (benchmark mode) | 50 nodes |
| Max problem size (quick solve) | 500 nodes |
| Solver timeout | 300 seconds |
| Job retry on failure | 3 attempts |
| API test coverage | ≥ 80% |
| Concurrent solver jobs | Celery workers scale horizontally |

---

# Test strategy

| Layer | What to test |
|---|---|
| Unit | Parser behavior · Normalization rules · Route validity · Scoring formula · Each solver with 10-city fixture |
| Integration | Parse → normalize → save → run job → fetch result |
| E2E (Playwright) | Quick Solve · Benchmark Mode · Goal-Driven |

---

# Creative exploration tracks (between Phase 003 and 004)

## Exploration A — Algorithm benchmark matrix
Run all 8 solvers across node counts: 5, 10, 20, 50.
Record: solution quality, runtime, stability.
Output: weight tuning for the recommendation scoring formula.

## Exploration B — Input UX A/B test
Compare: text-first, canvas-first, table-first onboarding.
Output: which input format users reach success fastest with.

---

# Final instruction to Codex

Build SmartRoute AI as a **generic TSP and routing optimization platform**.
The canonical schema is domain-agnostic: nodes, distances, objectives.
Use the notebook algorithm ideas as **inspiration** — not as a domain model to copy.
Implement one phase at a time. Preserve the BaseSolver contract across all phases.
Prefer maintainability, testability, and reproducibility over complexity.

**Solver lineup:** OR-Tools · GA · ACO · SA · PSO · NSGA-II · Tabu Search · DE (8 total)
**Version 3 roadmap:** Leaflet map integration · VRP-lite · PDF/CSV/JSON export reports (Phase 007)

*SmartRoute AI v2.1 — Generic 8-Solver Routing Optimization Platform*
*Spec-Driven Development with GitHub Spec Kit + OpenAI Codex*
