"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  CanonicalProblem,
  CreateJobRequest,
  JobMode,
  ProblemObjective,
  SolverName,
} from "@smartroute/shared";
import { useRouter } from "next/navigation";

import { ErrorState, PanelSkeleton } from "@/components/FetchState";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { createJob, fetchProblem } from "@/lib/api-client";
import { getSolverDisplay } from "@/lib/solver-display";

type GoalPreset = "shortest_route" | "fastest_solver" | "most_stable" | "compare_all";

const MODE_LABELS: Record<JobMode, string> = {
  compare: "Benchmark Mode",
  goal: "Goal-Driven",
  quick: "Quick Solve",
};

const MODE_OPTIONS: Array<{ mode: JobMode; description: string }> = [
  {
    mode: "quick",
    description: "Run one solver immediately and follow its live job status.",
  },
  {
    mode: "compare",
    description: "Run the full benchmark and recommendation flow across all eight solvers.",
  },
  {
    mode: "goal",
    description: "Start from a user goal, then open the comparison dashboard focused on that priority.",
  },
];

const ALL_SOLVERS: SolverName[] = ["ortools", "ga", "aco", "sa", "pso", "nsga2", "tabu", "de"];

export default function ProblemDetailPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  const router = useRouter();
  const [problem, setProblem] = useState<CanonicalProblem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<JobMode>("quick");
  const [quickSolver, setQuickSolver] = useState<SolverName>("ortools");
  const [benchmarkSolvers, setBenchmarkSolvers] = useState<SolverName[]>(ALL_SOLVERS);
  const [goalPreset, setGoalPreset] = useState<GoalPreset>("compare_all");
  const [isLaunching, setIsLaunching] = useState(false);

  const selectedBenchmarkCount = benchmarkSolvers.length;
  const focusQuery = useMemo(() => benchmarkSolvers.join(","), [benchmarkSolvers]);

  useEffect(() => {
    let isActive = true;

    async function loadProblem(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await fetchProblem(params.id);
        if (!isActive) {
          return;
        }
        setProblem(payload);
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load problem.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProblem();
    return () => {
      isActive = false;
    };
  }, [params.id]);

  async function handleRun(): Promise<void> {
    if (!problem) {
      return;
    }

    setIsLaunching(true);
    setError(null);

    try {
      if (mode === "quick") {
        const request: CreateJobRequest = {
          problemId: problem.problemId,
          solvers: [quickSolver],
          mode: "quick",
        };
        const job = await createJob(request);
        router.push(`/jobs/${job.jobId}`);
        return;
      }

      const query = new URLSearchParams();

      if (mode === "compare") {
        if (focusQuery) {
          query.set("focus", focusQuery);
        }
      }

      if (mode === "goal") {
        query.set("goal", goalPreset);
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      router.push(`/compare/${problem.problemId}${suffix}`);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Unable to launch optimization.");
    } finally {
      setIsLaunching(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-6 py-14">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <Badge>Problem Detail</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Review the normalized problem, choose a solving mode, and launch optimization.
          </h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Quick Solve sends a single solver job. Benchmark Mode and Goal-Driven open the comparison dashboard so ranking and recommendation stay consistent with the Phase 004 engine.
          </p>
        </div>
      </section>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            window.location.reload();
          }}
        />
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        {isLoading ? (
          <>
            <PanelSkeleton blocks={5} className="bg-[#1E2A3A]/82" />
            <PanelSkeleton blocks={4} className="bg-[#1E2A3A]/82" />
          </>
        ) : problem ? (
          <>
            <ProblemOverview problem={problem} />

            <Card className="space-y-6 bg-[#1E2A3A]/82">
              <div className="space-y-3">
                <Badge>{MODE_LABELS[mode]}</Badge>
                <CardTitle className="text-2xl">Mode and solver selection</CardTitle>
                <CardDescription>
                  Choose the route analysis path that best fits how much detail you want now.
                </CardDescription>
              </div>

              <div className="grid gap-3">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => setMode(option.mode)}
                    className={[
                      "rounded-[1.5rem] border p-4 text-left transition",
                      mode === option.mode
                        ? "border-blue-400 bg-blue-500/15 text-white"
                        : "border-border bg-[#0F172A]/80 text-slate-300 hover:border-blue-400/50 hover:text-white",
                    ].join(" ")}
                  >
                    <p className="text-base font-semibold text-white">{MODE_LABELS[option.mode]}</p>
                    <p className="mt-2 text-sm text-slate-300">{option.description}</p>
                  </button>
                ))}
              </div>

              {mode === "quick" ? (
                <section className="space-y-4 rounded-[1.5rem] border border-border bg-[#0F172A]/80 p-5">
                  <div>
                    <p className="text-sm font-semibold text-white">Quick Solve</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Choose one solver and go directly to the live job status page.
                    </p>
                  </div>
                  <select
                    value={quickSolver}
                    onChange={(event) => setQuickSolver(event.target.value as SolverName)}
                    className="w-full rounded-2xl border border-border bg-[#111A2A] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                  >
                    {ALL_SOLVERS.map((solver) => {
                      const display = getSolverDisplay(solver);
                      return (
                        <option key={solver} value={solver} className="bg-[#0A0F1E]">
                          {display.fullName} ({display.abbreviation})
                        </option>
                      );
                    })}
                  </select>
                </section>
              ) : null}

              {mode === "compare" ? (
                <section className="space-y-4 rounded-[1.5rem] border border-border bg-[#0F172A]/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Benchmark Mode</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Select solver cards to pin your focus. The benchmark still runs all eight solvers so recommendation and summary cards stay comparable.
                      </p>
                    </div>
                    <Badge>{selectedBenchmarkCount} highlighted</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {ALL_SOLVERS.map((solver) => {
                      const display = getSolverDisplay(solver);
                      const isSelected = benchmarkSolvers.includes(solver);
                      return (
                        <button
                          key={solver}
                          type="button"
                          onClick={() => toggleBenchmarkSolver(solver)}
                          className={[
                            "rounded-[1.5rem] border p-4 text-left transition",
                            isSelected
                              ? "border-blue-400 bg-blue-500/15 text-white"
                              : "border-border bg-[#111A2A] text-slate-300 hover:border-blue-400/50 hover:text-white",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                              {display.abbreviation}
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBenchmarkSolver(solver)}
                              className="pointer-events-none h-4 w-4 accent-blue-500"
                            />
                          </div>
                          <p className="mt-3 text-base font-semibold text-white">{display.fullName}</p>
                          <p className="mt-2 text-sm text-slate-300">{display.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {mode === "goal" ? (
                <section className="space-y-4 rounded-[1.5rem] border border-border bg-[#0F172A]/80 p-5">
                  <div>
                    <p className="text-sm font-semibold text-white">Goal-Driven</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Pick the outcome you care about and open the benchmark dashboard with that intent pinned first.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {GOAL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setGoalPreset(preset.id)}
                        className={[
                          "rounded-[1.5rem] border p-4 text-left transition",
                          goalPreset === preset.id
                            ? "border-blue-400 bg-blue-500/15 text-white"
                            : "border-border bg-[#111A2A] text-slate-300 hover:border-blue-400/50 hover:text-white",
                        ].join(" ")}
                      >
                        <p className="text-base font-semibold text-white">{preset.label}</p>
                        <p className="mt-2 text-sm text-slate-300">{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void handleRun();
                }}
                disabled={isLaunching}
                className="rounded-full border border-blue-400 bg-blue-500/20 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLaunching ? "Launching..." : "Run optimization ->"}
              </button>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );

  function toggleBenchmarkSolver(solver: SolverName): void {
    setBenchmarkSolvers((current) => {
      if (current.includes(solver)) {
        return current.filter((item) => item !== solver);
      }
      return [...current, solver];
    });
  }
}

function ProblemOverview({ problem }: { problem: CanonicalProblem }): JSX.Element {
  const focusGoal = inferGoalLabel(problem.objective);

  return (
    <Card className="space-y-6 bg-[#1E2A3A]/82">
      <div className="space-y-3">
        <Badge>{problem.problemType}</Badge>
        <CardTitle className="text-2xl">{problem.name ?? "Untitled problem"}</CardTitle>
        <CardDescription>
          Objective: {focusGoal}. Start node: <span className="font-mono">{problem.startNodeId}</span>.
        </CardDescription>
      </div>

      {problem.distanceMatrix ? (
        <section className="space-y-4 rounded-[1.5rem] border border-border bg-[#0F172A]/80 p-5">
          <p className="text-sm font-semibold text-white">Distance matrix summary</p>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryMetric label="Nodes" value={String(problem.nodes.length)} />
            <SummaryMetric
              label="Matrix"
              value={`${problem.distanceMatrix.length} x ${problem.distanceMatrix[0]?.length ?? 0}`}
            />
            <SummaryMetric label="Return to Start" value={problem.returnToStart ? "Yes" : "No"} />
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-[1.5rem] border border-border bg-[#0F172A]/80 p-5">
          <p className="text-sm font-semibold text-white">Normalized node list</p>
          <div className="overflow-x-auto rounded-[1.25rem] border border-border bg-[#111A2A]/90">
            <table className="min-w-full border-collapse text-left text-sm text-slate-200">
              <thead className="border-b border-border bg-[#0F172A]/95 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">X</th>
                  <th className="px-4 py-3">Y</th>
                </tr>
              </thead>
              <tbody>
                {problem.nodes.map((node) => (
                  <tr key={node.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3 font-mono">{node.id}</td>
                    <td className="px-4 py-3 text-white">{node.label}</td>
                    <td className="px-4 py-3 font-mono">{node.x ?? "matrix"}</td>
                    <td className="px-4 py-3 font-mono">{node.y ?? "matrix"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="Nodes" value={String(problem.nodes.length)} />
        <SummaryMetric label="Objective" value={focusGoal} />
        <SummaryMetric label="Return to Start" value={problem.returnToStart ? "Yes" : "No"} />
      </section>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-[1.25rem] border border-border bg-[#111A2A]/90 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-base text-slate-100">{value}</p>
    </div>
  );
}

function inferGoalLabel(objective: ProblemObjective): string {
  if (objective === "min_cost") {
    return "Minimize cost";
  }
  if (objective === "min_time") {
    return "Minimize time";
  }
  return "Minimize distance";
}

const GOAL_PRESETS: Array<{
  id: GoalPreset;
  label: string;
  description: string;
}> = [
  {
    id: "shortest_route",
    label: "Shortest route",
    description: "Focus the comparison dashboard on route quality and the strongest distance performers.",
  },
  {
    id: "fastest_solver",
    label: "Fastest solver",
    description: "Open the comparison view with runtime as the primary review lens.",
  },
  {
    id: "most_stable",
    label: "Most stable",
    description: "Prioritize consistency across repeated runs when reviewing the benchmark.",
  },
  {
    id: "compare_all",
    label: "Compare all",
    description: "Open the default full dashboard with all summary cards and recommendation output.",
  },
];
