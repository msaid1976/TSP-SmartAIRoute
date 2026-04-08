import type { HealthResponse } from "@smartroute/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

interface HealthStatusProps {
  health: HealthResponse | null;
  endpoint: string;
  errorMessage: string | null;
}

export function HealthStatus({
  health,
  endpoint,
  errorMessage,
}: HealthStatusProps): JSX.Element {
  const dbStatus = health?.db ?? "unavailable";
  const version = health?.version ?? "unknown";
  const serviceStatus = health?.status ?? "error";

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Badge>Phase 001</Badge>
          <CardTitle>Foundation Stack Status</CardTitle>
          <CardDescription>
            Frontend, API, database, and worker scaffolding are wired together for local development.
          </CardDescription>
        </div>
        <div className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-sm text-blue-100">
          {serviceStatus}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">API</p>
          <p className="mt-2 font-mono text-lg text-white">{endpoint}</p>
        </div>
        <div className="rounded-2xl border border-border bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Database</p>
          <p className="mt-2 font-mono text-lg text-white">{dbStatus}</p>
        </div>
        <div className="rounded-2xl border border-border bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Version</p>
          <p className="mt-2 font-mono text-lg text-white">{version}</p>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : null}
    </Card>
  );
}

