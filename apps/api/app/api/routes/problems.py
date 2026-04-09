from __future__ import annotations

import csv
from io import StringIO
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, status
from smartroute_shared.schemas import (
    CanonicalProblem,
    ParseResult,
    ProblemDistanceMatrixResponse,
    ProblemInputRequest,
    ProblemPreviewResponse,
)
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.problem import ProblemRecord
from app.services.normalizer import normalize
from app.services.parser import parse_canvas, parse_matrix, parse_table, parse_text
from app.services.validator import ProblemValidationError

router = APIRouter(prefix="/api/problems", tags=["problems"])
db_session_dependency = Depends(get_db_session)


@router.post("/preview", response_model=ProblemPreviewResponse)
async def preview_problem(request: ProblemInputRequest) -> ProblemPreviewResponse:
    parsed = _parse_request(request)
    normalized = _normalize_or_422(parsed)
    warnings = _collect_warnings(parsed)
    return ProblemPreviewResponse(problem=normalized, warnings=warnings)


@router.post("", response_model=CanonicalProblem, status_code=status.HTTP_201_CREATED)
def create_problem(
    request: ProblemInputRequest,
    session: Session = db_session_dependency,
) -> CanonicalProblem:
    parsed = _parse_request(request)
    normalized = _normalize_or_422(parsed)

    record = ProblemRecord(
        id=str(normalized.problemId),
        user_id=None,
        name=normalized.name,
        problem_type=normalized.problemType,
        raw_input_type=request.inputType,
        raw_input_json=request.model_dump(mode="json"),
        normalized_json=normalized.model_dump(mode="json"),
    )
    session.add(record)
    session.commit()

    return normalized


@router.get("/{problem_id}", response_model=CanonicalProblem)
def get_problem(
    problem_id: str,
    session: Session = db_session_dependency,
) -> CanonicalProblem:
    record = session.get(ProblemRecord, problem_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    return CanonicalProblem.model_validate(record.normalized_json)


@router.get("/{problem_id}/distance-matrix", response_model=ProblemDistanceMatrixResponse)
def get_problem_distance_matrix(
    problem_id: str,
    session: Session = db_session_dependency,
) -> ProblemDistanceMatrixResponse:
    record = session.get(ProblemRecord, problem_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    problem = CanonicalProblem.model_validate(record.normalized_json)
    if problem.distanceMatrix is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distance matrix not available for this problem.",
        )

    return ProblemDistanceMatrixResponse(
        problemId=problem.problemId,
        distanceMatrix=problem.distanceMatrix,
    )


def _parse_request(request: ProblemInputRequest) -> ParseResult:
    if request.inputType == "text":
        parsed = parse_text(str(request.payload))
    elif request.inputType == "table":
        parsed = parse_table(_coerce_table_rows(request.payload))
    elif request.inputType == "matrix":
        payload = request.payload
        if isinstance(payload, dict):
            data = cast(list[list[Any]], payload.get("data", []))
            labels = payload.get("labels") or request.labels
        else:
            data = cast(list[list[Any]], payload)
            labels = request.labels
        parsed = parse_matrix(data, labels=labels)
    elif request.inputType == "gui":
        payload = request.payload if isinstance(request.payload, dict) else {}
        parsed = parse_canvas({"inputType": request.inputType, "payload": payload})
    elif request.inputType == "map":
        payload = request.payload if isinstance(request.payload, dict) else {}
        parsed = parse_canvas({"inputType": request.inputType, "payload": payload})
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["Image ingestion is a Phase 006B stub."],
        )

    parsed.name = request.name
    parsed.returnToStart = request.returnToStart
    parsed.objective = request.objective
    return parsed


def _coerce_table_rows(payload: Any) -> list[list[Any]]:
    if isinstance(payload, list):
        return cast(list[list[Any]], payload)

    if isinstance(payload, str):
        return _parse_csv_text(payload)

    if isinstance(payload, dict) and isinstance(payload.get("text"), str):
        return _parse_csv_text(payload["text"])

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=[
            "Table payload must be either a 2D array of rows or an object with a 'text' CSV string."
        ],
    )


def _parse_csv_text(text: str) -> list[list[str]]:
    reader = csv.reader(StringIO(text))
    return [[cell.strip() for cell in row] for row in reader if any(cell.strip() for cell in row)]


def _normalize_or_422(parsed: ParseResult) -> CanonicalProblem:
    try:
        return normalize(parsed)
    except ProblemValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=error.errors,
        ) from error


def _collect_warnings(parsed: ParseResult) -> list[str]:
    warnings = list(parsed.warnings)
    if parsed.startNodeId is None and parsed.nodes:
        warnings.append("No start node selected. Defaulting to first node.")
    return warnings
