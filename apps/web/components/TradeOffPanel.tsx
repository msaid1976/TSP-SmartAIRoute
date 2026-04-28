"use client";

import type { ComparisonRankingEntry } from "@smartroute/shared";

import { Card } from "@/components/ui/card";
import { formatSolverLabel } from "@/lib/solver-display";

export function TradeOffPanel({
  secondBest,
  tradeOffText,
}: {
  secondBest: ComparisonRankingEntry | null;
  tradeOffText: string | null;
}): JSX.Element | null {
  if (secondBest === null) {
    return null;
  }

  return (
    <Card className="space-y-4 bg-[#1E2A3A]/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trade-Off</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {formatSolverLabel(secondBest.solver)}
          </h3>
        </div>
        <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 font-mono text-sm text-blue-100">
          {secondBest.score.toFixed(2)} / 1.00
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-200">
        {tradeOffText ??
          `${formatSolverLabel(secondBest.solver)} ranked second overall. Consider it when its strongest sub-metric matters more than total balance.`}
      </p>
    </Card>
  );
}
