"use client";

import type { ComparisonResult, SolverAggregate } from "@smartroute/shared";

import { Card } from "@/components/ui/card";
import { formatSolverLabel } from "@/lib/solver-display";

export function SolverSummaryCards({
  comparison,
}: {
  comparison: ComparisonResult;
}): JSX.Element {
  const bestDistance = findAggregate(
    comparison.aggregates,
    comparison.summaryCards.bestDistanceSolver,
  );
  const fastest = findAggregate(comparison.aggregates, comparison.summaryCards.fastestSolver);
  const mostStable = findAggregate(
    comparison.aggregates,
    comparison.summaryCards.mostStableSolver,
  );
  const recommended = findAggregate(
    comparison.aggregates,
    comparison.summaryCards.recommendedSolver,
  );

  return (
    <section className="grid gap-4 xl:grid-cols-4">
      <SummaryCard
        label="Best Distance"
        solver={comparison.summaryCards.bestDistanceSolver}
        value={bestDistance ? `${bestDistance.bestDistance.toFixed(1)} units` : "n/a"}
      />
      <SummaryCard
        label="Fastest"
        solver={comparison.summaryCards.fastestSolver}
        value={fastest ? `${fastest.avgRuntimeMs.toFixed(0)} ms` : "n/a"}
      />
      <SummaryCard
        label="Most Stable"
        solver={comparison.summaryCards.mostStableSolver}
        value={mostStable ? mostStable.stabilityScore.toFixed(2) : "n/a"}
      />
      <SummaryCard
        label="Recommended"
        solver={comparison.summaryCards.recommendedSolver}
        value={recommended ? `${recommended.finalScore.toFixed(2)} / 1.00` : "n/a"}
        highlighted
      />
    </section>
  );
}

function SummaryCard({
  label,
  solver,
  value,
  highlighted = false,
}: {
  label: string;
  solver: ComparisonResult["recommendedSolver"];
  value: string;
  highlighted?: boolean;
}): JSX.Element {
  return (
    <Card
      className={[
        "space-y-3 bg-[#1E2A3A]/85",
        highlighted ? "border-blue-400/40 shadow-[0_0_32px_rgba(59,130,246,0.18)]" : "",
      ].join(" ")}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-white">{formatSolverLabel(solver)}</p>
      <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 font-mono text-sm text-blue-100">
        {value}
      </span>
    </Card>
  );
}

function findAggregate(
  aggregates: ComparisonResult["aggregates"],
  solver: ComparisonResult["recommendedSolver"],
): SolverAggregate | undefined {
  return aggregates.find((aggregate) => aggregate.solver === solver);
}
