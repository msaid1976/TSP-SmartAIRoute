from __future__ import annotations

from typing import Literal

from pydantic import BaseModel
from smartroute_shared.schemas import (
    ComparisonRankingEntry,
    ComparisonSummaryCards,
    SolverAggregate,
)


SCALABILITY_SCORES = {
    "ortools": 0.3,
    "ga": 0.7,
    "aco": 0.8,
    "sa": 0.6,
    "pso": 0.6,
    "nsga2": 0.5,
    "tabu": 0.7,
    "de": 0.65,
}

ScoreKey = Literal["qualityScore", "runtimeScore", "stabilityScore", "scalabilityScore", "constraintFit"]


class RecommendationOutcome(BaseModel):
    aggregates: list[SolverAggregate]
    ranking: list[ComparisonRankingEntry]
    recommendedSolver: str
    recommendationReason: str
    tradeOffText: str | None
    summaryCards: ComparisonSummaryCards


def apply_recommendation(
    aggregates: list[SolverAggregate],
) -> RecommendationOutcome:
    if not aggregates:
        raise ValueError("Cannot recommend a solver without aggregate benchmark data.")

    best_distance = min(aggregate.avgDistance for aggregate in aggregates)
    worst_distance = max(aggregate.avgDistance for aggregate in aggregates)
    best_runtime = min(aggregate.avgRuntimeMs for aggregate in aggregates)
    worst_runtime = max(aggregate.avgRuntimeMs for aggregate in aggregates)

    scored_aggregates: list[SolverAggregate] = []
    for aggregate in aggregates:
        quality_score = _inverse_normalize(aggregate.avgDistance, best_distance, worst_distance)
        runtime_score = _inverse_normalize(aggregate.avgRuntimeMs, best_runtime, worst_runtime)
        scalability_score = SCALABILITY_SCORES.get(aggregate.solver, 0.5)
        constraint_fit = 1.0 if aggregate.feasibilityRate >= 1.0 else 0.7
        final_score = _clamp(
            (0.40 * quality_score)
            + (0.20 * runtime_score)
            + (0.15 * aggregate.stabilityScore)
            + (0.15 * scalability_score)
            + (0.10 * constraint_fit),
        )
        scored_aggregates.append(
            aggregate.model_copy(
                update={
                    "qualityScore": quality_score,
                    "runtimeScore": runtime_score,
                    "scalabilityScore": scalability_score,
                    "constraintFit": constraint_fit,
                    "finalScore": final_score,
                },
            ),
        )

    ranking = sorted(
        [
            ComparisonRankingEntry(
                solver=aggregate.solver,
                score=aggregate.finalScore,
                totalDistance=aggregate.avgDistance,
                runtimeMs=aggregate.avgRuntimeMs,
            )
            for aggregate in scored_aggregates
        ],
        key=lambda entry: entry.score,
        reverse=True,
    )
    ranked_aggregates = sorted(scored_aggregates, key=lambda aggregate: aggregate.finalScore, reverse=True)
    winner = ranked_aggregates[0]
    runner_up = ranked_aggregates[1] if len(ranked_aggregates) > 1 else None

    stability_note = (
        "Variance was low - a reliable choice."
        if winner.stabilityScore > 0.9
        else "Some route variance observed across runs."
    )
    explanation = (
        f"{winner.solver} achieved the best overall score ({winner.finalScore:.2f}/1.00). "
        f"Average route distance: {winner.avgDistance:.1f} units in {winner.avgRuntimeMs:.0f}ms "
        f"across {winner.nRuns} run(s). {stability_note}"
    )

    summary_cards = ComparisonSummaryCards(
        bestDistanceSolver=min(scored_aggregates, key=lambda aggregate: aggregate.bestDistance).solver,
        fastestSolver=min(scored_aggregates, key=lambda aggregate: aggregate.avgRuntimeMs).solver,
        mostStableSolver=max(scored_aggregates, key=lambda aggregate: aggregate.stabilityScore).solver,
        recommendedSolver=winner.solver,
    )

    return RecommendationOutcome(
        aggregates=ranked_aggregates,
        ranking=ranking,
        recommendedSolver=winner.solver,
        recommendationReason=explanation,
        tradeOffText=_build_trade_off_text(winner, runner_up),
        summaryCards=summary_cards,
    )


def _inverse_normalize(value: float, best: float, worst: float) -> float:
    if abs(worst - best) < 1e-9:
        return 1.0
    return _clamp((worst - value) / (worst - best))


def _build_trade_off_text(winner: SolverAggregate, runner_up: SolverAggregate | None) -> str | None:
    if runner_up is None:
        return None

    priorities: list[tuple[ScoreKey, float]] = [
        ("qualityScore", runner_up.qualityScore - winner.qualityScore),
        ("runtimeScore", runner_up.runtimeScore - winner.runtimeScore),
        ("stabilityScore", runner_up.stabilityScore - winner.stabilityScore),
        ("scalabilityScore", runner_up.scalabilityScore - winner.scalabilityScore),
        ("constraintFit", runner_up.constraintFit - winner.constraintFit),
    ]
    best_priority = max(priorities, key=lambda item: item[1])
    if best_priority[1] <= 0:
        return None

    priority_key = best_priority[0]
    priority_label, second_metric, winner_metric = _describe_priority(priority_key, runner_up, winner)
    return (
        f"If {priority_label} matters more than overall balance, consider {runner_up.solver} "
        f"({second_metric} vs winner's {winner_metric})."
    )


def _describe_priority(
    priority: ScoreKey,
    candidate: SolverAggregate,
    winner: SolverAggregate,
) -> tuple[str, str, str]:
    if priority == "qualityScore":
        return (
            "route quality",
            f"{candidate.avgDistance:.1f} units",
            f"{winner.avgDistance:.1f} units",
        )
    if priority == "runtimeScore":
        return (
            "runtime",
            f"{candidate.avgRuntimeMs:.0f}ms",
            f"{winner.avgRuntimeMs:.0f}ms",
        )
    if priority == "stabilityScore":
        return (
            "stability",
            f"{candidate.stabilityScore:.2f}",
            f"{winner.stabilityScore:.2f}",
        )
    if priority == "scalabilityScore":
        return (
            "future scale",
            f"{candidate.scalabilityScore:.2f}",
            f"{winner.scalabilityScore:.2f}",
        )
    return (
        "constraint handling",
        f"{candidate.constraintFit:.2f}",
        f"{winner.constraintFit:.2f}",
    )


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))
