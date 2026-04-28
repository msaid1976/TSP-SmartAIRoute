import Link from "next/link";

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-blue-300">
              SmartRoute AI
            </p>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Solve routing problems intelligently
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Model routes in text, tables, matrices, or a visual graph canvas, then benchmark multiple optimization engines and inspect the recommendation dashboard in one flow.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/new-problem"
                className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/15 px-6 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/25"
              >
                Start solving -&gt;
              </Link>
            </div>
          </div>

          <section className="rounded-[2rem] border border-border bg-[#1E2A3A]/80 p-8 shadow-glow backdrop-blur">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
                Platform Snapshot
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Highlight label="Input modes" value="5" />
                <Highlight label="Solvers" value="8" />
                <Highlight label="Benchmark runs" value="24" />
                <Highlight label="Recommendation" value="Rule-based" />
              </div>
              <p className="text-sm leading-7 text-slate-300">
                Deep comparison views, Pareto front analysis, and asynchronous benchmark execution are already wired into the product workflow.
              </p>
            </div>
          </section>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            title="Multi-modal input"
            description="Capture routing problems from free text, CSV tables, editable matrices, and interactive graph drawing."
          />
          <FeatureCard
            title="8 solver engines"
            description="Benchmark OR-Tools, GA, ACO, SA, PSO, NSGA-II, Tabu Search, and Differential Evolution on the same normalized problem."
          />
          <FeatureCard
            title="Smart recommendation"
            description="Review distance, runtime, stability, and trade-off summaries to choose the solver that best matches the goal."
          />
        </section>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <article className="rounded-[2rem] border border-border bg-[#1E2A3A]/70 p-6 shadow-glow">
      <p className="text-xs uppercase tracking-[0.24em] text-blue-300">{title}</p>
      <p className="mt-4 text-base leading-7 text-slate-200">{description}</p>
    </article>
  );
}

function Highlight({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-[1.5rem] border border-border bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 font-mono text-2xl text-white">{value}</p>
    </div>
  );
}
