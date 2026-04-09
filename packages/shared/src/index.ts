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
