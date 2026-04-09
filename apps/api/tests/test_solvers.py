from __future__ import annotations

from typing import Any

import pytest

from app.solvers.aco import AntColonySolver
from app.solvers.ga import GeneticAlgorithmSolver
from app.solvers.ortools_solver import ORToolsSolver

TEST_PROBLEM: dict[str, Any] = {
    "problemType": "tsp",
    "nodes": [
        {"id": "A", "label": "A", "x": 565, "y": 575},
        {"id": "B", "label": "B", "x": 25, "y": 185},
        {"id": "C", "label": "C", "x": 345, "y": 750},
        {"id": "D", "label": "D", "x": 945, "y": 685},
        {"id": "E", "label": "E", "x": 845, "y": 655},
        {"id": "F", "label": "F", "x": 880, "y": 660},
        {"id": "G", "label": "G", "x": 25, "y": 230},
        {"id": "H", "label": "H", "x": 525, "y": 1000},
        {"id": "I", "label": "I", "x": 580, "y": 1175},
        {"id": "J", "label": "J", "x": 650, "y": 1130},
    ],
    "distanceMatrix": None,
    "startNodeId": "A",
    "returnToStart": True,
    "objective": "min_distance",
    "constraints": {},
}


@pytest.mark.parametrize(
    ("solver_class", "params", "seed"),
    [
        (ORToolsSolver, {}, None),
        (GeneticAlgorithmSolver, {"population_size": 40, "generations": 60}, 7),
        (AntColonySolver, {"n_ants": 20, "n_iterations": 40}, 7),
    ],
)
def test_phase_003_solvers_return_valid_routes(
    solver_class: type[ORToolsSolver | GeneticAlgorithmSolver | AntColonySolver],
    params: dict[str, Any],
    seed: int | None,
) -> None:
    solver = solver_class(params=params, seed=seed)
    result = solver.solve(TEST_PROBLEM)

    assert solver.validate_route(result["route"], TEST_PROBLEM["nodes"])
    assert result["route"][0] == TEST_PROBLEM["startNodeId"]
    assert result["convergence"]
    assert result["totalDistance"] > 0
    assert_monotonic_non_increasing(result["convergence"])


def test_ga_is_reproducible_for_same_seed() -> None:
    params = {"population_size": 40, "generations": 60}
    left = GeneticAlgorithmSolver(params=params, seed=13).solve(TEST_PROBLEM)
    right = GeneticAlgorithmSolver(params=params, seed=13).solve(TEST_PROBLEM)

    assert left["route"] == right["route"]
    assert left["convergence"] == right["convergence"]


def test_aco_is_reproducible_for_same_seed() -> None:
    params = {"n_ants": 20, "n_iterations": 40}
    left = AntColonySolver(params=params, seed=13).solve(TEST_PROBLEM)
    right = AntColonySolver(params=params, seed=13).solve(TEST_PROBLEM)

    assert left["route"] == right["route"]
    assert left["convergence"] == right["convergence"]


def test_aco_returns_explicit_cycle_from_start_node() -> None:
    result = AntColonySolver(params={"n_ants": 20, "n_iterations": 40}, seed=13).solve(TEST_PROBLEM)

    assert result["route"][0] == TEST_PROBLEM["startNodeId"]
    assert result["route"][-1] == TEST_PROBLEM["startNodeId"]
    assert sorted(result["route"][:-1]) == sorted(node["id"] for node in TEST_PROBLEM["nodes"])


def test_ortools_supports_matrix_tsp() -> None:
    problem = {
        "problemType": "matrix_tsp",
        "nodes": [
            {"id": "A", "label": "A", "x": None, "y": None},
            {"id": "B", "label": "B", "x": None, "y": None},
            {"id": "C", "label": "C", "x": None, "y": None},
            {"id": "D", "label": "D", "x": None, "y": None},
        ],
        "distanceMatrix": [
            [0, 10, 15, 20],
            [5, 0, 9, 10],
            [6, 13, 0, 12],
            [8, 8, 9, 0],
        ],
        "startNodeId": "A",
        "returnToStart": True,
        "objective": "min_distance",
        "constraints": {"maxRuntimeSeconds": 5},
    }

    solver = ORToolsSolver(params={})
    result = solver.solve(problem)

    assert solver.validate_route(result["route"], problem["nodes"])
    assert result["route"][0] == "A"
    assert result["convergence"] == [result["totalDistance"]]


def assert_monotonic_non_increasing(values: list[float]) -> None:
    assert all(left >= right for left, right in zip(values, values[1:], strict=False))
