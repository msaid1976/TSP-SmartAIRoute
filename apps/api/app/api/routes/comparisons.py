from __future__ import annotations

from fastapi import APIRouter, Depends
from smartroute_shared.schemas import ComparisonResult
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.services.benchmarker import get_latest_comparison, run_comparison_benchmark

router = APIRouter(prefix="/api/comparisons", tags=["comparisons"])
db_session_dependency = Depends(get_db_session)


@router.post("/{problem_id}", response_model=ComparisonResult)
def run_comparison(
    problem_id: str,
    session: Session = db_session_dependency,
) -> ComparisonResult:
    return run_comparison_benchmark(session, problem_id)


@router.get("/{problem_id}", response_model=ComparisonResult)
def get_comparison(
    problem_id: str,
    session: Session = db_session_dependency,
) -> ComparisonResult:
    return get_latest_comparison(session, problem_id)
