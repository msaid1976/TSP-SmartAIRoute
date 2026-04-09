"use client";

import type { ComparisonResult, SolverAggregate } from "@smartroute/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatSolverLabel } from "@/lib/solver-display";

type RecommendationCardProps = {
  comparison: ComparisonResult;
};

export function RecommendationCard({ comparison }: RecommendationCardProps): JSX.Element {
  const winner = comparison.aggregates.find(
    (aggregate) => aggregate.solver === comparison.recommendedSolver,
  );

  return (
    <Card className="space-y-5 border-blue-400/30 bg-blue-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge>Recommendation</Badge>
          <CardTitle className="text-3xl text-white">
            {formatSolverLabel(comparison.recommendedSolver)}
          </CardTitle>
          <CardDescription className="max-w-3xl text-base text-slate-200">
            {comparison.recommendationReason}
          </CardDescription>
        </div>
        {winner ? (
          <div className="rounded-[1.5rem] border border-blue-400/30 bg-slate-950/70 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Score</p>
            <p className="mt-2 font-mono text-3xl text-blue-100">{winner.finalScore.toFixed(2)}</p>
          </div>
        ) : null}
      </div>

      {winner ? <MetricGrid winner={winner} /> : null}

      {comparison.tradeOffText ? (
        <div className="rounded-[1.5rem] border border-slate-700/80 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Trade-off</p>
          <p className="mt-2 text-sm text-slate-200">{comparison.tradeOffText}</p>
        </div>
      ) : null}
    </Card>
  );
}

function MetricGrid({ winner }: { winner: SolverAggregate }): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Metric label="Avg Distance" value={`${winner.avgDistance.toFixed(1)} units`} />
      <Metric label="Avg Runtime" value={`${winner.avgRuntimeMs.toFixed(0)} ms`} />
      <Metric label="Stability" value={winner.stabilityScore.toFixed(2)} />
      <Metric label="Feasibility" value={`${(winner.feasibilityRate * 100).toFixed(0)}%`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-[1.25rem] border border-border bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-base text-slate-100">{value}</p>
    </div>
  );
}
