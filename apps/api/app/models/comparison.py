from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ComparisonRecord(Base):
    __tablename__ = "comparisons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    problem_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    recommended_solver: Mapped[str] = mapped_column(String(32), nullable=False)
    ranking_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    aggregates_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    summary_cards_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    runs_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    explanation_text: Mapped[str] = mapped_column(String(2000), nullable=False)
    trade_off_text: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
