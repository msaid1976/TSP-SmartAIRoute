from __future__ import annotations

import time
from uuid import uuid4

import pytest
from app.main import app
from app.models.job import JobRecord
from app.models.problem import ProblemRecord
from app.models.solver_run import SolverRunRecord
from app.workers.tasks import _execute_solver_run
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes.problems import create_problem
from smartroute_shared.schemas import ProblemInputRequest


def test_execute_solver_run_persists_result(session: Session) -> None:
    problem = create_problem(
        request=ProblemInputRequest(inputType="text", payload="A(0,0), B(3,5), C(6,2), D(8,4)"),
        session=session,
    )
    job = JobRecord(
        id=str(uuid4()),
        user_id=None,
        problem_id=str(problem.problemId),
        mode="quick",
        goal_objective=None,
        status="queued",
    )
    run = SolverRunRecord(
        id=str(uuid4()),
        job_id=job.id,
        solver_name="ga",
        run_index=0,
        seed=11,
        status="queued",
        convergence_json=[],
    )
    session.add(job)
    session.add(run)
    session.commit()

    _execute_solver_run(session, job_id=job.id, solver_run_id=run.id)

    refreshed_job = session.get(JobRecord, job.id)
    refreshed_run = session.get(SolverRunRecord, run.id)
    assert refreshed_job is not None
    assert refreshed_run is not None
    assert refreshed_job.status == "completed"
    assert refreshed_run.status == "completed"
    assert refreshed_run.route_json is not None
    assert refreshed_run.runtime_ms is not None
    assert refreshed_run.convergence_json


@pytest.mark.anyio
async def test_create_job_returns_immediately_and_queues_solver_runs(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    problem = create_problem(
        request=ProblemInputRequest(inputType="text", payload="A(0,0), B(3,5), C(6,2), D(8,4)"),
        session=session,
    )
    queued_calls: list[tuple[str, dict[str, str]]] = []

    def fake_send_task(task_name: str, kwargs: dict[str, str]) -> None:
        queued_calls.append((task_name, kwargs))

    monkeypatch.setattr("app.api.routes.jobs.celery_app.send_task", fake_send_task)

    started_at = time.perf_counter()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/jobs",
            json={"problemId": str(problem.problemId), "solvers": ["ortools", "ga", "aco"], "mode": "compare"},
        )
    elapsed = time.perf_counter() - started_at

    assert response.status_code == 202
    assert elapsed < 0.2
    payload = response.json()
    assert payload["status"] == "queued"
    assert len(queued_calls) == 3
    assert all(call[0] == "solver.run" for call in queued_calls)

    jobs = session.execute(select(JobRecord)).scalars().all()
    runs = session.execute(select(SolverRunRecord)).scalars().all()
    assert len(jobs) == 1
    assert len(runs) == 3
    assert all(run.status == "queued" for run in runs)


@pytest.mark.anyio
async def test_job_and_runs_endpoints_return_persisted_status(session: Session) -> None:
    problem = create_problem(
        request=ProblemInputRequest(inputType="text", payload="A(0,0), B(3,5), C(6,2), D(8,4)"),
        session=session,
    )
    job = JobRecord(
        id=str(uuid4()),
        user_id=None,
        problem_id=str(problem.problemId),
        mode="compare",
        goal_objective=None,
        status="running",
    )
    runs = [
        SolverRunRecord(
            id=str(uuid4()),
            job_id=job.id,
            solver_name="ortools",
            run_index=0,
            seed=None,
            status="completed",
            total_distance=12.5,
            runtime_ms=8,
            route_json=["A", "B", "C", "D", "A"],
            convergence_json=[12.5],
        ),
        SolverRunRecord(
            id=str(uuid4()),
            job_id=job.id,
            solver_name="ga",
            run_index=1,
            seed=42,
            status="running",
            total_distance=None,
            runtime_ms=None,
            route_json=None,
            convergence_json=[],
        ),
    ]
    session.add(job)
    for run in runs:
        session.add(run)
    session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        job_response = await client.get(f"/api/jobs/{job.id}")
        runs_response = await client.get(f"/api/runs/{job.id}")

    assert job_response.status_code == 200
    assert runs_response.status_code == 200

    job_payload = job_response.json()
    assert job_payload["status"] == "running"
    assert job_payload["progress"] == 50.0
    assert [run["solverName"] for run in job_payload["runs"]] == ["ortools", "ga"]

    runs_payload = runs_response.json()
    assert len(runs_payload) == 2
    assert runs_payload[0]["status"] == "completed"
