from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ProblemType = Literal["tsp", "atsp", "weighted_tsp", "matrix_tsp", "open_tsp"]
ProblemObjective = Literal["min_distance", "min_cost", "min_time"]
ProblemInputType = Literal["text", "table", "matrix", "gui", "map", "image"]


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
