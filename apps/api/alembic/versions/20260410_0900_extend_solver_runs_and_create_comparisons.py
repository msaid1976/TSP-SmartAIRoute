"""extend solver_runs and create comparisons table

Revision ID: 20260410_0900
Revises: 20260409_1300
Create Date: 2026-04-10 09:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260410_0900"
down_revision: str | None = "20260409_1300"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("solver_runs", sa.Column("total_cost", sa.Float(), nullable=True))
    op.add_column("solver_runs", sa.Column("iterations", sa.Integer(), nullable=True))
    op.add_column("solver_runs", sa.Column("solver_params_json", sa.JSON(), nullable=True))
    op.add_column("solver_runs", sa.Column("notes_json", sa.JSON(), nullable=True))

    op.execute("UPDATE solver_runs SET solver_params_json = '{}' WHERE solver_params_json IS NULL")
    op.execute("UPDATE solver_runs SET notes_json = '[]' WHERE notes_json IS NULL")

    op.alter_column("solver_runs", "solver_params_json", nullable=False)
    op.alter_column("solver_runs", "notes_json", nullable=False)

    op.create_table(
        "comparisons",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("recommended_solver", sa.String(length=32), nullable=False),
        sa.Column("ranking_json", sa.JSON(), nullable=False),
        sa.Column("aggregates_json", sa.JSON(), nullable=False),
        sa.Column("summary_cards_json", sa.JSON(), nullable=False),
        sa.Column("runs_json", sa.JSON(), nullable=False),
        sa.Column("explanation_text", sa.String(length=2000), nullable=False),
        sa.Column("trade_off_text", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("comparisons")
    op.drop_column("solver_runs", "notes_json")
    op.drop_column("solver_runs", "solver_params_json")
    op.drop_column("solver_runs", "iterations")
    op.drop_column("solver_runs", "total_cost")
