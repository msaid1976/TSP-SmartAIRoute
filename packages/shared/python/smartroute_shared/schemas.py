from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ProblemType = Literal["tsp", "atsp", "weighted_tsp", "matrix_tsp", "open_tsp"]
ProblemObjective = Literal["min_distance", "min_cost", "min_time"]
ProblemInputType = Literal["text", "table", "matrix", "gui", "map", "image"]
SolverName = Literal["ortools", "ga", "aco", "sa", "pso", "nsga2", "tabu", "de"]
JobMode = Literal["quick", "compare", "goal"]
JobStatus = Literal["queued", "running", "completed", "failed", "timeout"]
SolverRunStatus = Literal["queued", "running", "completed", "failed", "timeout"]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    db: Literal["connected"]
    version: str


class PingResponse(BaseModel):
    status: Literal["ok"]
    message: Literal["pong"]


class ProblemNode(BaseModel):
    id: str
    label: str
    x: float | None
    y: float | None


class ParseResult(BaseModel):
    inputType: ProblemInputType
    name: str | None = None
    problemType: ProblemType | None = None
    nodes: list[ProblemNode] = Field(default_factory=list)
    distanceMatrix: list[list[float]] | None = None
    startNodeId: str | None = None
    returnToStart: bool = True
    objective: ProblemObjective = "min_distance"
    secondaryObjectives: list[ProblemObjective] = Field(default_factory=list)
    constraints: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class CanonicalProblem(BaseModel):
    problemId: UUID
    problemType: ProblemType
    name: str | None = None
    nodes: list[ProblemNode]
    distanceMatrix: list[list[float]] | None
    startNodeId: str
    returnToStart: bool
    objective: ProblemObjective
    secondaryObjectives: list[ProblemObjective] = Field(default_factory=list)
    constraints: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProblemInputRequest(BaseModel):
    inputType: ProblemInputType
    payload: Any
    name: str | None = None
    labels: list[str] | None = None
    returnToStart: bool = True
    objective: ProblemObjective = "min_distance"


class ProblemPreviewResponse(BaseModel):
    problem: CanonicalProblem
    warnings: list[str] = Field(default_factory=list)


class ProblemDistanceMatrixResponse(BaseModel):
    problemId: UUID
    distanceMatrix: list[list[float]]


class SolverResult(BaseModel):
    solver: SolverName
    status: Literal["completed"]
    route: list[str]
    totalDistance: float
    totalCost: float
    runtimeMs: int
    iterations: int
    convergence: list[float] = Field(default_factory=list)
    seed: int | None = None
    solverParams: dict[str, Any] = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


class ParetoFrontPoint(BaseModel):
    route: list[str]
    distance: float
    maxEdge: float


class CreateJobRequest(BaseModel):
    problemId: UUID
    solvers: list[SolverName] = Field(min_length=1)
    mode: JobMode = "quick"
    goalObjective: ProblemObjective | None = None
    seed: int | None = None


class CreateJobResponse(BaseModel):
    jobId: UUID
    status: JobStatus


class SolverRunResponse(BaseModel):
    id: UUID
    jobId: UUID
    solverName: SolverName
    runIndex: int
    seed: int | None = None
    status: SolverRunStatus
    totalDistance: float | None = None
    runtimeMs: int | None = None
    route: list[str] | None = None
    convergence: list[float] = Field(default_factory=list)
    createdAt: str


class JobStatusResponse(BaseModel):
    jobId: UUID
    problemId: UUID
    mode: JobMode
    status: JobStatus
    progress: float
    submittedAt: str
    startedAt: str | None = None
    completedAt: str | None = None
    failureReason: str | None = None
    runs: list[SolverRunResponse] = Field(default_factory=list)


class SolverAggregate(BaseModel):
    solver: SolverName
    nRuns: int
    successfulRuns: int
    avgDistance: float
    bestDistance: float
    worstDistance: float
    stdDev: float
    avgRuntimeMs: float
    bestRuntimeMs: int
    stabilityScore: float
    feasibilityRate: float
    qualityScore: float
    runtimeScore: float
    scalabilityScore: float
    constraintFit: float
    finalScore: float


class ComparisonRankingEntry(BaseModel):
    solver: SolverName
    score: float
    totalDistance: float
    runtimeMs: float


class ComparisonSummaryCards(BaseModel):
    bestDistanceSolver: SolverName
    fastestSolver: SolverName
    mostStableSolver: SolverName
    recommendedSolver: SolverName


class ComparisonResult(BaseModel):
    comparisonId: UUID
    problemId: UUID
    jobId: UUID
    recommendedSolver: SolverName
    recommendationReason: str
    tradeOffText: str | None = None
    ranking: list[ComparisonRankingEntry] = Field(default_factory=list)
    aggregates: list[SolverAggregate] = Field(default_factory=list)
    summaryCards: ComparisonSummaryCards
    runs: list[SolverResult] = Field(default_factory=list)
    createdAt: str
