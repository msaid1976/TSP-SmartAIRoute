"use client";

import type { CanonicalProblem } from "@smartroute/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

interface ParsedPreviewCardProps {
  problem: CanonicalProblem | null;
  warnings: string[];
  heading: string;
}

export function ParsedPreviewCard({
  problem,
  warnings,
  heading,
}: ParsedPreviewCardProps): JSX.Element {
  return (
    <Card className="h-full space-y-5">
      <div className="space-y-2">
        <Badge>Parsed Preview</Badge>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>
          Normalized nodes, detected problem type, weighted matrix summary, and any warnings from the ingestion pipeline.
        </CardDescription>
      </div>

      {!problem ? (
        <div className="rounded-3xl border border-dashed border-border p-6 text-sm text-slate-400">
          Submit a preview or save request to inspect the normalized canonical problem.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{problem.problemType}</Badge>
            <Badge>{problem.nodes.length} nodes</Badge>
            <Badge>{problem.startNodeId}</Badge>
          </div>

          <div className="rounded-3xl border border-border bg-slate-950/60">
            <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <span>ID</span>
              <span>Label</span>
              <span>x</span>
              <span>y</span>
            </div>
            <div className="divide-y divide-border/80">
              {problem.nodes.map((node) => (
                <div
                  key={node.id}
                  className="grid grid-cols-[1fr_1.5fr_1fr_1fr] gap-3 px-4 py-3 text-sm text-slate-200"
                >
                  <span className="font-mono">{node.id}</span>
                  <span>{node.label}</span>
                  <span className="font-mono">{node.x ?? "null"}</span>
                  <span className="font-mono">{node.y ?? "null"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Weighted Matrix
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {problem.distanceMatrix
                  ? `${problem.distanceMatrix.length} × ${problem.distanceMatrix[0]?.length ?? 0}`
                  : "Computed from coordinates when no matrix is provided"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Input Sources
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {Array.isArray(problem.metadata.inputSources)
                  ? problem.metadata.inputSources.join(", ")
                  : "unknown"}
              </p>
            </div>
          </div>

          {warnings.length > 0 ? (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                Warnings
              </p>
              <ul className="mt-3 space-y-2 text-sm text-amber-100">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
