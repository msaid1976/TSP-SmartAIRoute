from __future__ import annotations

from datetime import datetime, timezone

from billiard.exceptions import SoftTimeLimitExceeded
from celery import Task
from smartroute_shared.schemas import CanonicalProblem, SolverResult
from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.models.job import JobRecord
from app.models.problem import ProblemRecord
from app.models.solver_run import SolverRunRecord
from app.services.jobs import sync_job_status
from app.solvers import SOLVER_REGISTRY
from app.workers.celery_client import celery_app


@celery_app.task(
    bind=True,
    name="solver.run",
    max_retries=3,
    time_limit=300,
    soft_time_limit=280,
)
def run_solver_task(self: Task, job_id: str, solver_run_id: str) -> dict[str, str]:
    session = get_session_factory()()

    try:
        _execute_solver_run(session, job_id=job_id, solver_run_id=solver_run_id)
        return {"job_id": job_id, "solver_run_id": solver_run_id, "status": "completed"}
    except SoftTimeLimitExceeded:
        _mark_timeout(session, job_id=job_id, solver_run_id=solver_run_id)
        return {"job_id": job_id, "solver_run_id": solver_run_id, "status": "timeout"}
    except Exception as exc:
        if self.request.retries < self.max_retries:
            _mark_retry_pending(session, job_id=job_id, solver_run_id=solver_run_id)
            raise self.retry(exc=exc, countdown=0) from exc
        _mark_failed(session, job_id=job_id, solver_run_id=solver_run_id, reason=str(exc))
        return {"job_id": job_id, "solver_run_id": solver_run_id, "status": "failed"}
    finally:
        session.close()


def _execute_solver_run(session: Session, job_id: str, solver_run_id: str) -> None:
    job = session.get(JobRecord, job_id)
    solver_run = session.get(SolverRunRecord, solver_run_id)
    if job is None or solver_run is None:
        raise ValueError("Job or solver run not found.")

    problem_record = session.get(ProblemRecord, job.problem_id)
    if problem_record is None:
        raise ValueError("Problem not found.")

    problem = CanonicalProblem.model_validate(problem_record.normalized_json)
    solver_class = SOLVER_REGISTRY.get(solver_run.solver_name)
    if solver_class is None:
        raise ValueError(f"Unknown solver '{solver_run.solver_name}'.")

    job.status = "running"
    job.started_at = job.started_at or _utcnow()
    solver_run.status = "running"
    session.add(job)
    session.add(solver_run)
    session.commit()

    solver = solver_class(params={}, seed=solver_run.seed)
    result = SolverResult.model_validate(solver.solve(problem.model_dump(mode="json")))
    if not solver.validate_route(result.route, problem.model_dump(mode="json")["nodes"]):
        raise ValueError(f"Solver '{solver_run.solver_name}' produced an invalid route.")

    solver_run.status = "completed"
    solver_run.total_distance = result.totalDistance
    solver_run.total_cost = result.totalCost
    solver_run.runtime_ms = result.runtimeMs
    solver_run.iterations = result.iterations
    solver_run.route_json = result.route
    solver_run.convergence_json = result.convergence
    solver_run.solver_params_json = result.solverParams
    solver_run.notes_json = result.notes
    session.add(solver_run)
    sync_job_status(session, job)
    session.commit()


def _mark_retry_pending(session: Session, job_id: str, solver_run_id: str) -> None:
    job = session.get(JobRecord, job_id)
    solver_run = session.get(SolverRunRecord, solver_run_id)
    if job is None or solver_run is None:
        return
    solver_run.status = "queued"
    session.add(solver_run)
    sync_job_status(session, job)
    session.commit()


def _mark_failed(session: Session, job_id: str, solver_run_id: str, reason: str) -> None:
    job = session.get(JobRecord, job_id)
    solver_run = session.get(SolverRunRecord, solver_run_id)
    if job is None or solver_run is None:
        return
    solver_run.status = "failed"
    job.failure_reason = reason
    session.add(solver_run)
    session.add(job)
    sync_job_status(session, job)
    session.commit()


def _mark_timeout(session: Session, job_id: str, solver_run_id: str) -> None:
    job = session.get(JobRecord, job_id)
    solver_run = session.get(SolverRunRecord, solver_run_id)
    if job is None or solver_run is None:
        return
    solver_run.status = "timeout"
    job.failure_reason = f"Solver '{solver_run.solver_name}' exceeded the soft time limit."
    session.add(solver_run)
    session.add(job)
    sync_job_status(session, job)
    session.commit()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)
