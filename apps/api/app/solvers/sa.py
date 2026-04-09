from __future__ import annotations

import math
import random
import time
from typing import Any

from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class SimulatedAnnealingSolver(BaseSolver):
    name = "sa"

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])

        initial_temperature = float(self.params.get("T0", 1000.0))
        cooling_rate = float(self.params.get("cooling_rate", 0.995))
        max_iter = int(self.params.get("max_iter", 10000))
        minimum_temperature = 0.01

        current_route = self.nearest_neighbor_route(distance_matrix, start_index, return_to_start)
        current_distance = self.route_distance(current_route, distance_matrix)
        best_route = current_route[:]
        best_distance = current_distance
        convergence = [best_distance]

        temperature = initial_temperature
        core_end = len(current_route) - 1 if return_to_start else len(current_route)
        for iteration in range(1, max_iter + 1):
            if temperature <= minimum_temperature:
                break

            left, right = sorted(random.sample(range(1, core_end), 2))
            candidate_route = current_route[:]
            candidate_route[left : right + 1] = reversed(candidate_route[left : right + 1])
            candidate_distance = self.route_distance(candidate_route, distance_matrix)
            delta = candidate_distance - current_distance

            if delta < 0 or random.random() < math.exp(-delta / max(temperature, 1e-9)):
                current_route = candidate_route
                current_distance = candidate_distance

            if current_distance + 1e-9 < best_distance:
                best_route = current_route[:]
                best_distance = current_distance

            if iteration % 100 == 0:
                convergence.append(best_distance)

            temperature = initial_temperature * (cooling_rate**iteration)

        if convergence[-1] != best_distance:
            convergence.append(best_distance)

        result = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(best_route, nodes),
            totalDistance=best_distance,
            totalCost=best_distance,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=max_iter,
            convergence=convergence,
            seed=self.seed,
            solverParams={
                "T0": initial_temperature,
                "cooling_rate": cooling_rate,
                "max_iter": max_iter,
            },
            notes=[],
        )
        return result.model_dump()
