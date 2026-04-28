"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ComparisonRankingEntry, ComparisonResult, ParetoFrontPoint } from "@smartroute/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ComparisonBarChart } from "@/components/ComparisonBarChart";
import { ComparisonRadar } from "@/components/ComparisonRadar";
import { ConvergenceChart } from "@/components/ConvergenceChart";
import { ErrorState, PanelSkeleton } from "@/components/FetchState";
import { ParetoFrontChart } from "@/components/ParetoFrontChart";
import { RecommendationCard } from "@/components/RecommendationCard";
import { RouteViewer } from "@/components/RouteViewer";
import { SolverRankingTable } from "@/components/SolverRankingTable";
import { SolverSummaryCards } from "@/components/SolverSummaryCards";
import { TradeOffPanel } from "@/components/TradeOffPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { createComparison, fetchComparison, fetchProblem } from "@/lib/api-client";

type LoadState = "loading" | "ready" | "error";

export default function ComparePage({
  params,
}: {
  params: { problemId: string };
}): JSX.Element {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const goal = searchParams.get("goal");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [problem, setProblem] = useState<Awaited<ReturnType<typeof fetchProblem>> | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadComparison = useCallback(async (): Promise<void> => {
    setState("loading");
    setError(null);

    try {
      const problemPromise = fetchProblem(params.problemId);
      let comparisonPayload: ComparisonResult;

      try {
        comparisonPayload = await fetchComparison(params.problemId);
      } catch (comparisonError) {
        const message =
          comparisonError instanceof Error ? comparisonError.message : "Unknown comparison error.";
        if (!message.includes("404")) {
          throw comparisonError;
        }
        comparisonPayload = await createComparison(params.problemId);
      }

      const problemPayload = await problemPromise;
      setProblem(problemPayload);
      setComparison(comparisonPayload);
      setState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load comparison.");
      setState("error");
    }
  }, [params.problemId]);

  useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  const paretoFront = useMemo(() => {
    if (!comparison) {
      return [];
    }
    const nsgaRun = comparison.runs.find((run) => run.solver === "nsga2");
    return parseParetoFront(nsgaRun?.solverParams.paretoFront);
  }, [comparison]);

  const secondBest = useMemo<ComparisonRankingEntry | null>(() => {
    if (!comparison || comparison.ranking.length < 2) {
      return null;
    }
    return comparison.ranking[1] ?? null;
  }, [comparison]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-8 px-6 py-14">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <Badge>Comparison Dashboard</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Compare route quality, runtime, stability, and recommendation output in one place.
          </h1>
          <p className="max-w-4xl text-lg text-slate-300">
            This dashboard combines benchmark results across all solvers with route visualization, convergence behavior, and recommendation scoring.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/problems/${params.problemId}`}
            className="rounded-full border border-border bg-[#0F172A]/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
          >
            Problem detail
          </Link>
          <Link
            href="/new-problem"
            className="rounded-full border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/25"
          >
            New problem
          </Link>
        </div>
      </section>

      {focus || goal ? (
        <Card className="bg-[#1E2A3A]/82">
          <div className="flex flex-wrap gap-3">
            {focus ? <Badge>Focused solvers: {focus}</Badge> : null}
            {goal ? <Badge>Goal lens: {goal.replaceAll("_", " ")}</Badge> : null}
          </div>
          <p className="mt-4 text-sm text-slate-300">
            The benchmark still runs the full solver set so recommendation and summary cards stay comparable across sessions.
          </p>
        </Card>
      ) : null}

      {state === "loading" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <PanelSkeleton key={index} blocks={1} className="bg-[#1E2A3A]/82" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <PanelSkeleton blocks={4} className="bg-[#1E2A3A]/82" />
            <PanelSkeleton blocks={4} className="bg-[#1E2A3A]/82" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <PanelSkeleton blocks={4} className="bg-[#1E2A3A]/82" />
            <PanelSkeleton blocks={4} className="bg-[#1E2A3A]/82" />
          </div>
          <PanelSkeleton blocks={5} className="bg-[#1E2A3A]/82" />
        </>
      ) : null}

      {state === "error" && error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void loadComparison();
          }}
        />
      ) : null}

      {state === "ready" && comparison && problem ? (
        <>
          <SolverSummaryCards comparison={comparison} />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <RouteViewer comparison={comparison} problem={problem} />

            <div className="space-y-6">
              <RecommendationCard comparison={comparison} />
              <TradeOffPanel secondBest={secondBest} tradeOffText={comparison.tradeOffText} />
              <ComparisonContext problemName={problem.name} createdAt={comparison.createdAt} />
            </div>
          </section>

          <ConvergenceChart comparison={comparison} />

          <section className="grid gap-6 xl:grid-cols-2">
            <ComparisonBarChart comparison={comparison} />
            <ComparisonRadar comparison={comparison} />
          </section>

          <SolverRankingTable entries={comparison.ranking} />

          {paretoFront.length > 0 ? <ParetoFrontChart points={paretoFront} /> : null}
        </>
      ) : null}
    </main>
  );
}

function ComparisonContext({
  problemName,
  createdAt,
}: {
  problemName: string | null;
  createdAt: string;
}): JSX.Element {
  return (
    <Card className="space-y-3 bg-[#1E2A3A]/82">
      <CardTitle className="text-xl">Benchmark context</CardTitle>
      <CardDescription>
        Results shown here belong to {problemName ?? "this problem"} and were generated at {createdAt}.
      </CardDescription>
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
