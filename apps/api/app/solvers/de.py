from __future__ import annotations

import time
from typing import Any

import numpy as np
from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class DifferentialEvolutionSolver(BaseSolver):
    name = "de"

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])

        remaining_indices = [index for index in range(len(nodes)) if index != start_index]
        dimensions = len(remaining_indices)
        population_size = int(self.params.get("population", 80))
        max_iter = int(self.params.get("max_iter", 500))
        mutation_factor = float(self.params.get("F", 0.8))
        crossover_rate = float(self.params.get("CR", 0.9))

        population = np.random.uniform(0.0, 1.0, size=(population_size, dimensions))
        costs = np.array(
            [self._evaluate(vector, remaining_indices, start_index, return_to_start, distance_matrix) for vector in population],
            dtype=float,
        )

        best_index = int(np.argmin(costs))
        best_vector = population[best_index].copy()
        best_route = self._decode_route(best_vector, remaining_indices, start_index, return_to_start)
        best_route = self.two_opt_route(best_route, distance_matrix)
        best_cost = self.route_distance(best_route, distance_matrix)
        convergence = [best_cost]

        for iteration in range(1, max_iter + 1):
            for index in range(population_size):
                candidate_indices = [candidate for candidate in range(population_size) if candidate != index]
                r1, r2, r3 = np.random.choice(candidate_indices, size=3, replace=False)
                mutant = population[r1] + mutation_factor * (population[r2] - population[r3])

                crossover_mask = np.random.random(dimensions) < crossover_rate
                if not np.any(crossover_mask):
                    crossover_mask[np.random.randint(0, dimensions)] = True
                trial = np.where(crossover_mask, mutant, population[index])
                trial_cost = self._evaluate(
                    trial,
                    remaining_indices,
                    start_index,
                    return_to_start,
                    distance_matrix,
                )

                if trial_cost + 1e-9 < costs[index]:
                    population[index] = trial
                    costs[index] = trial_cost

            best_index = int(np.argmin(costs))
            candidate_route = self._decode_route(
                population[best_index],
                remaining_indices,
                start_index,
                return_to_start,
            )
            candidate_route = self.two_opt_route(candidate_route, distance_matrix)
            candidate_cost = self.route_distance(candidate_route, distance_matrix)
            if candidate_cost + 1e-9 < best_cost:
                best_cost = candidate_cost
                best_route = candidate_route
                best_vector = self.permutation_to_random_key(
                    candidate_route[1:-1] if return_to_start else candidate_route[1:],
                    {node_index: local_index for local_index, node_index in enumerate(remaining_indices)},
                )
                population[best_index] = best_vector
                costs[best_index] = best_cost

            if iteration % 10 == 0:
                convergence.append(best_cost)

        if convergence[-1] != best_cost:
            convergence.append(best_cost)

        result = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(best_route, nodes),
            totalDistance=best_cost,
            totalCost=best_cost,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=max_iter,
            convergence=convergence,
            seed=self.seed,
            solverParams={
                "population": population_size,
                "max_iter": max_iter,
                "F": mutation_factor,
                "CR": crossover_rate,
            },
            notes=[],
        )
        return result.model_dump()

    def _decode_route(
        self,
        vector: np.ndarray,
        remaining_indices: list[int],
        start_index: int,
        return_to_start: bool,
    ) -> list[int]:
        permutation = self.random_key_to_permutation(vector, remaining_indices)
        return self.build_route_indices(permutation, start_index, return_to_start)

    def _evaluate(
        self,
        vector: np.ndarray,
        remaining_indices: list[int],
        start_index: int,
        return_to_start: bool,
        distance_matrix: np.ndarray,
    ) -> float:
        route = self._decode_route(vector, remaining_indices, start_index, return_to_start)
        return self.route_distance(route, distance_matrix)
