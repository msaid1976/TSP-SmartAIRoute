from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    db: Literal["connected"]
    version: str


class PingResponse(BaseModel):
    status: Literal["ok"]
    message: Literal["pong"]
