"""create jobs and solver_runs tables

Revision ID: 20260409_1300
Revises: 20260409_1200
Create Date: 2026-04-09 13:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260409_1300"
down_revision: str | None = "20260409_1200"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("mode", sa.String(length=16), nullable=False),
        sa.Column("goal_objective", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "solver_runs",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("solver_name", sa.String(length=32), nullable=False),
        sa.Column("run_index", sa.Integer(), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("total_distance", sa.Float(), nullable=True),
        sa.Column("runtime_ms", sa.Integer(), nullable=True),
        sa.Column("route_json", sa.JSON(), nullable=True),
        sa.Column("convergence_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", "solver_name", "run_index", name="uq_solver_runs_job_solver_index"),
    )


def downgrade() -> None:
    op.drop_table("solver_runs")
    op.drop_table("jobs")
