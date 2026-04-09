import type { SolverName, SolverRunResponse } from "@smartroute/shared";

type SolverDisplay = {
  abbreviation: string;
  description: string;
  fullName: string;
};

const SOLVER_DISPLAY: Record<SolverName, SolverDisplay> = {
  aco: {
    abbreviation: "ACO",
    description: "Pheromone-guided swarm search",
    fullName: "Ant Colony Optimization",
  },
  ga: {
    abbreviation: "GA",
    description: "Population-based evolutionary search",
    fullName: "Genetic Algorithm",
  },
  ortools: {
    abbreviation: "OR-Tools",
    description: "Google exact routing solver",
    fullName: "Operations Research Tools",
  },
};

export function getSolverDisplay(solver: SolverName): SolverDisplay {
  return SOLVER_DISPLAY[solver];
}

export function formatSolverLabel(solver: SolverName): string {
  const display = getSolverDisplay(solver);
  return `${display.fullName} (${display.abbreviation})`;
}

export function formatConvergenceLabel(run: SolverRunResponse): string {
  if (run.status !== "completed") {
    return run.convergence.length > 0 ? `${run.convergence.length} checkpoints` : "Pending";
  }

  if (run.solverName === "ortools") {
    return "1 checkpoint (final result)";
  }

  if (run.convergence.length === 1) {
    return "1 checkpoint";
  }

  return `${run.convergence.length} checkpoints`;
}
