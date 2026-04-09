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
