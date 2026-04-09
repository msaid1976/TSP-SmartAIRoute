from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean, pstdev
from uuid import uuid4

from fastapi import HTTPException, status
from pydantic import BaseModel
from smartroute_shared.schemas import ComparisonResult, SolverAggregate, SolverResult
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models.comparison import ComparisonRecord
from app.models.job import JobRecord
from app.models.problem import ProblemRecord
from app.models.solver_run import SolverRunRecord
from app.services.recommender import apply_recommendation
from app.workers.celery_client import celery_app

DEFAULT_COMPARISON_SOLVERS = ("ortools", "ga", "aco", "sa", "pso", "nsga2", "tabu", "de")
DEFAULT_COMPARISON_SEEDS = (11, 29, 47)
POLL_INTERVAL_SECONDS = 0.5
BENCHMARK_TIMEOUT_SECONDS = 480


class BenchmarkedRuns(BaseModel):
    comparisonId: str
    jobId: str
    problemId: str
    runs: list[SolverResult]
    createdAt: str


def run_comparison_benchmark(session: Session, problem_id: str) -> ComparisonResult:
    problem = session.get(ProblemRecord, problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    job = _create_comparison_job(session, problem_id)
    _wait_for_job_completion(job.id, _session_factory_from_session(session))

    comparison_result = _build_comparison_result(session, job_id=job.id, problem_id=problem_id)
    _persist_comparison(session, comparison_result)
    return comparison_result


def get_latest_comparison(session: Session, problem_id: str) -> ComparisonResult:
    record = session.scalar(
        select(ComparisonRecord)
        .where(ComparisonRecord.problem_id == problem_id)
        .order_by(ComparisonRecord.created_at.desc())
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comparison not found.")

    return ComparisonResult(
        comparisonId=record.id,
        problemId=record.problem_id,
        jobId=record.job_id,
        recommendedSolver=record.recommended_solver,
        recommendationReason=record.explanation_text,
        tradeOffText=record.trade_off_text,
        ranking=record.ranking_json,
        aggregates=record.aggregates_json,
        summaryCards=record.summary_cards_json,
        runs=record.runs_json,
        createdAt=_isoformat(record.created_at),
    )


def _create_comparison_job(session: Session, problem_id: str) -> JobRecord:
    job = JobRecord(
        id=str(uuid4()),
        user_id=None,
        problem_id=problem_id,
        mode="compare",
        goal_objective=None,
        status="queued",
    )
    session.add(job)

    solver_runs: list[SolverRunRecord] = []
    run_index = 0
    for seed in DEFAULT_COMPARISON_SEEDS:
        for solver_name in DEFAULT_COMPARISON_SOLVERS:
            solver_run = SolverRunRecord(
                id=str(uuid4()),
                job_id=job.id,
                solver_name=solver_name,
                run_index=run_index,
                seed=seed,
                status="queued",
                convergence_json=[],
                solver_params_json={},
                notes_json=[],
            )
            run_index += 1
            solver_runs.append(solver_run)
            session.add(solver_run)

    session.commit()

    for solver_run in solver_runs:
        celery_app.send_task(
            "solver.run",
            kwargs={"job_id": job.id, "solver_run_id": solver_run.id},
        )

    return job


def _wait_for_job_completion(
    job_id: str,
    session_factory: sessionmaker[Session],
) -> None:
    # Phase 004 MVP trade-off: the comparison endpoint blocks until all Celery runs
    # finish so the POST route can return a complete ComparisonResult payload.
    # Replace this with a non-blocking pollable workflow before later hardening.
    deadline = time.monotonic() + BENCHMARK_TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        with session_factory() as wait_session:
            job = wait_session.get(JobRecord, job_id)
            if job is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark job not found.")
            if job.status == "completed":
                return
            if job.status == "timeout":
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=job.failure_reason or "Benchmark timed out.",
                )
            if job.status == "failed":
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=job.failure_reason or "Benchmark failed.",
                )
        time.sleep(POLL_INTERVAL_SECONDS)

    raise HTTPException(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        detail="Benchmark did not complete within 8 minutes.",
    )


def _build_comparison_result(session: Session, job_id: str, problem_id: str) -> ComparisonResult:
    benchmarked = _load_benchmarked_runs(session, job_id=job_id, problem_id=problem_id)
    aggregate_map = _compute_aggregates(benchmarked.runs)
    outcome = apply_recommendation(list(aggregate_map.values()))
    return ComparisonResult(
        comparisonId=benchmarked.comparisonId,
        problemId=benchmarked.problemId,
        jobId=benchmarked.jobId,
        recommendedSolver=outcome.recommendedSolver,
        recommendationReason=outcome.recommendationReason,
        tradeOffText=outcome.tradeOffText,
        ranking=outcome.ranking,
        aggregates=outcome.aggregates,
        summaryCards=outcome.summaryCards,
        runs=benchmarked.runs,
        createdAt=benchmarked.createdAt,
    )


def _load_benchmarked_runs(session: Session, job_id: str, problem_id: str) -> BenchmarkedRuns:
    records = session.scalars(
        select(SolverRunRecord)
        .where(SolverRunRecord.job_id == job_id)
        .order_by(SolverRunRecord.run_index.asc())
    ).all()
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No solver runs found for benchmark job.")

    runs = [_solver_result_from_record(record) for record in records if record.status == "completed"]
    if len(runs) != len(DEFAULT_COMPARISON_SOLVERS) * len(DEFAULT_COMPARISON_SEEDS):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Benchmark did not produce a full comparison run set.",
        )

    created_at = min(record.created_at for record in records)
    return BenchmarkedRuns(
        comparisonId=str(uuid4()),
        problemId=problem_id,
        jobId=job_id,
        runs=runs,
        createdAt=_isoformat(created_at),
    )


def _compute_aggregates(runs: list[SolverResult]) -> dict[str, SolverAggregate]:
    grouped_runs: dict[str, list[SolverResult]] = defaultdict(list)
    for run in runs:
        grouped_runs[run.solver].append(run)

    aggregates: dict[str, SolverAggregate] = {}
    for solver_name, solver_runs in grouped_runs.items():
        distances = [run.totalDistance for run in solver_runs]
        runtimes = [run.runtimeMs for run in solver_runs]
        average_distance = mean(distances)
        standard_deviation = pstdev(distances) if len(distances) > 1 else 0.0
        stability_score = _clamp(1.0 - (standard_deviation / average_distance if average_distance else 0.0))

        aggregates[solver_name] = SolverAggregate(
            solver=solver_name,
            nRuns=len(solver_runs),
            successfulRuns=len(solver_runs),
            avgDistance=average_distance,
            bestDistance=min(distances),
            worstDistance=max(distances),
            stdDev=standard_deviation,
            avgRuntimeMs=mean(runtimes),
            bestRuntimeMs=min(runtimes),
            stabilityScore=stability_score,
            feasibilityRate=1.0,
            qualityScore=0.0,
            runtimeScore=0.0,
            scalabilityScore=0.0,
            constraintFit=1.0,
            finalScore=0.0,
        )

    missing_solvers = set(DEFAULT_COMPARISON_SOLVERS) - set(aggregates)
    if missing_solvers:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark missing solver aggregates for: {', '.join(sorted(missing_solvers))}.",
        )
    return aggregates


def _persist_comparison(session: Session, comparison: ComparisonResult) -> None:
    record = ComparisonRecord(
        id=str(comparison.comparisonId),
        problem_id=str(comparison.problemId),
        job_id=str(comparison.jobId),
        recommended_solver=comparison.recommendedSolver,
        ranking_json=[entry.model_dump(mode="json") for entry in comparison.ranking],
        aggregates_json=[aggregate.model_dump(mode="json") for aggregate in comparison.aggregates],
        summary_cards_json=comparison.summaryCards.model_dump(mode="json"),
        runs_json=[run.model_dump(mode="json") for run in comparison.runs],
        explanation_text=comparison.recommendationReason,
        trade_off_text=comparison.tradeOffText,
    )
    session.add(record)
    session.commit()


def _solver_result_from_record(record: SolverRunRecord) -> SolverResult:
    return SolverResult(
        solver=record.solver_name,
        status="completed",
        route=record.route_json or [],
        totalDistance=record.total_distance or 0.0,
        totalCost=record.total_cost if record.total_cost is not None else (record.total_distance or 0.0),
        runtimeMs=record.runtime_ms or 0,
        iterations=record.iterations or 0,
        convergence=record.convergence_json or [],
        seed=record.seed,
        solverParams=record.solver_params_json or {},
        notes=record.notes_json or [],
    )


def _isoformat(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _session_factory_from_session(session: Session) -> sessionmaker[Session]:
    bind = session.get_bind()
    if bind is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Benchmark session is not bound to a database engine.",
        )
    return sessionmaker(
        bind=bind,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
