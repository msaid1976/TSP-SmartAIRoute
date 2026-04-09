"use client";

import { useEffect, useMemo, useState } from "react";

import type { ComparisonResult, ParetoFrontPoint } from "@smartroute/shared";
import Link from "next/link";

import { ParetoFrontChart } from "@/components/ParetoFrontChart";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SolverRankingTable } from "@/components/SolverRankingTable";
import { Card } from "@/components/ui/card";
import { formatSolverLabel } from "@/lib/solver-display";

export default function ComparisonPage({
  params,
}: {
  params: { problemId: string };
}): JSX.Element {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadComparison(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const existingResponse = await fetch(`${apiBaseUrl}/api/comparisons/${params.problemId}`, {
          cache: "no-store",
        });
        if (existingResponse.ok) {
          const payload = (await existingResponse.json()) as ComparisonResult;
          if (isActive) {
            setComparison(payload);
          }
          return;
        }
        if (existingResponse.status !== 404) {
          throw new Error(await existingResponse.text());
        }

        const createResponse = await fetch(`${apiBaseUrl}/api/comparisons/${params.problemId}`, {
          method: "POST",
          cache: "no-store",
        });
        if (!createResponse.ok) {
          throw new Error(await createResponse.text());
        }
        const payload = (await createResponse.json()) as ComparisonResult;
        if (isActive) {
          setComparison(payload);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Unknown comparison error.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadComparison();
    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, params.problemId]);

  const paretoFront = useMemo(() => {
    if (!comparison) {
      return [];
    }
    const nsgaRun = comparison.runs.find((run) => run.solver === "nsga2");
    return parseParetoFront(nsgaRun?.solverParams.paretoFront);
  }, [comparison]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-14">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="font-mono text-sm uppercase tracking-[0.28em] text-blue-300">Phase 004</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Benchmark Comparison</h1>
            <p className="max-w-3xl text-slate-300">
              Compare all eight solvers on the same routing problem and review the recommendation engine output.
            </p>
          </div>
          <Link
            href="/new-problem"
            className="rounded-full border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/25"
          >
            Back To Problems
          </Link>
        </div>
      </section>

      {isLoading ? (
        <Card className="text-slate-300">
          Running the full benchmark on problem <span className="font-mono">{params.problemId}</span>.
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-400/30 bg-rose-500/10 text-rose-100">{error}</Card>
      ) : null}

      {comparison ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Best Distance" solver={comparison.summaryCards.bestDistanceSolver} />
            <SummaryCard label="Fastest" solver={comparison.summaryCards.fastestSolver} />
            <SummaryCard label="Most Stable" solver={comparison.summaryCards.mostStableSolver} />
            <SummaryCard label="Recommended" solver={comparison.summaryCards.recommendedSolver} />
          </section>

          <RecommendationCard comparison={comparison} />
          <SolverRankingTable entries={comparison.ranking} />
          {paretoFront.length > 0 ? <ParetoFrontChart points={paretoFront} /> : null}
        </>
      ) : null}
    </main>
  );
}

function SummaryCard({ label, solver }: { label: string; solver: ComparisonResult["recommendedSolver"] }): JSX.Element {
  return (
    <Card className="space-y-2 bg-slate-950/70">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-white">{formatSolverLabel(solver)}</p>
    </Card>
  );
}

function parseParetoFront(value: unknown): ParetoFrontPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "route" in entry &&
      Array.isArray(entry.route) &&
      "distance" in entry &&
      typeof entry.distance === "number" &&
      "maxEdge" in entry &&
      typeof entry.maxEdge === "number"
    ) {
      return [
        {
          route: entry.route as string[],
          distance: entry.distance,
          maxEdge: entry.maxEdge,
        },
      ];
    }
    return [];
  });
}
