"use client";

import type {
  CanonicalProblem,
  ComparisonResult,
  CreateJobRequest,
  CreateJobResponse,
  JobStatusResponse,
  ProblemInputRequest,
  ProblemPreviewResponse,
} from "@smartroute/shared";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function previewProblem(
  request: ProblemInputRequest,
): Promise<ProblemPreviewResponse> {
  return requestJson<ProblemPreviewResponse>("/api/problems/preview", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function createProblem(request: ProblemInputRequest): Promise<CanonicalProblem> {
  return requestJson<CanonicalProblem>("/api/problems", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchProblem(problemId: string): Promise<CanonicalProblem> {
  return requestJson<CanonicalProblem>(`/api/problems/${problemId}`, {
    method: "GET",
  });
}

export async function createJob(request: CreateJobRequest): Promise<CreateJobResponse> {
  return requestJson<CreateJobResponse>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchJob(jobId: string): Promise<JobStatusResponse> {
  return requestJson<JobStatusResponse>(`/api/jobs/${jobId}`, {
    method: "GET",
  });
}

export async function fetchComparison(problemId: string): Promise<ComparisonResult> {
  return requestJson<ComparisonResult>(`/api/comparisons/${problemId}`, {
    method: "GET",
  });
}

export async function createComparison(problemId: string): Promise<ComparisonResult> {
  return requestJson<ComparisonResult>(`/api/comparisons/${problemId}`, {
    method: "POST",
  });
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { detail?: string[] | string } | null;

  if (Array.isArray(payload?.detail)) {
    return payload.detail.join(" ");
  }

  if (typeof payload?.detail === "string") {
    return payload.detail;
  }

  return `Request failed with status ${response.status}.`;
}
