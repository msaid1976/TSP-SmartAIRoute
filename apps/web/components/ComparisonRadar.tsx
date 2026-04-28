"use client";

import type { ComparisonResult } from "@smartroute/shared";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSolverDisplay } from "@/lib/solver-display";

const RADAR_KEYS = [
  { key: "qualityScore", label: "Quality" },
  { key: "runtimeScore", label: "Runtime" },
  { key: "stabilityScore", label: "Stability" },
  { key: "scalabilityScore", label: "Scalability" },
  { key: "constraintFit", label: "Constraint Fit" },
] as const;

const RADAR_COLORS = ["#3B82F6", "#F97316", "#A78BFA", "#22C55E", "#EAB308", "#F43F5E", "#14B8A6", "#60A5FA"];

export function ComparisonRadar({
  comparison,
}: {
  comparison: ComparisonResult;
}): JSX.Element {
  const data = RADAR_KEYS.map(({ key, label }) => {
    const row: Record<string, number | string> = { metric: label };
    comparison.aggregates.forEach((aggregate) => {
      row[aggregate.solver] = aggregate[key];
    });
    return row;
  });

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle>Score Radar</CardTitle>
        <CardDescription>
          Five axes show how each solver balances quality, runtime, stability, scalability, and constraint fit.
        </CardDescription>
      </div>
      <div className="h-[360px] rounded-[1.5rem] border border-border bg-[#0F172A]/90 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(148,163,184,0.18)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
            />
            <Legend />
            {comparison.aggregates.map((aggregate, index) => (
              <Radar
                key={aggregate.solver}
                name={getSolverDisplay(aggregate.solver).abbreviation}
                dataKey={aggregate.solver}
                stroke={RADAR_COLORS[index % RADAR_COLORS.length]}
                fill={RADAR_COLORS[index % RADAR_COLORS.length]}
                fillOpacity={0.12}
                isAnimationActive
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
