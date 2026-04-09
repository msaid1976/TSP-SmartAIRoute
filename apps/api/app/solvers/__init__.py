from app.solvers.aco import AntColonySolver
from app.solvers.base import BaseSolver
from app.solvers.ga import GeneticAlgorithmSolver
from app.solvers.ortools_solver import ORToolsSolver

SOLVER_REGISTRY: dict[str, type[BaseSolver]] = {
    "ortools": ORToolsSolver,
    "ga": GeneticAlgorithmSolver,
    "aco": AntColonySolver,
}

__all__ = [
    "AntColonySolver",
    "BaseSolver",
    "GeneticAlgorithmSolver",
    "ORToolsSolver",
    "SOLVER_REGISTRY",
]
