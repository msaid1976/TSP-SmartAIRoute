---
name: smartroute-ai
version: "2.1"
description: >
  Spec-Driven Development assistant for SmartRoute AI — a generic multi-solver routing
  optimization SaaS. Use this skill whenever the user asks about SmartRoute AI implementation,
  phase planning, solver development, API design, normalization, the recommendation engine,
  or any part of the SmartRoute AI Spec Kit workflow. Also triggers for: adding new solvers,
  writing TSP algorithms, building the FastAPI backend, wiring Celery queues, designing
  the Next.js dashboard, or advancing between spec phases. Use even if the user says
  "SmartRoute", "TSP solver platform", "optimization SaaS", "Spec Kit phases",
  or "BaseSolver interface" in the context of this project.
---

# SmartRoute AI — Spec-Driven Development Skill v2.1

## Project identity

SmartRoute AI is a **generic TSP and routing optimization SaaS**. Users define a routing
problem in any format (text, table, canvas, matrix, image), run it through multiple
Computational Intelligence algorithms, compare results visually, and receive a plain-language
recommendation of which solver worked best and why.

**The platform is domain-agnostic.** Problems are expressed as: nodes + distances + objectives.
No machines, no technicians, no trucks — those are domain concepts that users map to the generic
model themselves.

**Stack:** Next.js 14 (App Router, TypeScript strict) · FastAPI · Pydantic v2 · PostgreSQL 15 ·
Redis 7 · Celery 5 · Tailwind CSS · shadcn/ui · Recharts · react-konva

**Methodology:** GitHub Spec Kit — Spec-Driven Development (SDD)

---

## Core data contracts (never change without human approval)

### Canonical problem schema
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

**Key rule:** When `distanceMatrix` is not null, solvers use it directly and ignore x/y.
This is how asymmetric TSP is supported without changing the schema.

### Solver result schema
```json
{
  "runId": "uuid",
  "solver": "ga | aco | ortools | sa | pso | nsga2 | tabu | de",
  "status": "completed | failed | timeout",
  "route": ["A", "C", "B", "D", "A"],
  "totalDistance": 125.4,
  "runtimeMs": 842,
  "convergence": [200.4, 180.2, 125.4],
  "seed": 42,
  "solverParams": {}
}
```

---

## Phase map

| Phase | Focus | Key Gate |
|---|---|---|
| 001 | Foundation + monorepo | `GET /health` 200, docker compose up, worker ping |
| 002 | Ingestion + normalization | All 4 input formats → valid canonical schema |
| 003 | Async solvers: OR-Tools, GA, ACO | Valid Hamiltonian cycles, job lifecycle, seeded |
| 004 | Benchmark + recommendation | All 8 solvers, scores in [0,1], explanation string, summary cards |
| 005 | Next.js UI + visualizations | Full end-to-end flow, bar chart, radar, summary cards, trade-off panel |
| 006 | Auth + SaaS hardening | 80% pytest coverage, Docker production build |
| 006B | OCR image extraction | 4-tier pipeline, validation UI, VLM fallback |
| 007 | Version 3 enhancements | Leaflet map, VRP-lite, PDF/CSV/JSON export (post-launch) |

**Rule:** Never advance a phase without human confirming all acceptance criteria.

---

## Solver registry

```python
SOLVER_REGISTRY = {
    "ortools": ORToolsSolver,                # Phase 003 — exact
    "ga":      GeneticAlgorithmSolver,       # Phase 003 — population-based
    "aco":     AntColonySolver,              # Phase 003 — multi-phase
    "sa":      SimulatedAnnealingSolver,     # Phase 004 — single-solution cooling
    "pso":     ParticleSwarmSolver,          # Phase 004 — swarm, float encoding
    "nsga2":   NSGAIISolver,                 # Phase 004 — multi-objective Pareto
    "tabu":    TabuSearchSolver,             # Phase 004 — memory-guided neighbourhood
    "de":      DifferentialEvolutionSolver,  # Phase 004 — continuous mutation
}
```

---

## BaseSolver contract

```python
class BaseSolver(ABC):
    name: str
    supports_asymmetric: bool = False
    supports_multi_objective: bool = False

    def __init__(self, params: dict, seed: Optional[int] = None): ...

    @abstractmethod
    def solve(self, problem: dict) -> dict: ...

    def validate_route(self, route: list, nodes: list) -> bool: ...
    def build_distance_matrix(self, nodes: list) -> np.ndarray: ...
    def get_distance_matrix(self, problem: dict) -> np.ndarray:
        # If distanceMatrix is in problem, use it directly
        # Otherwise, build from x,y coordinates
        ...
```

All solvers must: accept `seed`, record `convergence[]`, call `validate_route()` before returning.

---

## Algorithm ideas from notebooks (use as inspiration, not as domain model)

The 4 VeRoLog notebooks provided by Mohamed contain excellent algorithm ideas. Extract these
concepts into the generic BaseSolver framework:

**From GA_Heterogeneous_Design.ipynb:**
- Adaptive crossover switching by generation (OX early → PMX late)
- 2-opt local search on best individual each generation
- Tournament selection, elitism (top 10% unchanged)
- Memory-managed population sizing

**From GA-Heterogeneous_with_PSO.ipynb:**
- PSO continuous encoding: float vector → rank decoding → valid permutation
- Inertia weight decay (0.9 → 0.4)
- Quantum-inspired perturbation for exploration escape
- Hybrid GA+PSO: alternate between both engines

**From GA_Heterogeneous_Design_with_NSGA_Pareto_Front.ipynb:**
- pymoo NSGA-II with two objectives (total distance + max single edge)
- Knee-point extraction from Pareto front as single recommended solution
- Quiet callback pattern to suppress verbose output in web context

**From Multi_Phase_Ant_Colony_Optimization__ACO_.ipynb:**
- Multi-phase: ACO → SA refinement → VNS (2-opt, 3-opt)
- Elite ant reinforcement (top 3 ants deposit extra pheromone)
- Stagnation detection → adaptive evaporation rate increase

**What NOT to bring from the notebooks:**
- The `Gene` dataclass (delivery_date, installation_date, technician_id) — VeRoLog specific
- `VeRoLogProblem`, `VeRoLogSolution` — VeRoLog specific
- `ChromosomeDecoder` with date/technician decoding — VeRoLog specific
- `BestFitDecreasingPacking` — truck bin-packing, VeRoLog specific
- `ProblemData` with DAYS, TRUCK_CAPACITY, MACHINES sections — VeRoLog format

---

## Recommendation scoring formula

```
score = 0.40 × quality_score      # best distance = 1.0, worst = 0.0
      + 0.20 × runtime_score      # fastest = 1.0, slowest = 0.0
      + 0.15 × stability_score    # 1 - (stdDev / mean), across 3 seeds
      + 0.15 × scalability_score  # heuristic by class:
                                  #   ortools=0.3, ga=0.7, aco=0.8
                                  #   sa=0.6, pso=0.6, nsga2=0.5
                                  #   tabu=0.7, de=0.65
      + 0.10 × constraint_fit     # 1.0 if no constraints hit
```

Rule-based only. No LLM inside the recommendation engine.

---

## How to use this skill

### When starting a new phase
1. State the current phase number
2. Reference the constitution and this skill's phase map
3. Implement only what is in scope for this phase
4. Stop at the gate and confirm all acceptance criteria

### When adding a new solver
1. Extend `BaseSolver` in `apps/api/solvers/<name>.py`
2. Add to `SOLVER_REGISTRY`
3. Implement `get_distance_matrix()` — not `build_distance_matrix()` — so ATSP works
4. Write unit test with the 10-city benchmark fixture AND a matrix_tsp fixture
5. Confirm `validate_route()` passes before any DB write
6. Document default params as class-level constants

### When debugging a solver
- Check route is valid: all nodes visited exactly once + correct return
- Check `convergence` is monotonically non-increasing with ≥ 1 entry
- Check same seed produces same route (run twice with `seed=42`)
- For PSO or DE: verify the float vector was decoded to a valid permutation via argsort
- For Tabu: verify tabu list is blocking the previously-made move (check list contents after 2 iterations)

### When reviewing an input parser
- Parser must be pure: no DB, no side effects, no global state
- Text with coordinates: test both `A(0,0)` and `A: 0,0` and `A 0 0` variants
- Matrix input: must set `problemType = "matrix_tsp"` and `distanceMatrix`
- Check: what happens when there are duplicate node IDs?
- Check: what happens when only 1 node is provided?

### When the user asks "what is the best algorithm for X"
- For small problems (< 20 nodes): OR-Tools (exact solution guaranteed)
- For medium problems (20–100 nodes): GA, ACO, or Tabu Search
- For large problems (100–500 nodes): ACO, SA, or Tabu Search
- For fast convergence with little tuning: SA
- For continuous-space exploration: PSO or DE
- For multi-objective (distance + balance): NSGA-II
- Always say: "run Benchmark Mode and let the comparison engine decide"

### When reviewing Phase 005 frontend — four components added in v2.1
All four must be present on the compare page:

| Component | What it shows |
|---|---|
| `SolverSummaryCards` | Four metric cards at top: Best Distance · Fastest · Most Stable · Recommended |
| `ComparisonBarChart` | Recharts BarChart — grouped bars per solver for avg distance + avg runtime |
| `ComparisonRadar` | Recharts RadarChart — five axes: quality / runtime / stability / scalability / constraint_fit |
| `TradeOffPanel` | Below RecommendationCard — second-best solver + plain-language "when to prefer it" text |

### When reviewing Phase 004 backend — two solvers added in v2.1
Both must be in `SOLVER_REGISTRY` and pass both standard fixtures:

- `TabuSearchSolver` — tabu list (circular buffer, tenure=15), 2-opt neighbourhood, aspiration criterion, double-bridge diversification every 100 stagnant iterations
- `DifferentialEvolutionSolver` — random-key encoding, DE/rand/1/bin mutation (F=0.8, CR=0.9), greedy selection, 2-opt on best each generation

### Phase 007 roadmap (post-launch — do not implement before Phase 006 confirmed)
- **7A Leaflet map integration:** upgrade the Phase 002 SVG country/city picker into a real OpenStreetMap tile layer + route polyline
- **7B VRP-lite:** multi-vehicle routing, multi-route result, coloured routes per vehicle in RouteViewer
- **7C Export reports:** PDF (route diagram + ranking table + recommendation), CSV (all 8 solver metrics), JSON (full ComparisonResult)

---

## Standard test fixture

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

# Also add this for ATSP / matrix testing:
TEST_MATRIX_PROBLEM = {
    "problemType": "matrix_tsp",
    "nodes": [
        {"id": "W1", "label": "Warehouse 1"},
        {"id": "W2", "label": "Warehouse 2"},
        {"id": "W3", "label": "Warehouse 3"},
        {"id": "W4", "label": "Warehouse 4"},
    ],
    "distanceMatrix": [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
    ],
    "startNodeId": "W1", "returnToStart": True,
    "objective": "min_distance", "constraints": {}
}
```

---

## Constitution quick reference

- Stack: Next.js 14 · FastAPI · PostgreSQL 15 · Redis 7 · Celery 5
- Pydantic v2 Python, TypeScript strict frontend
- Generic model only: nodes + distances, no domain entities
- No solver logic outside `/solvers/`
- Canonical schemas frozen after Phase 002
- Recommendation engine: rule-based, no LLM
- Phase gates are hard stops
- All stochastic solvers accept `seed`

---

## Reference files

- **Codex full spec:** `.agents/skills/specification.md`
- **Claude review spec:** `specs/references/SmartRouteAI_SpecKit_CLAUDE_v2.md`
- **Canvas design:** `specs/references/SmartRouteAI_GraphCanvas_Design.md`
- **OCR design:** `specs/references/SmartRouteAI_OCR_ImageExtraction_Design.md`
