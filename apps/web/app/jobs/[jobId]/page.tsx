"use client";

import { useEffect } from "react";

import type { JobStatus, SolverRunResponse } from "@smartroute/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ErrorState, PanelSkeleton } from "@/components/FetchState";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useJobPolling } from "@/hooks/useJobPolling";
import { formatConvergenceLabel, getSolverDisplay } from "@/lib/solver-display";

const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "timeout"];

const STATUS_STYLES: Record<JobStatus, string> = {
  completed: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  failed: "border-rose-400/40 bg-rose-500/10 text-rose-100",
  queued: "border-slate-500/40 bg-slate-700/30 text-slate-200",
  running: "border-blue-400/40 bg-blue-500/10 text-blue-100",
  timeout: "border-amber-400/40 bg-amber-500/10 text-amber-100",
};

export default function JobStatusPage({
  params,
}: {
  params: { jobId: string };
}): JSX.Element {
  const router = useRouter();
  const { cancel, error, isPolling, job, refetch } = useJobPolling(params.jobId);

  useEffect(() => {
    if (!job) {
      return;
    }

    const allTerminal =
      job.runs.length > 1 &&
      job.runs.every((run) => TERMINAL_STATUSES.includes(run.status)) &&
      TERMINAL_STATUSES.includes(job.status);

    if (!allTerminal) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push(`/compare/${job.problemId}`);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [job, router]);

  const completedCount = job?.runs.filter((run) => run.status === "completed").length ?? 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-8 px-6 py-14">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <Card className="space-y-6 bg-[#1E2A3A]/82">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge>Live Job Status</Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Solver execution in progress</h1>
              <p className="max-w-3xl text-lg text-slate-300">
                Monitor per-solver progress, terminal states, and result distances as the worker finishes the job.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className="rounded-full border border-border bg-[#0F172A]/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={cancel}
                className="rounded-full border border-border bg-[#0F172A]/80 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-400/50 hover:text-white"
              >
                Stop polling
              </button>
              <Link
                href="/new-problem"
                className="rounded-full border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/25"
              >
                New problem
              </Link>
            </div>
          </div>

          {!job ? (
            <PanelSkeleton blocks={4} className="bg-[#111A2A]/75" />
          ) : (
            <section className="space-y-5 rounded-[1.75rem] border border-border bg-[#0F172A]/80 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Overall status</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{job.status}</p>
                </div>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                    STATUS_STYLES[job.status],
                  ].join(" ")}
                >
                  {isPolling ? "Polling active" : "Polling paused"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-[#09101D]">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-5 text-sm text-slate-300">
                  <p>Progress: {job.progress.toFixed(0)}%</p>
                  <p>Completed: {completedCount}/{job.runs.length}</p>
                  <p>Problem: <span className="font-mono">{job.problemId}</span></p>
                </div>
              </div>

              {job.failureReason ? (
                <div className="rounded-[1.25rem] border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  {job.failureReason}
                </div>
              ) : null}
            </section>
          )}

          {error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : null}
        </Card>

        <Card className="space-y-5 bg-[#1E2A3A]/82">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Timeline</p>
            <CardTitle className="mt-2 text-2xl">Run metadata</CardTitle>
          </div>
          {job ? (
            <div className="space-y-4 text-sm text-slate-300">
              <TimelineRow label="Submitted" value={job.submittedAt} />
              <TimelineRow label="Started" value={job.startedAt ?? "Pending"} />
              <TimelineRow label="Completed" value={job.completedAt ?? "Pending"} />
              <TimelineRow label="Mode" value={job.mode} />
              {job.runs.length > 1 ? (
                <p className="rounded-[1.25rem] border border-blue-400/30 bg-blue-500/10 p-4 text-blue-100">
                  When all solvers finish, this page redirects to the comparison dashboard automatically.
                </p>
              ) : null}
            </div>
          ) : (
            <PanelSkeleton blocks={3} className="bg-[#111A2A]/75" />
          )}
        </Card>
      </section>

      <section className="grid gap-4">
        {job ? (
          job.runs.map((run) => <SolverRunRow key={run.id} run={run} />)
        ) : (
          <PanelSkeleton blocks={4} className="bg-[#1E2A3A]/82" />
        )}
      </section>
    </main>
  );
}

function SolverRunRow({ run }: { run: SolverRunResponse }): JSX.Element {
  const display = getSolverDisplay(run.solverName);

  return (
    <article className="grid gap-4 rounded-[1.75rem] border border-border bg-[#1E2A3A]/82 p-6 lg:grid-cols-[minmax(0,1fr)_220px_220px_180px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            {display.abbreviation}
          </span>
          <span
            className={[
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
              STATUS_STYLES[run.status],
            ].join(" ")}
          >
            {run.status === "running" ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-200" />
                running
              </span>
            ) : run.status === "completed" ? (
              <span className="inline-flex items-center gap-2">
                <span>OK</span>
                completed
              </span>
            ) : (
              run.status
            )}
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">{display.fullName}</h2>
          <p className="mt-2 text-sm text-slate-300">{display.description}</p>
        </div>
      </div>

      <MetricBlock
        label="Distance"
        value={run.totalDistance !== null ? `${run.totalDistance.toFixed(1)} units` : "Pending"}
        highlight={run.status === "completed"}
      />
      <MetricBlock
        label="Runtime"
        value={run.runtimeMs !== null ? `${run.runtimeMs} ms` : "Pending"}
      />
      <MetricBlock label="Convergence" value={formatConvergenceLabel(run)} />
    </article>
  );
}

function MetricBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div
      className={[
        "rounded-[1.25rem] border p-4",
        highlight
          ? "border-emerald-400/30 bg-emerald-500/10"
          : "border-border bg-[#111A2A]/90",
      ].join(" ")}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 font-mono text-base text-slate-100">{value}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-[1.25rem] border border-border bg-[#111A2A]/90 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-sm text-slate-100">{value}</p>
    </div>
  );
}
