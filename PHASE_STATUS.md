# SmartRoute AI Phase Status

Audit date: 2026-04-29

Source of truth: `SmartRouteAI_MasterGuide_v3_FINAL.md`

## Current Finding

Last confirmed completed phase after this verification pass: **Phase 005 - Complete Frontend**.

Evidence:
- Latest commit: `38b7b03 Phase 004 complete - all 8 solvers, Tabu+DE added, benchmarking, summary cards, Pareto front`
- `apps/api/app/solvers/__init__.py` registers all 8 Phase 004 solvers: `ortools`, `ga`, `aco`, `sa`, `pso`, `nsga2`, `tabu`, `de`
- `apps/api/app/services/benchmarker.py` runs all 8 solvers across benchmark seeds and stores comparison output
- `apps/api/app/services/recommender.py` implements the rule-based scoring formula and summary cards
- `apps/api/tests/test_solvers.py` and `apps/api/tests/test_comparisons.py` cover Phase 004 solver and comparison behavior

Phase 005 verification passed on 2026-04-29:
- `pnpm.cmd --dir apps/web typecheck`
- `pnpm.cmd --dir apps/web build`
- `wsl -d Ubuntu-24.04 -- bash -lc "cd /mnt/d/Artificial_Intelligence/TravellingSalesMan/SmartRouteAI && .venv/bin/python -m pytest apps/api/tests -q"`: 39 passed
- `wsl -d Ubuntu-24.04 -- bash -lc "cd /mnt/d/Artificial_Intelligence/TravellingSalesMan/SmartRouteAI && .venv/bin/python -m pytest apps/worker/tests -q"`: 1 passed

## Phase Matrix

| Phase | Master Guide Scope | Code Status | Completion Status | Evidence | Outstanding |
|---|---|---:|---:|---|---|
| Setup | Tooling, Spec Kit files, root instructions, initial git checkpoint | Present | Completed | `.agents/skills/specification.md`, `AGENTS.md`, `CLAUDE.md`, git history starts from Specify template | None from code audit |
| Phase 001 | Monorepo, FastAPI health, worker ping, Docker Compose, shared package | Present | Completed | Commit `2ce592c`; `apps/api`, `apps/web`, `apps/worker`, `packages/shared`, `docker-compose.yml`, health tests | Manual Docker/health verification should be repeated before deployment |
| Phase 002 | Parsers, normalization, problems table, preview/create APIs, GraphCanvas, matrix path | Present | Completed | Commit `6e9f9a2`; `parser.py`, `normalizer.py`, `problems.py`, problems migration, `GraphCanvas.tsx` | Phase 002 schema is frozen; avoid changing canonical schema without approval |
| Phase 003 | Async solver core, OR-Tools/GA/ACO, Celery jobs, run polling | Present | Completed | Commit `7d76b1a`; `jobs.py`, `runs.py`, `workers/tasks.py`, `ortools_solver.py`, `ga.py`, `aco.py` | No open Phase 003 code gaps found in audit |
| Phase 004 | SA, PSO, NSGA-II, Tabu, DE, benchmark engine, recommendation engine, comparisons API | Present | Completed | Commit `38b7b03`; all 8 solvers registered; comparison and recommender services/tests present | `POST /api/comparisons/{problemId}` currently blocks until benchmark completion; acceptable as Phase 004 MVP note in code, but revisit for hardening |
| Phase 005 | Complete frontend workflows and visualization dashboard | Present | Completed | `apps/web/app/new-problem/page.tsx`, `apps/web/app/problems/[id]/page.tsx`, `apps/web/app/compare/[problemId]/page.tsx`, `jobs/[jobId]`, typed API client, route viewer, convergence chart, summary cards, bar chart, radar chart, ranking table, trade-off panel, recommendation card; frontend typecheck/build passed | Manual browser smoke test is still recommended before demos, but automated gate passed |
| Phase 006 | Auth, ownership, quotas, object storage, rate limiting, structured logs, production Docker, coverage gate | Not present | Not Started | No `auth.py`, user model, middleware, ownership enforcement, `test_auth.py`, or `CONTRIBUTING.md` found | Implement only after Phase 005 is confirmed and committed |
| Phase 006B | OCR image extraction and validation UI | Placeholder only | Not Started | Image tab says OCR is planned for Phase 006B; no OCR service or validation panel found | Read `specs/references/SmartRouteAI_OCR_ImageExtraction_Design.md` before implementation |
| Phase 007A | Leaflet map route view | Not present | Not Started | No Leaflet dependency or map-view toggle found | Post-launch only, after Phase 006 is complete |
| Phase 007B | VRP-lite | Not present | Not Started | Canonical `ProblemType` does not include `vrp`; no `vrp.py` solver | Requires explicit schema change approval because Phase 002 schema is frozen |
| Phase 007C | PDF/CSV/JSON exports | Not present | Not Started | No comparison export endpoint or export UI found | Post-launch only, after Phase 006 is complete |

## Verification Notes From This Audit

Tooling notes:
- `node_modules` was reinstalled with `pnpm.cmd install --no-frozen-lockfile` to add the Phase 005 `recharts` dependency and refresh Windows command shims.
- `apps/web/.next` was deleted once as generated build cache to clear stale Next.js route type artifacts.
- `next/font/google` was removed from `layout.tsx` so production builds do not require network access to Google Fonts. The required DM Sans and JetBrains Mono font stacks remain configured through CSS variables with local fallbacks.

## Next Gate

Phase 005 is ready to commit.

Next work should be treated as **Phase 006 - Auth and SaaS Hardening**, but only after this Phase 005 commit is pushed and accepted.
