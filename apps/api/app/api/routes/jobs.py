from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from smartroute_shared.schemas import CreateJobRequest, CreateJobResponse, JobStatusResponse
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.job import JobRecord
from app.models.problem import ProblemRecord
from app.models.solver_run import SolverRunRecord
from app.services.jobs import to_job_status_response
from app.workers.celery_client import celery_app

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
db_session_dependency = Depends(get_db_session)


@router.post("", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    request: CreateJobRequest,
    session: Session = db_session_dependency,
) -> CreateJobResponse:
    problem = session.get(ProblemRecord, str(request.problemId))
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    job = JobRecord(
        id=str(uuid4()),
        user_id=None,
        problem_id=str(request.problemId),
        mode=request.mode,
        goal_objective=request.goalObjective,
        status="queued",
    )
    session.add(job)

    solver_runs: list[SolverRunRecord] = []
    for run_index, solver_name in enumerate(request.solvers):
        solver_run = SolverRunRecord(
            id=str(uuid4()),
            job_id=job.id,
            solver_name=solver_name,
            run_index=run_index,
            seed=request.seed,
            status="queued",
            convergence_json=[],
        )
        solver_runs.append(solver_run)
        session.add(solver_run)

    session.commit()

    for solver_run in solver_runs:
        celery_app.send_task(
            "solver.run",
            kwargs={"job_id": job.id, "solver_run_id": solver_run.id},
        )

    return CreateJobResponse(jobId=job.id, status=job.status)


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str, session: Session = db_session_dependency) -> JobStatusResponse:
    record = session.get(JobRecord, job_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return to_job_status_response(record)
