from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from smartroute_shared.schemas import SolverRunResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.job import JobRecord
from app.models.solver_run import SolverRunRecord
from app.services.jobs import to_solver_run_response

router = APIRouter(prefix="/api/runs", tags=["runs"])
db_session_dependency = Depends(get_db_session)


@router.get("/{job_id}", response_model=list[SolverRunResponse])
def get_runs(job_id: str, session: Session = db_session_dependency) -> list[SolverRunResponse]:
    job = session.get(JobRecord, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    records = session.scalars(
        select(SolverRunRecord)
        .where(SolverRunRecord.job_id == job_id)
        .order_by(SolverRunRecord.run_index.asc())
    ).all()
    return [to_solver_run_response(record) for record in records]
