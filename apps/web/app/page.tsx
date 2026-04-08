import type { HealthResponse } from "@smartroute/shared";

import { HealthStatus } from "@/components/health-status";
import { getInternalApiBaseUrl } from "@/lib/env";

async function fetchHealth(): Promise<{
  health: HealthResponse | null;
  endpoint: string;
  errorMessage: string | null;
}> {
  const endpoint = `${getInternalApiBaseUrl()}/api/health`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      return {
        health: null,
        endpoint,
        errorMessage: `Health check failed with status ${response.status}.`,
      };
    }

    return {
      health: (await response.json()) as HealthResponse,
      endpoint,
      errorMessage: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      health: null,
      endpoint,
      errorMessage: `Health check is unavailable: ${message}`,
    };
  }
}

export default async function HomePage(): Promise<JSX.Element> {
  const { health, endpoint, errorMessage } = await fetchHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-blue-300">
              SmartRoute AI
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Generic routing optimization starts with a clean foundation.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Phase 001 establishes the monorepo, runtime services, shared contracts, and health
              checks that every later solver and workflow will build on.
            </p>
          </div>
          <HealthStatus health={health} endpoint={endpoint} errorMessage={errorMessage} />
        </section>

        <section className="rounded-[2rem] border border-border bg-slate-950/40 p-8 shadow-glow">
          <div className="space-y-6">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.28em] text-slate-400">
                Included
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Phase 001 deliverables</h2>
            </div>
            <ul className="space-y-4 text-slate-300">
              <li>Next.js 14 App Router shell with strict TypeScript and Tailwind.</li>
              <li>FastAPI service with SQLAlchemy, Alembic, and Pydantic Settings.</li>
              <li>Celery worker wired to Redis with a startup ping task.</li>
              <li>Shared TypeScript and Python schemas for cross-app contracts.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

