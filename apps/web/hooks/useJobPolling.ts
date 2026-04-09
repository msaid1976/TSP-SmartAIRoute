"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { JobStatus, JobStatusResponse } from "@smartroute/shared";

const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "timeout"];

interface UseJobPollingResult {
  cancel: () => void;
  error: string | null;
  isPolling: boolean;
  job: JobStatusResponse | null;
  refetch: () => Promise<void>;
}

export function useJobPolling(jobId: string): UseJobPollingResult {
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

  const stopPolling = useCallback((): void => {
    setIsPolling(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchJob = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Status request failed with ${response.status}.`);
      }

      const payload = (await response.json()) as JobStatusResponse;
      setJob(payload);
      setError(null);
      if (TERMINAL_STATUSES.includes(payload.status)) {
        stopPolling();
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unknown polling error.";
      setError(message);
      stopPolling();
    }
  }, [apiBaseUrl, jobId, stopPolling]);

  useEffect(() => {
    void fetchJob();
    intervalRef.current = setInterval(() => {
      void fetchJob();
    }, 2000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchJob]);

  return {
    cancel: stopPolling,
    error,
    isPolling,
    job,
    refetch: fetchJob,
  };
}
