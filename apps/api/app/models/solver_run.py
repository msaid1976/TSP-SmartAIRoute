from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SolverRunRecord(Base):
    __tablename__ = "solver_runs"
    __table_args__ = (
        UniqueConstraint("job_id", "solver_name", "run_index", name="uq_solver_runs_job_solver_index"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    solver_name: Mapped[str] = mapped_column(String(32), nullable=False)
    run_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    total_distance: Mapped[float | None] = mapped_column(nullable=True)
    total_cost: Mapped[float | None] = mapped_column(nullable=True)
    runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    iterations: Mapped[int | None] = mapped_column(Integer, nullable=True)
    route_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    convergence_json: Mapped[list[float]] = mapped_column(JSON, nullable=False, default=list)
    solver_params_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    notes_json: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    job = relationship("JobRecord", back_populates="solver_runs")
