export interface HealthResponse {
  status: "ok";
  db: "connected";
  version: string;
}

export interface PingResponse {
  status: "ok";
  message: "pong";
}

export type ProblemType = "tsp" | "atsp" | "weighted_tsp" | "matrix_tsp" | "open_tsp";
export type ProblemObjective = "min_distance" | "min_cost" | "min_time";
export type ProblemInputType = "text" | "table" | "matrix" | "gui" | "map" | "image";
export type SolverName = "ortools" | "ga" | "aco";
export type JobMode = "quick" | "compare" | "goal";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "timeout";
export type SolverRunStatus = "queued" | "running" | "completed" | "failed" | "timeout";

export interface ProblemNode {
  id: string;
  label: string;
  x: number | null;
  y: number | null;
}

export interface ParseResult {
  inputType: ProblemInputType;
  name: string | null;
  problemType: ProblemType | null;
  nodes: ProblemNode[];
  distanceMatrix: number[][] | null;
  startNodeId: string | null;
  returnToStart: boolean;
  objective: ProblemObjective;
  secondaryObjectives: ProblemObjective[];
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
  warnings: string[];
}

export interface CanonicalProblem {
  problemId: string;
  problemType: ProblemType;
  name: string | null;
  nodes: ProblemNode[];
  distanceMatrix: number[][] | null;
  startNodeId: string;
  returnToStart: boolean;
  objective: ProblemObjective;
  secondaryObjectives: ProblemObjective[];
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ProblemInputRequest {
  inputType: ProblemInputType;
  payload: unknown;
  name?: string | null;
  labels?: string[] | null;
  returnToStart?: boolean;
  objective?: ProblemObjective;
}

export interface ProblemPreviewResponse {
  problem: CanonicalProblem;
  warnings: string[];
}

export interface ProblemDistanceMatrixResponse {
  problemId: string;
  distanceMatrix: number[][];
}

export interface SolverResult {
  solver: SolverName;
  status: "completed";
  route: string[];
  totalDistance: number;
  totalCost: number;
  runtimeMs: number;
  iterations: number;
  convergence: number[];
  seed: number | null;
  solverParams: Record<string, unknown>;
  notes: string[];
}

export interface CreateJobRequest {
  problemId: string;
  solvers: SolverName[];
  mode?: JobMode;
  goalObjective?: ProblemObjective | null;
  seed?: number | null;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
}

export interface SolverRunResponse {
  id: string;
  jobId: string;
  solverName: SolverName;
  runIndex: number;
  seed: number | null;
  status: SolverRunStatus;
  totalDistance: number | null;
  runtimeMs: number | null;
  route: string[] | null;
  convergence: number[];
  createdAt: string;
}

export interface JobStatusResponse {
  jobId: string;
  problemId: string;
  mode: JobMode;
  status: JobStatus;
  progress: number;
  submittedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  runs: SolverRunResponse[];
}

export interface SerializedCanvasPayload {
  inputType: "gui";
  payload: {
    nodes: Array<{ id: string; label: string; x: number; y: number }>;
    edges: Array<{ sourceId: string; targetId: string }>;
    startNodeId: string | null;
    returnToStart: boolean;
    objective: ProblemObjective;
  };
}
