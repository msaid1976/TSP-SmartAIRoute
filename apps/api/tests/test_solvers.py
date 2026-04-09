from __future__ import annotations

from typing import Any

import pytest

from app.solvers.aco import AntColonySolver
from app.solvers.de import DifferentialEvolutionSolver
from app.solvers.ga import GeneticAlgorithmSolver
from app.solvers.nsga2 import NSGAIISolver
from app.solvers.ortools_solver import ORToolsSolver
from app.solvers.pso import ParticleSwarmSolver
from app.solvers.sa import SimulatedAnnealingSolver
from app.solvers.tabu import TabuSearchSolver

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

MATRIX_TEST_PROBLEM: dict[str, Any] = {
    "problemType": "matrix_tsp",
    "nodes": [
        {"id": "A", "label": "A", "x": None, "y": None},
        {"id": "B", "label": "B", "x": None, "y": None},
        {"id": "C", "label": "C", "x": None, "y": None},
        {"id": "D", "label": "D", "x": None, "y": None},
        {"id": "E", "label": "E", "x": None, "y": None},
    ],
    "distanceMatrix": [
        [0, 12, 18, 25, 30],
        [11, 0, 9, 16, 14],
        [17, 8, 0, 10, 13],
        [20, 15, 11, 0, 7],
        [28, 12, 14, 6, 0],
    ],
    "startNodeId": "A",
    "returnToStart": True,
    "objective": "min_distance",
    "constraints": {"maxRuntimeSeconds": 5},
}

SolverType = type[
    ORToolsSolver
    | GeneticAlgorithmSolver
    | AntColonySolver
    | SimulatedAnnealingSolver
    | ParticleSwarmSolver
    | NSGAIISolver
    | TabuSearchSolver
    | DifferentialEvolutionSolver
]

PHASE_004_SOLVERS: list[tuple[SolverType, dict[str, Any], int | None]] = [
    (ORToolsSolver, {}, None),
    (GeneticAlgorithmSolver, {"population_size": 40, "generations": 60}, 7),
    (AntColonySolver, {"n_ants": 20, "n_iterations": 40}, 7),
    (SimulatedAnnealingSolver, {"max_iter": 600}, 7),
    (ParticleSwarmSolver, {"n_particles": 20, "n_iterations": 40}, 7),
    (NSGAIISolver, {"pop_size": 30, "n_gen": 20}, 7),
    (TabuSearchSolver, {"max_iter": 120, "tabu_tenure": 10, "diversification_threshold": 30}, 7),
    (DifferentialEvolutionSolver, {"population": 20, "max_iter": 40}, 7),
]


@pytest.mark.parametrize(("solver_class", "params", "seed"), PHASE_004_SOLVERS)
def test_phase_004_solvers_return_valid_routes_on_coordinate_problem(
    solver_class: SolverType,
    params: dict[str, Any],
    seed: int | None,
) -> None:
    solver = solver_class(params=params, seed=seed)
    result = solver.solve(TEST_PROBLEM)

    assert solver.validate_route(result["route"], TEST_PROBLEM["nodes"])
    assert result["route"][0] == TEST_PROBLEM["startNodeId"]
    assert result["route"][-1] == TEST_PROBLEM["startNodeId"]
    assert result["convergence"]
    assert result["totalDistance"] > 0
    assert_monotonic_non_increasing(result["convergence"])


@pytest.mark.parametrize(("solver_class", "params", "seed"), PHASE_004_SOLVERS)
def test_phase_004_solvers_return_valid_routes_on_matrix_problem(
    solver_class: SolverType,
    params: dict[str, Any],
    seed: int | None,
) -> None:
    solver = solver_class(params=params, seed=seed)
    result = solver.solve(MATRIX_TEST_PROBLEM)

    assert solver.validate_route(result["route"], MATRIX_TEST_PROBLEM["nodes"])
    assert result["route"][0] == MATRIX_TEST_PROBLEM["startNodeId"]
    assert result["route"][-1] == MATRIX_TEST_PROBLEM["startNodeId"]
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


def test_pso_decodes_final_result_to_node_ids() -> None:
    result = ParticleSwarmSolver(params={"n_particles": 20, "n_iterations": 30}, seed=17).solve(
        TEST_PROBLEM,
    )

    assert all(isinstance(node_id, str) for node_id in result["route"])
    assert sorted(result["route"][:-1]) == sorted(node["id"] for node in TEST_PROBLEM["nodes"])


def test_de_decodes_final_result_to_node_ids() -> None:
    result = DifferentialEvolutionSolver(params={"population": 20, "max_iter": 30}, seed=17).solve(
        TEST_PROBLEM,
    )

    assert all(isinstance(node_id, str) for node_id in result["route"])
    assert sorted(result["route"][:-1]) == sorted(node["id"] for node in TEST_PROBLEM["nodes"])


def test_nsga2_stores_pareto_front() -> None:
    result = NSGAIISolver(params={"pop_size": 30, "n_gen": 20}, seed=17).solve(TEST_PROBLEM)

    pareto_front = result["solverParams"]["paretoFront"]
    assert len(pareto_front) > 1
    assert all("route" in point and "distance" in point and "maxEdge" in point for point in pareto_front)


def assert_monotonic_non_increasing(values: list[float]) -> None:
    assert all(left >= right for left, right in zip(values, values[1:], strict=False))
