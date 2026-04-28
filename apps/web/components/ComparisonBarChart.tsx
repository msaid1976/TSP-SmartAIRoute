"use client";

import type { ComparisonResult } from "@smartroute/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSolverDisplay } from "@/lib/solver-display";

export function ComparisonBarChart({
  comparison,
}: {
  comparison: ComparisonResult;
}): JSX.Element {
  const data = comparison.aggregates.map((aggregate) => ({
    solver: getSolverDisplay(aggregate.solver).abbreviation,
    avgDistance: aggregate.avgDistance,
    avgRuntimeMs: aggregate.avgRuntimeMs,
  }));

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle>Comparison Bars</CardTitle>
        <CardDescription>
          Average route distance and runtime are shown side by side for each solver.
        </CardDescription>
      </div>

      <div className="h-[340px] rounded-[1.5rem] border border-border bg-[#0F172A]/90 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" />
            <XAxis dataKey="solver" stroke="#94A3B8" tick={{ fill: "#CBD5E1", fontSize: 12 }} />
            <YAxis
              yAxisId="distance"
              stroke="#94A3B8"
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
            />
            <YAxis
              yAxisId="runtime"
              orientation="right"
              stroke="#60A5FA"
              tick={{ fill: "#BFDBFE", fontSize: 12 }}
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
            <Bar
              yAxisId="distance"
              dataKey="avgDistance"
              name="Avg Distance"
              fill="#3B82F6"
              radius={[8, 8, 0, 0]}
              isAnimationActive
            />
            <Bar
              yAxisId="runtime"
              dataKey="avgRuntimeMs"
              name="Avg Runtime"
              fill="#38BDF8"
              radius={[8, 8, 0, 0]}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
