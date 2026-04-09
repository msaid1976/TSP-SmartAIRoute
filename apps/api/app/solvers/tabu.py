from __future__ import annotations

from collections import deque
import time
from typing import Any

from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class TabuSearchSolver(BaseSolver):
    name = "tabu"

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])

        max_iter = int(self.params.get("max_iter", 2000))
        tabu_tenure = int(self.params.get("tabu_tenure", 15))
        diversification_threshold = int(self.params.get("diversification_threshold", 100))

        current_route = self.two_opt_route(
            self.nearest_neighbor_route(distance_matrix, start_index, return_to_start),
            distance_matrix,
        )
        current_distance = self.route_distance(current_route, distance_matrix)
        best_route = current_route[:]
        best_distance = current_distance
        convergence = [best_distance]
        tabu_list: deque[tuple[int, int]] = deque(maxlen=tabu_tenure)
        stagnant_iterations = 0

        last_index = len(current_route) - 1 if return_to_start else len(current_route)
        for iteration in range(1, max_iter + 1):
            best_candidate: list[int] | None = None
            best_candidate_distance = float("inf")
            best_move: tuple[int, int] | None = None

            for left in range(1, last_index - 1):
                for right in range(left + 1, last_index):
                    move = (left, right)
                    candidate = current_route[:]
                    candidate[left : right + 1] = reversed(candidate[left : right + 1])
                    candidate_distance = self.route_distance(candidate, distance_matrix)
                    is_tabu = move in tabu_list
                    aspiration = candidate_distance + 1e-9 < best_distance

                    if is_tabu and not aspiration:
                        continue
                    if candidate_distance + 1e-9 < best_candidate_distance:
                        best_candidate = candidate
                        best_candidate_distance = candidate_distance
                        best_move = move

            if best_candidate is None or best_move is None:
                break

            current_route = best_candidate
            current_distance = best_candidate_distance
            tabu_list.append(best_move)

            if current_distance + 1e-9 < best_distance:
                best_route = current_route[:]
                best_distance = current_distance
                stagnant_iterations = 0
            else:
                stagnant_iterations += 1

            if iteration % 50 == 0:
                current_route = best_route[:]
                current_distance = best_distance

            if stagnant_iterations >= diversification_threshold:
                current_route = self.double_bridge_move(best_route, return_to_start)
                current_distance = self.route_distance(current_route, distance_matrix)
                stagnant_iterations = 0

            if iteration % 10 == 0:
                convergence.append(best_distance)

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
                "max_iter": max_iter,
                "tabu_tenure": tabu_tenure,
                "diversification_threshold": diversification_threshold,
            },
            notes=[],
        )
        return result.model_dump()
