"use client";

import type { JobStatus, SolverRunResponse } from "@smartroute/shared";
import Link from "next/link";

import { useJobPolling } from "@/hooks/useJobPolling";
import { formatConvergenceLabel, getSolverDisplay } from "@/lib/solver-display";

const STATUS_STYLES: Record<JobStatus, string> = {
  completed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  failed: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  queued: "border-slate-500/40 bg-slate-700/30 text-slate-200",
  running: "border-blue-400/40 bg-blue-500/15 text-blue-200",
  timeout: "border-amber-400/40 bg-amber-500/15 text-amber-200",
};

export default function JobStatusPage({
  params,
}: {
  params: { jobId: string };
}): JSX.Element {
  const { cancel, error, isPolling, job, refetch } = useJobPolling(params.jobId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-14">
      <section className="rounded-[2rem] border border-border bg-slate-950/50 p-8 shadow-glow">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="font-mono text-sm uppercase tracking-[0.28em] text-blue-300">
              Phase 003
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Solver Job Status</h1>
            <p className="text-slate-300">Track asynchronous solver execution for job {params.jobId}.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="rounded-full border border-border bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-full border border-border bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-400 hover:text-white"
            >
              Stop Polling
            </button>
            <Link
              href="/new-problem"
              className="rounded-full border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/25"
            >
              Back To Problems
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="rounded-[1.5rem] border border-border bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Overall</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {job?.status ?? "loading"}
                </p>
              </div>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                  STATUS_STYLES[job?.status ?? "queued"],
                ].join(" ")}
              >
                {isPolling ? "Polling" : "Idle"}
              </span>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${job?.progress ?? 0}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-300">
              <p>Progress: {(job?.progress ?? 0).toFixed(0)}%</p>
              <p>Runs: {job?.runs.length ?? 0}</p>
              <p>Problem: {job?.problemId ?? "..."}</p>
            </div>
            {job?.failureReason ? (
              <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                {job.failureReason}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                {error}
              </p>
            ) : null}
          </section>

          <section className="rounded-[1.5rem] border border-border bg-slate-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Timeline</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Submitted: {job?.submittedAt ?? "..."}</p>
              <p>Started: {job?.startedAt ?? "Pending"}</p>
              <p>Completed: {job?.completedAt ?? "Pending"}</p>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-5">
        {job?.runs.map((run) => (
          <SolverRunCard key={run.id} run={run} />
        )) ?? (
          <div className="rounded-[1.5rem] border border-border bg-slate-950/60 p-6 text-slate-300">
            Waiting for run metadata...
          </div>
        )}
      </section>
    </main>
  );
}

function SolverRunCard({ run }: { run: SolverRunResponse }): JSX.Element {
  const progress = getRunProgress(run.status);
  const display = getSolverDisplay(run.solverName);

  return (
    <article className="rounded-[1.5rem] border border-border bg-slate-950/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">
            Solver {run.runIndex + 1}
          </p>
          <span className="mt-3 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
            {display.abbreviation}
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-white">{display.fullName}</h2>
          <p className="mt-2 text-sm text-slate-300">{display.description}</p>
        </div>
        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
            STATUS_STYLES[run.status],
          ].join(" ")}
        >
          {run.status}
        </span>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-blue-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Seed" value={run.seed ?? "None"} />
        <Metric
          label="Distance"
          value={run.totalDistance !== null ? run.totalDistance.toFixed(3) : "Pending"}
        />
        <Metric label="Runtime" value={run.runtimeMs !== null ? `${run.runtimeMs} ms` : "Pending"} />
        <Metric label="Convergence" value={formatConvergenceLabel(run)} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="rounded-[1.25rem] border border-border bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-base text-slate-100">{value}</p>
    </div>
  );
}

function getRunProgress(status: SolverRunResponse["status"]): number {
  switch (status) {
    case "completed":
      return 100;
    case "running":
      return 55;
    case "failed":
    case "timeout":
      return 100;
    case "queued":
    default:
      return 8;
  }
}
