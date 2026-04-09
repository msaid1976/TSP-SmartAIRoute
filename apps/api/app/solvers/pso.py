from __future__ import annotations

import time
from typing import Any

import numpy as np
from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class ParticleSwarmSolver(BaseSolver):
    name = "pso"

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])

        remaining_indices = [index for index in range(len(nodes)) if index != start_index]
        index_to_position = {node_index: local_index for local_index, node_index in enumerate(remaining_indices)}
        dimensions = len(remaining_indices)

        n_particles = int(self.params.get("n_particles", 50))
        n_iterations = int(self.params.get("n_iterations", 200))
        c1 = float(self.params.get("c1", 2.0))
        c2 = float(self.params.get("c2", 2.0))
        w_max = float(self.params.get("w_max", 0.9))
        w_min = float(self.params.get("w_min", 0.4))

        positions = np.random.uniform(0.0, 1.0, size=(n_particles, dimensions))
        velocities = np.random.uniform(-0.2, 0.2, size=(n_particles, dimensions))
        personal_best_positions = positions.copy()
        personal_best_costs = np.full(n_particles, float("inf"), dtype=float)
        personal_best_routes: list[list[int]] = [[] for _ in range(n_particles)]

        global_best_position = positions[0].copy()
        global_best_route: list[int] | None = None
        global_best_cost = float("inf")
        convergence: list[float] = []

        for iteration in range(n_iterations):
            inertia = w_max - ((w_max - w_min) * iteration / max(1, n_iterations - 1))
            for particle_index in range(n_particles):
                permutation = self.random_key_to_permutation(positions[particle_index], remaining_indices)
                route = self.build_route_indices(permutation, start_index, return_to_start)
                cost = self.route_distance(route, distance_matrix)

                if cost + 1e-9 < personal_best_costs[particle_index]:
                    improved_route = self.two_opt_route(route, distance_matrix)
                    improved_cost = self.route_distance(improved_route, distance_matrix)
                    personal_best_costs[particle_index] = improved_cost
                    personal_best_routes[particle_index] = improved_route
                    personal_best_positions[particle_index] = self.permutation_to_random_key(
                        improved_route[1:-1] if return_to_start else improved_route[1:],
                        index_to_position,
                    )

                if personal_best_costs[particle_index] + 1e-9 < global_best_cost:
                    candidate_route = self.two_opt_route(personal_best_routes[particle_index], distance_matrix)
                    candidate_cost = self.route_distance(candidate_route, distance_matrix)
                    global_best_cost = candidate_cost
                    global_best_route = candidate_route
                    global_best_position = self.permutation_to_random_key(
                        candidate_route[1:-1] if return_to_start else candidate_route[1:],
                        index_to_position,
                    )

            convergence.append(global_best_cost)

            for particle_index in range(n_particles):
                r1 = np.random.random(dimensions)
                r2 = np.random.random(dimensions)
                cognitive = c1 * r1 * (personal_best_positions[particle_index] - positions[particle_index])
                social = c2 * r2 * (global_best_position - positions[particle_index])
                velocities[particle_index] = (inertia * velocities[particle_index]) + cognitive + social
                positions[particle_index] = positions[particle_index] + velocities[particle_index]

        if global_best_route is None:
            raise ValueError("PSO failed to produce a valid route.")

        result = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(global_best_route, nodes),
            totalDistance=global_best_cost,
            totalCost=global_best_cost,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=n_iterations,
            convergence=convergence,
            seed=self.seed,
            solverParams={
                "n_particles": n_particles,
                "n_iterations": n_iterations,
                "c1": c1,
                "c2": c2,
                "w_max": w_max,
                "w_min": w_min,
            },
            notes=[],
        )
        return result.model_dump()
