from __future__ import annotations

import random
import time
from typing import Any

import numpy as np
from smartroute_shared.schemas import SolverResult

from app.solvers.base import BaseSolver


class GeneticAlgorithmSolver(BaseSolver):
    name = "ga"

    def solve(self, problem: dict[str, Any]) -> dict[str, Any]:
        started_at = time.perf_counter()
        nodes = problem["nodes"]
        distance_matrix = self.get_distance_matrix(problem)
        start_index = self.get_start_index(problem)
        return_to_start = bool(problem["returnToStart"])
        permutation_indices = [index for index in range(len(nodes)) if index != start_index]

        population_size = int(self.params.get("population_size", 100))
        generations = int(self.params.get("generations", 300))
        crossover_rate = float(self.params.get("crossover_rate", 0.8))
        mutation_rate = float(self.params.get("mutation_rate", 0.1))
        elitism_count = max(1, int(population_size * 0.1))

        population = [
            random.sample(permutation_indices, k=len(permutation_indices))
            for _ in range(population_size)
        ]

        best_individual = min(
            population,
            key=lambda individual: self._fitness(individual, distance_matrix, start_index, return_to_start),
        )
        best_distance = self._fitness(best_individual, distance_matrix, start_index, return_to_start)
        convergence = [best_distance]

        for generation in range(generations):
            scored_population = sorted(
                population,
                key=lambda individual: self._fitness(
                    individual,
                    distance_matrix,
                    start_index,
                    return_to_start,
                ),
            )

            improved_best = self._two_opt(
                scored_population[0],
                distance_matrix,
                start_index,
                return_to_start,
            )
            scored_population[0] = improved_best

            current_best_distance = self._fitness(
                scored_population[0],
                distance_matrix,
                start_index,
                return_to_start,
            )
            if current_best_distance < best_distance:
                best_individual = scored_population[0][:]
                best_distance = current_best_distance

            if generation > 0 and generation % 10 == 0:
                convergence.append(best_distance)

            next_population = [individual[:] for individual in scored_population[:elitism_count]]
            while len(next_population) < population_size:
                parent_one = self._tournament_selection(
                    scored_population,
                    distance_matrix,
                    start_index,
                    return_to_start,
                )
                parent_two = self._tournament_selection(
                    scored_population,
                    distance_matrix,
                    start_index,
                    return_to_start,
                )

                if random.random() < crossover_rate and len(permutation_indices) > 1:
                    if generation < 50:
                        child_one, child_two = self._order_crossover(parent_one, parent_two)
                    else:
                        child_one, child_two = self._pmx_crossover(parent_one, parent_two)
                else:
                    child_one, child_two = parent_one[:], parent_two[:]

                effective_mutation_rate = self._mutation_probability(generation, generations, mutation_rate)
                self._mutate(child_one, effective_mutation_rate)
                self._mutate(child_two, effective_mutation_rate)
                next_population.append(child_one)
                if len(next_population) < population_size:
                    next_population.append(child_two)

            population = next_population

        if convergence[-1] != best_distance:
            convergence.append(best_distance)

        final_route = self.build_route_indices(best_individual, start_index, return_to_start)
        result = SolverResult(
            solver=self.name,
            status="completed",
            route=self.build_route_ids(final_route, nodes),
            totalDistance=best_distance,
            totalCost=best_distance,
            runtimeMs=int((time.perf_counter() - started_at) * 1000),
            iterations=generations,
            convergence=convergence,
            seed=self.seed,
            solverParams={
                "population_size": population_size,
                "generations": generations,
                "crossover_rate": crossover_rate,
                "mutation_rate": mutation_rate,
            },
            notes=[],
        )
        return result.model_dump()

    def _fitness(
        self,
        individual: list[int],
        distance_matrix: np.ndarray,
        start_index: int,
        return_to_start: bool,
    ) -> float:
        route = self.build_route_indices(individual, start_index, return_to_start)
        return self.route_distance(route, distance_matrix)

    def _tournament_selection(
        self,
        population: list[list[int]],
        distance_matrix: np.ndarray,
        start_index: int,
        return_to_start: bool,
    ) -> list[int]:
        tournament = random.sample(population, k=min(3, len(population)))
        winner = min(
            tournament,
            key=lambda individual: self._fitness(
                individual,
                distance_matrix,
                start_index,
                return_to_start,
            ),
        )
        return winner[:]

    def _order_crossover(
        self,
        parent_one: list[int],
        parent_two: list[int],
    ) -> tuple[list[int], list[int]]:
        if len(parent_one) < 2:
            return parent_one[:], parent_two[:]

        left, right = sorted(random.sample(range(len(parent_one)), 2))
        child_one: list[int | None] = [None] * len(parent_one)
        child_two: list[int | None] = [None] * len(parent_two)
        child_one[left:right] = parent_one[left:right]
        child_two[left:right] = parent_two[left:right]

        self._fill_order(child_one, parent_two, right)
        self._fill_order(child_two, parent_one, right)
        return [gene for gene in child_one if gene is not None], [gene for gene in child_two if gene is not None]

    def _fill_order(self, child: list[int | None], donor: list[int], start_position: int) -> None:
        insert_position = start_position % len(child)
        for gene in donor:
            if gene in child:
                continue
            while child[insert_position] is not None:
                insert_position = (insert_position + 1) % len(child)
            child[insert_position] = gene

    def _pmx_crossover(
        self,
        parent_one: list[int],
        parent_two: list[int],
    ) -> tuple[list[int], list[int]]:
        if len(parent_one) < 2:
            return parent_one[:], parent_two[:]

        left, right = sorted(random.sample(range(len(parent_one)), 2))
        return (
            self._pmx_child(parent_one, parent_two, left, right),
            self._pmx_child(parent_two, parent_one, left, right),
        )

    def _pmx_child(
        self,
        primary: list[int],
        secondary: list[int],
        left: int,
        right: int,
    ) -> list[int]:
        child: list[int | None] = [None] * len(primary)
        child[left:right] = primary[left:right]

        for index in range(left, right):
            candidate = secondary[index]
            if candidate in child:
                continue

            mapped_index = index
            while True:
                mapped_gene = primary[mapped_index]
                mapped_index = secondary.index(mapped_gene)
                if child[mapped_index] is None:
                    child[mapped_index] = candidate
                    break

        for index, gene in enumerate(secondary):
            if child[index] is None:
                child[index] = gene

        return [gene for gene in child if gene is not None]

    def _mutation_probability(
        self,
        generation: int,
        generations: int,
        mutation_rate: float,
    ) -> float:
        if generations <= 1:
            base_rate = 0.05
        else:
            progress = generation / (generations - 1)
            base_rate = 0.15 - (0.10 * progress)
        sampled_rate = float(np.random.normal(loc=base_rate, scale=max(0.01, mutation_rate / 4)))
        return float(np.clip(sampled_rate, 0.01, 0.5))

    def _mutate(self, individual: list[int], swap_probability: float) -> None:
        if len(individual) < 2 or random.random() >= swap_probability:
            return
        left, right = random.sample(range(len(individual)), 2)
        individual[left], individual[right] = individual[right], individual[left]

    def _two_opt(
        self,
        individual: list[int],
        distance_matrix: np.ndarray,
        start_index: int,
        return_to_start: bool,
    ) -> list[int]:
        best = individual[:]
        best_distance = self._fitness(best, distance_matrix, start_index, return_to_start)
        improved = True
        while improved:
            improved = False
            for left in range(len(best) - 1):
                for right in range(left + 1, len(best)):
                    candidate = best[:]
                    candidate[left : right + 1] = reversed(candidate[left : right + 1])
                    candidate_distance = self._fitness(
                        candidate,
                        distance_matrix,
                        start_index,
                        return_to_start,
                    )
                    if candidate_distance + 1e-9 < best_distance:
                        best = candidate
                        best_distance = candidate_distance
                        improved = True
        return best
