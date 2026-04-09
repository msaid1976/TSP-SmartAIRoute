from __future__ import annotations

import time
from typing import Any

import numpy as np
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class ORToolsSolver(BaseSolver):
    name = "ortools"
    supports_asymmetric = True

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])
        max_runtime_seconds = int(problem.get("constraints", {}).get("maxRuntimeSeconds", 60))

        scaled_matrix, end_index = self._prepare_matrix(distance_matrix, start_index, return_to_start)
        manager = self._create_manager(len(scaled_matrix), start_index, end_index)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(scaled_matrix[from_node][to_node])

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.CHRISTOFIDES
        search_parameters.time_limit.FromSeconds(max(1, max_runtime_seconds))

        assignment = routing.SolveWithParameters(search_parameters)
        if assignment is None:
            raise ValueError("OR-Tools failed to find a route.")

        route_indices: list[int] = []
        current_index = routing.Start(0)
        while not routing.IsEnd(current_index):
            route_indices.append(manager.IndexToNode(current_index))
            current_index = assignment.Value(routing.NextVar(current_index))
        route_indices.append(manager.IndexToNode(current_index))

        route_indices = [index for index in route_indices if index < len(nodes)]
        if return_to_start and route_indices[-1] != start_index:
            route_indices.append(start_index)

        total_distance = self.route_distance(route_indices, distance_matrix)
        result = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(route_indices, nodes),
            totalDistance=total_distance,
            totalCost=total_distance,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=1,
            convergence=[total_distance],
            seed=self.seed,
            solverParams={"max_runtime_seconds": max_runtime_seconds},
            notes=[],
        )
        return result.model_dump()

    def _prepare_matrix(
        self,
        distance_matrix: np.ndarray,
        start_index: int,
        return_to_start: bool,
    ) -> tuple[np.ndarray, int | None]:
        scaled = np.rint(distance_matrix * 1000).astype(int)
        if return_to_start:
            return scaled, None

        node_count = scaled.shape[0]
        augmented = np.full((node_count + 1, node_count + 1), fill_value=10**9, dtype=int)
        augmented[:node_count, :node_count] = scaled
        augmented[:, node_count] = 0
        augmented[node_count, node_count] = 0
        augmented[node_count, start_index] = 10**9
        return augmented, node_count

    def _create_manager(
        self,
        node_count: int,
        start_index: int,
        end_index: int | None,
    ) -> pywrapcp.RoutingIndexManager:
        if end_index is None:
            return pywrapcp.RoutingIndexManager(node_count, 1, start_index)
        return pywrapcp.RoutingIndexManager(node_count, 1, [start_index], [end_index])
