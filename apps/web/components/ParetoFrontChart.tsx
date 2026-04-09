"use client";

import type { ParetoFrontPoint } from "@smartroute/shared";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ParetoFrontChartProps = {
  points: ParetoFrontPoint[];
};

export function ParetoFrontChart({ points }: ParetoFrontChartProps): JSX.Element {
  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <CardTitle>NSGA-II Pareto Front</CardTitle>
        <CardDescription>
          Distance stays on the x-axis while the maximum single-edge burden stays on the y-axis.
        </CardDescription>
      </div>

      <div className="h-[320px] rounded-[1.5rem] border border-border bg-slate-950/70 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.18)" />
            <XAxis
              type="number"
              dataKey="distance"
              name="Distance"
              stroke="#94A3B8"
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="maxEdge"
              name="Max Edge"
              stroke="#94A3B8"
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "4 4" }}
              contentStyle={{
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: "16px",
                background: "rgba(2,6,23,0.95)",
                color: "#E2E8F0",
              }}
            />
            <Scatter data={points} fill="#3B82F6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
