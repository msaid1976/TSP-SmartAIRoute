from __future__ import annotations

import random
import time
from typing import Any

import numpy as np
from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class AntColonySolver(BaseSolver):
    name = "aco"

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])
        node_count = len(nodes)

        n_ants = int(self.params.get("n_ants", 50))
        n_iterations = int(self.params.get("n_iterations", 100))
        alpha = float(self.params.get("alpha", 1.0))
        beta = float(self.params.get("beta", 2.0))
        rho = float(self.params.get("rho", 0.1))
        q_value = float(self.params.get("Q", 100))
        pheromone_floor = 0.001

        heuristic = 1.0 / np.maximum(distance_matrix, 1e-9)
        np.fill_diagonal(heuristic, 0.0)
        pheromones = np.ones((node_count, node_count), dtype=float)

        best_solution: list[int] | None = None
        best_cost = float("inf")
        convergence: list[float] = []
        stagnation_counter = 0
        current_rho = rho

        for _ in range(n_iterations):
            ant_solutions: list[tuple[list[int], float]] = []
            for _ant_index in range(n_ants):
                route = self._construct_route(
                    pheromones=pheromones,
                    heuristic=heuristic,
                    start_index=start_index,
                    return_to_start=return_to_start,
                    alpha=alpha,
                    beta=beta,
                )
                cost = self.route_distance(route, distance_matrix)
                ant_solutions.append((route, cost))

            ant_solutions.sort(key=lambda item: item[1])
            iteration_best_route, iteration_best_cost = ant_solutions[0]
            if iteration_best_cost + 1e-9 < best_cost:
                best_solution = iteration_best_route[:]
                best_cost = iteration_best_cost
                stagnation_counter = 0
            else:
                stagnation_counter += 1

            pheromones *= max(0.0, 1.0 - current_rho)
            pheromones = np.maximum(pheromones, pheromone_floor)

            for route, cost in ant_solutions:
                reinforcement = q_value / max(cost, 1e-9)
                self._deposit_pheromones(pheromones, route, reinforcement, pheromone_floor)

            for route, cost in ant_solutions[: min(3, len(ant_solutions))]:
                reinforcement = (q_value / max(cost, 1e-9)) * 2.0
                self._deposit_pheromones(pheromones, route, reinforcement, pheromone_floor)

            convergence.append(best_cost)

            if stagnation_counter >= 20:
                current_rho = min(0.9, current_rho + 0.05)
                stagnation_counter = 0

        if best_solution is None:
            raise ValueError("ACO failed to construct a route.")

        improved_solution = self._two_opt(best_solution, distance_matrix)
        improved_cost = self.route_distance(improved_solution, distance_matrix)
        if improved_cost + 1e-9 < best_cost:
            best_solution = improved_solution
            best_cost = improved_cost
            convergence[-1] = best_cost

        final_route = self._finalize_route(best_solution, start_index, return_to_start)

        result = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(final_route, nodes),
            totalDistance=best_cost,
            totalCost=best_cost,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=n_iterations,
            convergence=convergence,
            seed=self.seed,
            solverParams={
                "n_ants": n_ants,
                "n_iterations": n_iterations,
                "alpha": alpha,
                "beta": beta,
                "rho": rho,
                "Q": q_value,
            },
            notes=[],
        )
        return result.model_dump()

    def _construct_route(
        self,
        pheromones: np.ndarray,
        heuristic: np.ndarray,
        start_index: int,
        return_to_start: bool,
        alpha: float,
        beta: float,
    ) -> list[int]:
        node_count = pheromones.shape[0]
        unvisited = {index for index in range(node_count) if index != start_index}
        route = [start_index]
        current_index = start_index

        while unvisited:
            candidates = sorted(unvisited)
            weights = np.array(
                [
                    (pheromones[current_index][candidate] ** alpha)
                    * (heuristic[current_index][candidate] ** beta)
                    for candidate in candidates
                ],
                dtype=float,
            )
            if np.allclose(weights.sum(), 0.0):
                next_index = random.choice(candidates)
            else:
                probabilities = weights / weights.sum()
                next_index = int(np.random.choice(candidates, p=probabilities))
            route.append(next_index)
            unvisited.remove(next_index)
            current_index = next_index

        if return_to_start and route[0] != route[-1]:
            route.append(start_index)
        return route

    def _finalize_route(
        self,
        route: list[int],
        start_index: int,
        return_to_start: bool,
    ) -> list[int]:
        if not route or route[0] != start_index:
            raise ValueError("ACO route must begin at the configured start node.")

        if return_to_start:
            if route[-1] != start_index:
                raise ValueError("ACO cycle must return to the configured start node.")
            permutation = route[1:-1]
        else:
            permutation = route[1:]

        # Rebuild through the shared helper so ACO follows the same final-route path
        # as GA and OR-Tools before mapping indices back to node IDs.
        return self.build_route_indices(permutation, start_index, return_to_start)

    def _deposit_pheromones(
        self,
        pheromones: np.ndarray,
        route: list[int],
        amount: float,
        pheromone_floor: float,
    ) -> None:
        for current_index, next_index in zip(route, route[1:], strict=False):
            pheromones[current_index][next_index] = max(
                pheromone_floor,
                pheromones[current_index][next_index] + amount,
            )

    def _two_opt(self, route: list[int], distance_matrix: np.ndarray) -> list[int]:
        best = route[:]
        best_distance = self.route_distance(best, distance_matrix)
        last_index = len(best) - 1 if len(best) > 1 and best[0] == best[-1] else len(best)
        improved = True
        while improved:
            improved = False
            for left in range(1, last_index - 1):
                for right in range(left + 1, last_index):
                    candidate = best[:]
                    candidate[left : right + 1] = reversed(candidate[left : right + 1])
                    candidate_distance = self.route_distance(candidate, distance_matrix)
                    if candidate_distance + 1e-9 < best_distance:
                        best = candidate
                        best_distance = candidate_distance
                        last_index = len(best) - 1 if len(best) > 1 and best[0] == best[-1] else len(best)
                        improved = True
        return best
