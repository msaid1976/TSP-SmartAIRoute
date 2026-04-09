from __future__ import annotations

import time
from typing import Any

import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.callback import Callback
from pymoo.core.problem import Problem
from pymoo.optimize import minimize
from pymoo.operators.crossover.sbx import SBX
from pymoo.operators.mutation.pm import PM
from pymoo.operators.sampling.rnd import FloatRandomSampling
from smartroute_shared.schemas import ParetoFrontPoint, SolverResult

from app.solvers.base import BaseSolver


class QuietLogger(Callback):
    def __init__(self) -> None:
        super().__init__()
        self.data["best_distance_history"] = []
        self._best_distance = float("inf")

    def notify(self, algorithm: Any) -> None:
        values = algorithm.pop.get("F")
        if values is None or len(values) == 0:
            return
        current_best = float(np.min(values[:, 0]))
        self._best_distance = min(self._best_distance, current_best)
        self.data["best_distance_history"].append(self._best_distance)


class _NSGA2RoutingProblem(Problem):
    def __init__(
        self,
        solver: BaseSolver,
        distance_matrix: np.ndarray,
        start_index: int,
        return_to_start: bool,
        remaining_indices: list[int],
    ) -> None:
        super().__init__(
            n_var=len(remaining_indices),
            n_obj=2,
            n_ieq_constr=0,
            xl=0.0,
            xu=1.0,
        )
        self.solver = solver
        self.distance_matrix = distance_matrix
        self.start_index = start_index
        self.return_to_start = return_to_start
        self.remaining_indices = remaining_indices

    def _evaluate(self, x: np.ndarray, out: dict[str, Any], *args: Any, **kwargs: Any) -> None:
        objectives: list[list[float]] = []
        for vector in x:
            permutation = self.solver.random_key_to_permutation(vector, self.remaining_indices)
            route = self.solver.build_route_indices(permutation, self.start_index, self.return_to_start)
            objectives.append(
                [
                    self.solver.route_distance(route, self.distance_matrix),
                    self.solver.max_edge_distance(route, self.distance_matrix),
                ],
            )
        out["F"] = np.array(objectives, dtype=float)


class NSGAIISolver(BaseSolver):
    name = "nsga2"
    supports_multi_objective = True

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])
        remaining_indices = [index for index in range(len(nodes)) if index != start_index]

        pop_size = int(self.params.get("pop_size", 100))
        n_gen = int(self.params.get("n_gen", 200))
        routing_problem = _NSGA2RoutingProblem(
            solver=self,
            distance_matrix=distance_matrix,
            start_index=start_index,
            return_to_start=return_to_start,
            remaining_indices=remaining_indices,
        )
        callback = QuietLogger()
        algorithm = NSGA2(
            pop_size=pop_size,
            sampling=FloatRandomSampling(),
            crossover=SBX(eta=15, prob=0.9),
            mutation=PM(eta=20, prob=1.0 / max(1, routing_problem.n_var)),
        )
        result = minimize(
            routing_problem,
            algorithm,
            ("n_gen", n_gen),
            callback=callback,
            seed=self.seed,
            verbose=False,
        )

        if result.X is None or result.F is None or len(result.X) == 0:
            raise ValueError("NSGA-II failed to produce a Pareto front.")
        if len(result.X) < 2:
            raise ValueError(
                "NSGA-II Pareto front has only one solution - multi-objective problem may be degenerate.",
            )

        pareto_front: list[ParetoFrontPoint] = []
        ideal_distance = float(np.min(result.F[:, 0]))
        ideal_max_edge = float(np.min(result.F[:, 1]))
        knee_index = 0
        knee_distance = float("inf")
        best_route: list[int] | None = None
        best_total_distance = 0.0

        for index, (vector, objectives) in enumerate(zip(result.X, result.F, strict=False)):
            permutation = self.random_key_to_permutation(vector, remaining_indices)
            route = self.build_route_indices(permutation, start_index, return_to_start)
            total_distance = float(objectives[0])
            max_edge = float(objectives[1])
            pareto_front.append(
                ParetoFrontPoint(
                    route=self.build_route_ids(route, nodes),
                    distance=total_distance,
                    maxEdge=max_edge,
                ),
            )

            normalized_distance = (total_distance - ideal_distance) / max(1e-9, float(np.max(result.F[:, 0]) - ideal_distance))
            normalized_max_edge = (max_edge - ideal_max_edge) / max(1e-9, float(np.max(result.F[:, 1]) - ideal_max_edge))
            distance_to_ideal = float(np.hypot(normalized_distance, normalized_max_edge))
            if distance_to_ideal < knee_distance:
                knee_distance = distance_to_ideal
                knee_index = index
                best_route = route
                best_total_distance = total_distance

        if best_route is None:
            raise ValueError("NSGA-II knee-point extraction failed.")

        convergence = callback.data["best_distance_history"]
        if not convergence:
            convergence = [best_total_distance]

        result_payload = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(best_route, nodes),
            totalDistance=best_total_distance,
            totalCost=best_total_distance,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=n_gen,
            convergence=convergence,
            seed=self.seed,
            solverParams={
                "pop_size": pop_size,
                "n_gen": n_gen,
                "paretoFront": [point.model_dump() for point in pareto_front],
                "kneeIndex": knee_index,
            },
            notes=[],
        )
        return result_payload.model_dump()
