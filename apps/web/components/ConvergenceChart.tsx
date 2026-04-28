"use client";

import type { ComparisonResult, SolverName } from "@smartroute/shared";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSolverDisplay } from "@/lib/solver-display";

const LINE_COLORS: Record<string, string> = {
  ortools: "#38BDF8",
  ga: "#F97316",
  aco: "#A78BFA",
  sa: "#22C55E",
  pso: "#EAB308",
  nsga2: "#F43F5E",
  tabu: "#14B8A6",
  de: "#60A5FA",
};

export function ConvergenceChart({
  comparison,
}: {
  comparison: ComparisonResult;
}): JSX.Element {
  const bestRuns = comparison.runs.reduce<
    Partial<Record<SolverName, ComparisonResult["runs"][number]>>
  >(
    (accumulator, run) => {
      const current = accumulator[run.solver];
      if (!current || run.totalDistance < current.totalDistance) {
        accumulator[run.solver] = run;
      }
      return accumulator;
    },
    {},
  );

  const maxLength = Math.max(...Object.values(bestRuns).map((run) => run.convergence.length), 0);
  const data = Array.from({ length: maxLength }, (_, index) => {
    const row: Record<string, number | string> = { iteration: index + 1 };
    Object.values(bestRuns).forEach((run) => {
      row[run.solver] = run.convergence[index] ?? run.convergence[run.convergence.length - 1] ?? 0;
    });
    return row;
  });

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle>Convergence Chart</CardTitle>
        <CardDescription>
          One line per solver showing best-so-far distance across iterations or checkpoints.
        </CardDescription>
      </div>

      <div className="h-[340px] rounded-[1.5rem] border border-border bg-[#0F172A]/90 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" />
            <XAxis
              dataKey="iteration"
              stroke="#94A3B8"
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
              label={{ value: "Iteration", position: "insideBottom", offset: -2, fill: "#CBD5E1" }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
              label={{ value: "Distance", angle: -90, position: "insideLeft", fill: "#CBD5E1" }}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: "16px",
                color: "#E2E8F0",
              }}
            />
            <Legend />
            {(Object.keys(bestRuns) as SolverName[]).map((solver) => (
              <Line
                key={solver}
                type="monotone"
                dataKey={solver}
                name={getSolverDisplay(solver).abbreviation}
                stroke={LINE_COLORS[solver]}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
