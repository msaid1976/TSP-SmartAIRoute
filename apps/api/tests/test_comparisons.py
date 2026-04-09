from __future__ import annotations

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from smartroute_shared.schemas import ProblemInputRequest, SolverResult
from sqlalchemy.orm import Session

from app.api.routes.problems import create_problem
from app.main import app
from app.solvers.base import BaseSolver
from app.workers.tasks import _execute_solver_run

SOLVER_BASELINES: dict[str, tuple[float, int]] = {
    "ortools": (100.0, 20),
    "ga": (106.0, 36),
    "aco": (104.0, 42),
    "sa": (108.0, 28),
    "pso": (102.0, 55),
    "nsga2": (103.0, 60),
    "tabu": (101.0, 31),
    "de": (105.0, 38),
}


def build_fake_solver(name: str) -> type[BaseSolver]:
    base_distance, runtime_ms = SOLVER_BASELINES[name]

    class FakeSolver(BaseSolver):
        def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
            nodes = problem["nodes"]
            start_index = self.get_start_index(problem)
            return_to_start = bool(problem["returnToStart"])
            remaining_indices = [index for index in range(len(nodes)) if index != start_index]
            route_indices = self.build_route_indices(remaining_indices, start_index, return_to_start)
            total_distance = base_distance + float((self.seed or 0) % 7)
            solver_params: dict[str, Any] = {"baseline": base_distance}
            if name == "nsga2":
                solver_params["paretoFront"] = [
                    {
                        "route": self.build_route_ids(route_indices, nodes),
                        "distance": total_distance,
                        "maxEdge": 33.0,
                    },
                    {
                        "route": self.build_route_ids(route_indices, nodes),
                        "distance": total_distance + 2.0,
                        "maxEdge": 29.0,
                    },
                ]

            result = SolverResult(
                solver=name,
                status="completed",
                route=self.build_route_ids(route_indices, nodes),
                totalDistance=total_distance,
                totalCost=total_distance,
                runtimeMs=runtime_ms + ((self.seed or 0) % 5),
                iterations=12,
                convergence=[total_distance + 5.0, total_distance + 1.0, total_distance],
                seed=self.seed,
                solverParams=solver_params,
                notes=[],
            )
            return result.model_dump(mode="json")

    FakeSolver.name = name
    return FakeSolver


@pytest.mark.anyio
async def test_comparison_endpoints_return_ranked_benchmark(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    problem = create_problem(
        request=ProblemInputRequest(inputType="text", payload="A(0,0), B(3,5), C(6,2), D(8,4)"),
        session=session,
    )

    monkeypatch.setattr(
        "app.services.benchmarker.DEFAULT_COMPARISON_SEEDS",
        (11, 29),
    )
    monkeypatch.setattr(
        "app.workers.tasks.SOLVER_REGISTRY",
        {solver_name: build_fake_solver(solver_name) for solver_name in SOLVER_BASELINES},
    )

    def execute_inline(task_name: str, kwargs: dict[str, str]) -> None:
        assert task_name == "solver.run"
        _execute_solver_run(session, job_id=kwargs["job_id"], solver_run_id=kwargs["solver_run_id"])

    monkeypatch.setattr("app.services.benchmarker.celery_app.send_task", execute_inline)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        create_response = await client.post(f"/api/comparisons/{problem.problemId}")
        get_response = await client.get(f"/api/comparisons/{problem.problemId}")

    assert create_response.status_code == 200
    assert get_response.status_code == 200

    payload = create_response.json()
    assert payload["recommendedSolver"] in SOLVER_BASELINES
    assert len(payload["runs"]) == len(SOLVER_BASELINES) * 2
    assert len(payload["aggregates"]) == len(SOLVER_BASELINES)
    assert len(payload["ranking"]) == len(SOLVER_BASELINES)
    assert payload["summaryCards"]["recommendedSolver"] == payload["recommendedSolver"]
    assert all(0.0 <= aggregate["finalScore"] <= 1.0 for aggregate in payload["aggregates"])
    assert "Average route distance" in payload["recommendationReason"]
    assert payload["tradeOffText"] is None or "consider" in payload["tradeOffText"]

    nsga_run = next(run for run in payload["runs"] if run["solver"] == "nsga2")
    assert nsga_run["solverParams"]["paretoFront"]
    assert get_response.json()["comparisonId"] == payload["comparisonId"]
