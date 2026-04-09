from app.solvers.aco import AntColonySolver
from app.solvers.base import BaseSolver
from app.solvers.de import DifferentialEvolutionSolver
from app.solvers.ga import GeneticAlgorithmSolver
from app.solvers.nsga2 import NSGAIISolver
from app.solvers.ortools_solver import ORToolsSolver
from app.solvers.pso import ParticleSwarmSolver
from app.solvers.sa import SimulatedAnnealingSolver
from app.solvers.tabu import TabuSearchSolver

SOLVER_REGISTRY: dict[str, type[BaseSolver]] = {
    "ortools": ORToolsSolver,
    "ga": GeneticAlgorithmSolver,
    "aco": AntColonySolver,
    "sa": SimulatedAnnealingSolver,
    "pso": ParticleSwarmSolver,
    "nsga2": NSGAIISolver,
    "tabu": TabuSearchSolver,
    "de": DifferentialEvolutionSolver,
}

__all__ = [
    "AntColonySolver",
    "BaseSolver",
    "DifferentialEvolutionSolver",
    "GeneticAlgorithmSolver",
    "NSGAIISolver",
    "ORToolsSolver",
    "ParticleSwarmSolver",
    "SimulatedAnnealingSolver",
    "SOLVER_REGISTRY",
    "TabuSearchSolver",
]
