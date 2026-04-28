"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <Card className="border-rose-400/30 bg-rose-500/10 text-rose-100">
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-rose-300/40 px-4 py-2 text-sm transition hover:bg-rose-400/10"
      >
        Retry
      </button>
    </Card>
  );
}

export function PanelSkeleton({
  blocks = 3,
  className,
}: {
  blocks?: number;
  className?: string;
}): JSX.Element {
  return (
    <Card className={className}>
      <div className="space-y-4">
        {Array.from({ length: blocks }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    </Card>
  );
}
