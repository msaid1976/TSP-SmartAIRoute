from __future__ import annotations

import random
from abc import ABC, abstractmethod
from typing import Any

import numpy as np


class BaseSolver(ABC):
    name: str
    supports_asymmetric: bool = False
    supports_multi_objective: bool = False

    def __init__(self, params: dict[str, Any], seed: int | None = None) -> None:
        self.params = params
        self.seed = seed
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

    @abstractmethod
    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        ...

    def validate_route(self, route: list[str], nodes: list[dict[str, Any]]) -> bool:
        node_ids = [str(node["id"]) for node in nodes]
        core_route = route[:-1] if len(route) > 1 and route[0] == route[-1] else route
        return len(core_route) == len(node_ids) and sorted(core_route) == sorted(node_ids)

    def build_distance_matrix(self, nodes: list[dict[str, Any]]) -> np.ndarray:
        coords = np.array(
            [
                [float(node["x"]), float(node["y"])]
                for node in nodes
            ],
            dtype=float,
        )
        diff = coords[:, np.newaxis, :] - coords[np.newaxis, :, :]
        return np.sqrt((diff**2).sum(axis=2))

    def get_distance_matrix(self, problem: dict[str, Any]) -> np.ndarray:
        distance_matrix = problem.get("distanceMatrix")
        if distance_matrix is not None:
            return np.array(distance_matrix, dtype=float)
        return self.build_distance_matrix(problem["nodes"])

    def route_distance(self, route_indices: list[int], distance_matrix: np.ndarray) -> float:
        total = 0.0
        for current_index, next_index in zip(route_indices, route_indices[1:], strict=False):
            total += float(distance_matrix[current_index][next_index])
        return total

    def build_route_indices(
        self,
        permutation: list[int],
        start_index: int,
        return_to_start: bool,
    ) -> list[int]:
        route = [start_index, *permutation]
        if return_to_start:
            route.append(start_index)
        return route

    def build_route_ids(self, route_indices: list[int], nodes: list[dict[str, Any]]) -> list[str]:
        return [str(nodes[index]["id"]) for index in route_indices]

    def get_start_index(self, problem: dict[str, Any]) -> int:
        start_node_id = str(problem["startNodeId"])
        for index, node in enumerate(problem["nodes"]):
            if str(node["id"]) == start_node_id:
                return index
        raise ValueError(f"Start node '{start_node_id}' does not exist in problem nodes.")

    def nearest_neighbor_route(
        self,
        distance_matrix: np.ndarray,
        start_index: int,
        return_to_start: bool,
    ) -> list[int]:
        node_count = distance_matrix.shape[0]
        unvisited = {index for index in range(node_count) if index != start_index}
        route = [start_index]
        current_index = start_index

        while unvisited:
            next_index = min(unvisited, key=lambda candidate: float(distance_matrix[current_index][candidate]))
            route.append(next_index)
            unvisited.remove(next_index)
            current_index = next_index

        if return_to_start:
            route.append(start_index)
        return route

    def two_opt_route(self, route: list[int], distance_matrix: np.ndarray) -> list[int]:
        best_route = route[:]
        best_distance = self.route_distance(best_route, distance_matrix)
        last_index = len(best_route) - 1 if len(best_route) > 1 and best_route[0] == best_route[-1] else len(best_route)
        improved = True

        while improved:
            improved = False
            for left in range(1, last_index - 1):
                for right in range(left + 1, last_index):
                    candidate = best_route[:]
                    candidate[left : right + 1] = reversed(candidate[left : right + 1])
                    candidate_distance = self.route_distance(candidate, distance_matrix)
                    if candidate_distance + 1e-9 < best_distance:
                        best_route = candidate
                        best_distance = candidate_distance
                        last_index = (
                            len(best_route) - 1
                            if len(best_route) > 1 and best_route[0] == best_route[-1]
                            else len(best_route)
                        )
                        improved = True
        return best_route

    def max_edge_distance(self, route_indices: list[int], distance_matrix: np.ndarray) -> float:
        if len(route_indices) < 2:
            return 0.0
        return max(float(distance_matrix[current_index][next_index]) for current_index, next_index in zip(route_indices, route_indices[1:], strict=False))

    def random_key_to_permutation(self, vector: np.ndarray, remaining_indices: list[int]) -> list[int]:
        ordering = np.argsort(vector, kind="mergesort")
        return [remaining_indices[int(index)] for index in ordering]

    def permutation_to_random_key(
        self,
        permutation: list[int],
        index_to_position: dict[int, int],
    ) -> np.ndarray:
        vector = np.zeros(len(permutation), dtype=float)
        for rank, node_index in enumerate(permutation):
            vector[index_to_position[node_index]] = float(rank)
        return vector

    def double_bridge_move(self, route: list[int], return_to_start: bool) -> list[int]:
        if len(route) < 8:
            return route[:]

        core = route[1:-1] if return_to_start else route[1:]
        if len(core) < 6:
            return route[:]

        cut_points = sorted(random.sample(range(1, len(core)), 3))
        left, mid_left, mid_right = cut_points
        a = core[:left]
        b = core[left:mid_left]
        c = core[mid_left:mid_right]
        d = core[mid_right:]
        permuted = a + c + b + d
        start_index = route[0]
        return self.build_route_indices(permuted, start_index, return_to_start)
