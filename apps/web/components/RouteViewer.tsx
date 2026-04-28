"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  CanonicalProblem,
  ComparisonResult,
  ProblemNode,
  SolverName,
  SolverResult,
} from "@smartroute/shared";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatSolverLabel } from "@/lib/solver-display";

type PositionedNode = ProblemNode & {
  renderX: number;
  renderY: number;
};

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 420;

export function RouteViewer({
  comparison,
  problem,
}: {
  comparison: ComparisonResult;
  problem: CanonicalProblem;
}): JSX.Element {
  const solverRuns = useMemo(() => bestRunsBySolver(comparison.runs), [comparison.runs]);
  const solverTabs = useMemo(() => Object.keys(solverRuns) as SolverName[], [solverRuns]);
  const [selectedSolver, setSelectedSolver] = useState(comparison.recommendedSolver);

  useEffect(() => {
    if (!(selectedSolver in solverRuns)) {
      setSelectedSolver(comparison.recommendedSolver);
    }
  }, [comparison.recommendedSolver, selectedSolver, solverRuns]);

  const currentRun = solverRuns[selectedSolver] ?? solverRuns[solverTabs[0] ?? ""];
  const positionedNodes = useMemo(() => projectNodes(problem.nodes), [problem.nodes]);
  const nodeIndex = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes],
  );
  const segments = useMemo(() => {
    if (!currentRun) {
      return [];
    }
    return currentRun.route.flatMap((nodeId, index, route) => {
      if (index === route.length - 1) {
        return [];
      }
      const source = nodeIndex.get(nodeId);
      const target = nodeIndex.get(route[index + 1]);
      if (!source || !target) {
        return [];
      }
      return [{ source, target }];
    });
  }, [currentRun, nodeIndex]);

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Route Viewer</CardTitle>
          <CardDescription>
            Inspect the best route found for each solver and compare how the path changes.
          </CardDescription>
        </div>
        {currentRun ? (
          <div className="flex flex-wrap gap-2">
            <MetricPill label="Distance" value={`${currentRun.totalDistance.toFixed(1)} units`} />
            <MetricPill label="Runtime" value={`${currentRun.runtimeMs} ms`} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {solverTabs.map((solver) => (
          <button
            key={solver}
            type="button"
            onClick={() => setSelectedSolver(solver)}
            className={[
              "rounded-full border px-4 py-2 text-sm transition",
              solver === selectedSolver
                ? "border-blue-400 bg-blue-500/20 text-blue-100"
                : "border-border bg-slate-900/70 text-slate-300 hover:border-blue-400/50 hover:text-white",
            ].join(" ")}
          >
            {formatSolverLabel(solver)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-[#0F172A]/90 p-4">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="h-[420px] w-full transition-all duration-500"
          role="img"
          aria-label="Route viewer"
        >
          <defs>
            <linearGradient id="route-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          {segments.map((segment, index) => (
            <line
              key={`${segment.source.id}-${segment.target.id}-${index}`}
              x1={segment.source.renderX}
              y1={segment.source.renderY}
              x2={segment.target.renderX}
              y2={segment.target.renderY}
              stroke="url(#route-gradient)"
              strokeWidth={4}
              strokeLinecap="round"
              className="transition-all duration-500"
              opacity={0.9}
            />
          ))}
          {positionedNodes.map((node) => (
            <g key={node.id} className="transition-all duration-500">
              <circle
                cx={node.renderX}
                cy={node.renderY}
                r={node.id === problem.startNodeId ? 18 : 14}
                fill={node.id === problem.startNodeId ? "#3B82F6" : "#1E293B"}
                stroke="#E2E8F0"
                strokeWidth={node.id === problem.startNodeId ? 3 : 2}
              />
              <text
                x={node.renderX}
                y={node.renderY + 4}
                textAnchor="middle"
                className="fill-white font-mono text-xs"
              >
                {node.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {currentRun ? (
        <div className="rounded-[1.5rem] border border-border bg-[#132033]/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Route Sequence</p>
          <p className="mt-3 font-mono text-sm text-slate-100">
            {currentRun.route.join(" -> ")}
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function MetricPill({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-100">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

function bestRunsBySolver(runs: ComparisonResult["runs"]): Partial<Record<SolverName, SolverResult>> {
  return runs.reduce<Partial<Record<SolverName, SolverResult>>>((accumulator, run) => {
    const current = accumulator[run.solver];
    if (!current || run.totalDistance < current.totalDistance) {
      accumulator[run.solver] = run;
    }
    return accumulator;
  }, {});
}

function projectNodes(nodes: ProblemNode[]): PositionedNode[] {
  const nodesHaveCoordinates = nodes.every(
    (node) => typeof node.x === "number" && typeof node.y === "number",
  );

  if (!nodesHaveCoordinates) {
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    const radius = Math.min(centerX, centerY) - 56;
    return nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length);
      return {
        ...node,
        renderX: centerX + Math.cos(angle) * radius,
        renderY: centerY + Math.sin(angle) * radius,
      };
    });
  }

  const xValues = nodes.map((node) => node.x as number);
  const yValues = nodes.map((node) => node.y as number);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return nodes.map((node) => ({
    ...node,
    renderX: normalizeRange(node.x as number, minX, maxX, 70, VIEWBOX_WIDTH - 70),
    renderY: normalizeRange(node.y as number, minY, maxY, 60, VIEWBOX_HEIGHT - 60),
  }));
}

function normalizeRange(
  value: number,
  min: number,
  max: number,
  outMin: number,
  outMax: number,
): number {
  if (Math.abs(max - min) < 1e-9) {
    return (outMin + outMax) / 2;
  }
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}
