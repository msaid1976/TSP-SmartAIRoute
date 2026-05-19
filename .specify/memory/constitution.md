<!--
## Sync Impact Report

**Version change**: 1.0.0 → 2.0.0
**Bump type**: MAJOR — complete replacement of prior generic "AI Engineer Resume" constitution
  with SmartRoute AI routing-optimization platform governance. All prior principles removed;
  seven new SmartRoute-specific principles added.

### Modified Principles (old → new)
- I.   Static-First Delivery          → I.   Generic Problem Model (Frozen Schema)
- II.  Resume Content Clarity         → II.  Solver Contract Integrity
- III. Accessibility Baseline         → III. Asynchronous Execution
- IV.  Performance Baseline           → IV.  Type Safety and Model Discipline
- V.   Simplicity and Maintainability → V.   Security and Secret Hygiene
- (new)                               → VI.  Phase-Gated Delivery
- (new)                               → VII. Test Coverage Mandate

### Added Sections
- Technical Constraints (frozen stack: Next.js 14, FastAPI, Pydantic v2, Celery, PostgreSQL 15)
- Delivery Workflow (phase-gate model with dual-agent roles)
- Solver Registry note (8 canonical solvers)

### Removed Sections
- Static-First Delivery (not applicable to a SaaS routing platform)
- Resume Content Clarity (not applicable)

### Templates requiring updates
- ✅ .specify/templates/plan-template.md   — Constitution Check gate text is generic; no update needed
- ✅ .specify/templates/spec-template.md   — generic structure; no update needed
- ✅ .specify/templates/tasks-template.md  — generic structure; no update needed
- ⚠  README.md                             — references project identity; review after next Codex phase

### Deferred TODOs
- TODO(RATIFICATION_DATE): Set to 2026-04-01 (date in prior constitution). If the SmartRoute AI
  project formally started on a different date, update the Ratified field manually.
-->

# SmartRoute AI — Project Constitution

## Core Principles

### I. Generic Problem Model (Frozen Schema)

The canonical problem schema MUST NOT contain domain-specific fields. All routing problems
normalize to exactly: `problemType`, `nodes` (each with `id`, `label`, `x`, `y`),
`distanceMatrix` (null when coordinates are available), `startNodeId`, `returnToStart`,
`objective`, and `constraints`.

Fields such as `machine_id`, `technician_id`, `delivery_date`, `installation_date`, or
`truck_capacity` MUST NOT appear anywhere in the codebase. The five permitted `problemType`
values are: `tsp`, `atsp`, `weighted_tsp`, `matrix_tsp`, `open_tsp`.

Any change to the canonical schema requires explicit human approval and is treated as a MAJOR
version bump to this constitution.

**Rationale**: SmartRoute AI is a *generic* routing optimization platform for anyone with a
problem expressible as nodes + distances. Domain-specific fields destroy generality and couple
the platform to a single use case (the VeRoLog logistics domain from the research notebooks).

### II. Solver Contract Integrity

Every solver MUST extend `BaseSolver` in `apps/api/solvers/base.py`. Standalone solver scripts
are forbidden. Every solver MUST:

- Accept a `seed` parameter and seed both `random` and `numpy.random` when provided.
- Call `validate_route()` before writing any result to the database.
- Implement `get_distance_matrix(problem)`: use `distanceMatrix` directly when present,
  otherwise build from x/y coordinates via `build_distance_matrix()`. This single method
  handles both `tsp` and `matrix_tsp` with no extra branching in each solver.
- Record a non-empty `convergence[]` array in the result.

`BaseSolver` and `SOLVER_REGISTRY` are frozen. Adding a solver requires extending the base
class and registering in `__init__.py`. Removing a solver requires explicit human approval.

**Current registry (8 solvers)**: `ortools` · `ga` · `aco` · `sa` · `pso` · `nsga2` ·
`tabu` · `de`

### III. Asynchronous Execution

Solvers MUST run exclusively inside Celery workers. Blocking the FastAPI request thread is a
critical violation. API endpoints MUST return a `jobId` within 200 ms and expose a polling
endpoint for status and results.

Celery tasks MUST use `max_retries=3`, `time_limit=300`, `soft_time_limit=280`. After
`max_retries`, the job MUST be marked permanently failed and the failure surfaced to the client.

**Rationale**: Solver runs range from seconds to minutes. Blocking the API thread under
concurrent load degrades all users of the platform.

### IV. Type Safety and Model Discipline

All Python code MUST use Pydantic v2 models in function signatures — no plain `dict` parameters
at service or API boundaries. All TypeScript code MUST compile in strict mode with zero `any`
types and zero implicit types. Both conditions MUST pass in CI before a phase gate is approved.

**Rationale**: The spec is enforced by type checks, not convention. Type errors at compile time
cost nothing; type errors in production cost users.

### V. Security and Secret Hygiene

All secrets, credentials, and environment-specific values MUST reside in `.env` files and be
read through Pydantic Settings. Hardcoded credentials anywhere in the codebase are a critical
violation that MUST block phase gate approval.

JWT tokens MUST be stored in `httpOnly` cookies — never in `localStorage`. Passwords MUST be
bcrypt-hashed. Protected resources MUST return `404` (not `403`) when a user attempts to access
another user's resource, to avoid leaking existence.

### VI. Phase-Gated Delivery

Implementation proceeds ONE phase at a time. Phase N+1 MUST NOT begin without explicit human
approval of Phase N. At each gate, the review agent MUST list all acceptance criteria against
the spec and flag any violation before the human confirms.

Each confirmed phase MUST be committed immediately:
`git add . && git commit -m "Phase 00N complete — [summary]"`.

**Rationale**: Phases build on each other. A defect in Phase 002 schemas propagates into all
eight solver implementations if not caught at the gate.

### VII. Test Coverage Mandate

Every new module MUST include tests. Solvers MUST have seeded unit tests covering both canonical
fixtures:

- `TEST_PROBLEM_COORDS` — coordinate-based TSP, 10 nodes
- `TEST_PROBLEM_MATRIX` — distance-matrix TSP (`matrix_tsp`), 4 nodes, no x/y

API modules MUST have integration tests using a real test database (not mocks). The Phase 006
target is ≥ 80% line coverage across all API modules.

**Rationale**: Reproducibility (via seeds) and dual-fixture coverage (coordinate + matrix) are
the minimum bar for trusting solver output across all eight solvers.

## Technical Constraints

The following stack is **frozen**. Changes require explicit human approval and MUST be
recorded as a MINOR or MAJOR constitution amendment.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Recharts, react-konva |
| Backend | FastAPI, Pydantic v2, SQLAlchemy, Alembic, PostgreSQL 15 |
| Workers | Celery 5, Redis 7 (broker + result backend) |
| Infrastructure | Docker Compose (dev), multi-stage Docker builds (prod), pnpm workspaces |
| Design tokens | Background `#0A0F1E`, accent `#3B82F6`, UI font DM Sans, data font JetBrains Mono |

## Delivery Workflow

1. Tell the implementation agent (Codex) which phase to implement.
2. Codex writes code; human reviews the diff and accepts changes.
3. Human runs the implementation and tests manually.
4. Human pastes results to the review agent (Claude) for the phase-gate check.
5. Review agent approves or flags issues against the spec acceptance criteria.
6. Issues return to Codex for fixes; cycle repeats until all clear.
7. All clear → Git commit → move to next phase.

The review agent MUST NOT write code. It MUST describe issues as: file path, line description,
what is wrong, what it should be. The implementation agent does all code edits.

## Governance

This constitution is the binding standard for all feature, plan, task, and review decisions
in this repository.

**Amendment procedure**: Any change to this file MUST bump the version using semantic
versioning rules:
- MAJOR: principle removal, redefinition, or frozen-schema change.
- MINOR: new principle or new section added.
- PATCH: clarification, wording fix, or typo correction.

`LAST_AMENDED_DATE` MUST be updated on every change. Amendments that affect Constitution Check
gates or task categorization MUST also update the relevant templates.

**Compliance review**: At every phase gate, the review agent MUST verify Principles I–VII.
The following are **critical violations** that MUST block gate approval:
- Domain-specific fields (VeRoLog) anywhere in the codebase.
- Solver not extending `BaseSolver` or not calling `validate_route()`.
- Solver computation blocking the FastAPI thread.
- Hardcoded secrets or credentials.
- TypeScript `any` types or Python bare dicts in signatures.

**Schema freeze**: The canonical problem and result schemas from Phase 002 are frozen from that
phase onward. Any proposed change requires human approval and triggers a MAJOR amendment.

**Version**: 2.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-05-19
