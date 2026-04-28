"use client";

import { useMemo, useState } from "react";

import type { ComparisonRankingEntry } from "@smartroute/shared";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatSolverLabel } from "@/lib/solver-display";

type SortKey = "score" | "distance" | "runtime";

type SolverRankingTableProps = {
  entries: ComparisonRankingEntry[];
};

export function SolverRankingTable({ entries }: SolverRankingTableProps): JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const sortedEntries = useMemo(() => {
    const items = [...entries];
    items.sort((left, right) => {
      if (sortKey === "distance") {
        return left.totalDistance - right.totalDistance;
      }
      if (sortKey === "runtime") {
        return left.runtimeMs - right.runtimeMs;
      }
      return right.score - left.score;
    });
    return items;
  }, [entries, sortKey]);

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <CardTitle>Solver Ranking</CardTitle>
          <CardDescription>
            Sort the benchmark table by overall score, route distance, or runtime.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["score", "distance", "runtime"] as SortKey[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSortKey(option)}
              className={[
                "rounded-full border px-4 py-2 text-sm transition",
                sortKey === option
                  ? "border-blue-400 bg-blue-500/20 text-blue-100"
                  : "border-border bg-slate-900/70 text-slate-300 hover:border-blue-400/50 hover:text-white",
              ].join(" ")}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[1.5rem] border border-border bg-slate-950/70">
        <table className="min-w-full border-collapse text-left text-sm text-slate-200">
          <thead className="border-b border-border bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Solver</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Total Distance</th>
              <th className="px-4 py-3">Avg Runtime</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <tr key={entry.solver} className="border-b border-border/70 last:border-b-0">
                <td className="px-4 py-3 font-medium text-white">{formatSolverLabel(entry.solver)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 font-mono text-blue-100">
                    {entry.score.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{entry.totalDistance.toFixed(1)}</td>
                <td className="px-4 py-3 font-mono">{entry.runtimeMs.toFixed(0)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const SORT_LABELS: Record<SortKey, string> = {
  score: "Score",
  distance: "Distance",
  runtime: "Runtime",
};
