from __future__ import annotations

from datetime import datetime, timezone

from smartroute_shared.schemas import JobStatusResponse, SolverRunResponse
from sqlalchemy.orm import Session

from app.models.job import JobRecord
from app.models.solver_run import SolverRunRecord

TERMINAL_RUN_STATUSES = {"completed", "failed", "timeout"}


def sync_job_status(session: Session, job: JobRecord) -> JobRecord:
    runs = list(sorted(job.solver_runs, key=lambda run: run.run_index))
    if not runs:
        job.status = "queued"
        return job

    if all(run.status == "completed" for run in runs):
        job.status = "completed"
        job.completed_at = _utcnow()
        job.failure_reason = None
    elif any(run.status == "running" for run in runs):
        job.status = "running"
        job.completed_at = None
    elif all(run.status in TERMINAL_RUN_STATUSES for run in runs):
        job.status = "timeout" if any(run.status == "timeout" for run in runs) else "failed"
        job.completed_at = _utcnow()
    elif any(run.status != "queued" for run in runs):
        job.status = "running"
        job.completed_at = None
    else:
        job.status = "queued"
        job.completed_at = None

    if job.status == "running" and job.started_at is None:
        job.started_at = _utcnow()

    session.add(job)
    return job


def calculate_job_progress(job: JobRecord) -> float:
    runs = list(job.solver_runs)
    if not runs:
        return 0.0
    completed = sum(1 for run in runs if run.status in TERMINAL_RUN_STATUSES)
    return round((completed / len(runs)) * 100, 2)


def to_solver_run_response(record: SolverRunRecord) -> SolverRunResponse:
    return SolverRunResponse(
        id=record.id,
        jobId=record.job_id,
        solverName=record.solver_name,
        runIndex=record.run_index,
        seed=record.seed,
        status=record.status,
        totalDistance=record.total_distance,
        runtimeMs=record.runtime_ms,
        route=record.route_json,
        convergence=record.convergence_json or [],
        createdAt=_isoformat(record.created_at),
    )


def to_job_status_response(record: JobRecord) -> JobStatusResponse:
    runs = sorted(record.solver_runs, key=lambda run: run.run_index)
    return JobStatusResponse(
        jobId=record.id,
        problemId=record.problem_id,
        mode=record.mode,
        status=record.status,
        progress=calculate_job_progress(record),
        submittedAt=_isoformat(record.submitted_at),
        startedAt=_isoformat(record.started_at) if record.started_at else None,
        completedAt=_isoformat(record.completed_at) if record.completed_at else None,
        failureReason=record.failure_reason,
        runs=[to_solver_run_response(run) for run in runs],
    )


def _isoformat(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)
