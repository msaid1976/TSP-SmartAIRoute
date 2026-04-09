"use client";

import { useMemo, useState } from "react";

import type {
  CanonicalProblem,
  CreateJobRequest,
  CreateJobResponse,
  ProblemInputRequest,
  ProblemInputType,
  ProblemPreviewResponse,
  SerializedCanvasPayload,
  SolverName,
} from "@smartroute/shared";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import {
  DRAW_DEMO_SAMPLES,
  IMAGE_DEMO_SAMPLES,
  MATRIX_DEMO_SAMPLES,
  TABLE_DEMO_SAMPLES,
  TEXT_DEMO_SAMPLES,
  demoCountByMode,
} from "@/app/new-problem/demo-samples";
import { ParsedPreviewCard } from "@/components/ParsedPreviewCard";
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from "@/app/new-problem/country-cities";
import { CountryCityPicker } from "@/components/map/CountryCityPicker";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSolverDisplay } from "@/lib/solver-display";

const GraphCanvas = dynamic(
  () => import("@/components/canvas/GraphCanvas").then((module) => module.GraphCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[1.75rem] border border-border bg-slate-950/80 p-8 text-sm text-slate-400">
        Loading canvas…
      </div>
    ),
  },
);

const MODES: Array<{ id: ProblemInputType; label: string }> = [
  { id: "text", label: "Text" },
  { id: "table", label: "Table" },
  { id: "matrix", label: "Matrix" },
  { id: "gui", label: "Draw" },
  { id: "map", label: "Map" },
  { id: "image", label: "Image" },
];

const EMPTY_CANVAS_PAYLOAD: SerializedCanvasPayload = {
  inputType: "gui",
  payload: {
    nodes: [],
    edges: [],
    startNodeId: null,
    returnToStart: true,
    objective: "min_distance",
  },
};

export default function NewProblemPage(): JSX.Element {
  const router = useRouter();
  const [mode, setMode] = useState<ProblemInputType>("text");
  const [showSamples, setShowSamples] = useState(false);
  const [problemName, setProblemName] = useState("");
  const [textInput, setTextInput] = useState("A(0,0), B(3,5), C(6,2)");
  const [tableInput, setTableInput] = useState("id,x,y\nA,0,0\nB,3,5\nC,6,2");
  const [matrixInput, setMatrixInput] = useState("0,10,15\n10,0,20\n15,20,0");
  const [matrixLabelsInput, setMatrixLabelsInput] = useState("A, B, C");
  const [canvasInitialPayload, setCanvasInitialPayload] = useState<SerializedCanvasPayload>(
    EMPTY_CANVAS_PAYLOAD,
  );
  const [canvasPayload, setCanvasPayload] = useState<SerializedCanvasPayload>(EMPTY_CANVAS_PAYLOAD);
  const [canvasInstanceKey, setCanvasInstanceKey] = useState(0);
  const [activeImageSampleId, setActiveImageSampleId] = useState(IMAGE_DEMO_SAMPLES[0]?.id ?? "");
  const [mapCountryCode, setMapCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [mapCityIds, setMapCityIds] = useState<string[]>([]);
  const [mapStartCityId, setMapStartCityId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CanonicalProblem | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLaunchingJob, setIsLaunchingJob] = useState(false);
  const [selectedSolvers, setSelectedSolvers] = useState<SolverName[]>(["ortools", "ga", "aco"]);
  const [jobSeed, setJobSeed] = useState("42");

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

  const activeImageSample = useMemo(
    () =>
      IMAGE_DEMO_SAMPLES.find((sample) => sample.id === activeImageSampleId) ??
      IMAGE_DEMO_SAMPLES[0],
    [activeImageSampleId],
  );

  async function handlePreview(): Promise<void> {
    await submit("preview");
  }

  async function handleCreate(): Promise<void> {
    await submit("create");
  }

  async function handleSaveAndRun(): Promise<void> {
    if (mode === "image") {
      setErrorMessages(["Image ingestion is a Phase 006B stub."]);
      return;
    }

    if (selectedSolvers.length === 0) {
      setErrorMessages(["Select at least one solver before launching Phase 003."]);
      return;
    }

    const request = buildRequest({
      mode,
      textInput,
      tableInput,
      matrixInput,
      matrixLabelsInput,
      canvasPayload,
      problemName,
      mapCountryCode,
      mapCityIds,
      mapStartCityId,
    });

    setIsLaunchingJob(true);
    setErrorMessages([]);

    try {
      const createdProblem = await createProblem(request, apiBaseUrl);
      setPreview(createdProblem);
      setWarnings([]);

      const parsedSeed = jobSeed.trim() === "" ? null : Number(jobSeed.trim());
      if (parsedSeed !== null && Number.isNaN(parsedSeed)) {
        throw new Error("Seed must be empty or a valid number.");
      }

      const createJobRequest: CreateJobRequest = {
        problemId: createdProblem.problemId,
        solvers: selectedSolvers,
        mode: selectedSolvers.length > 1 ? "compare" : "quick",
        seed: parsedSeed,
      };

      const job = await createJob(createJobRequest, apiBaseUrl);
      router.push(`/jobs/${job.jobId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessages([message]);
    } finally {
      setIsLaunchingJob(false);
    }
  }

  async function submit(action: "preview" | "create"): Promise<void> {
    if (mode === "image") {
      setErrorMessages(["Image ingestion is a Phase 006B stub."]);
      return;
    }

    const request = buildRequest({
      mode,
      textInput,
      tableInput,
      matrixInput,
      matrixLabelsInput,
      canvasPayload,
      problemName,
      mapCountryCode,
      mapCityIds,
      mapStartCityId,
    });
    setIsSubmitting(true);
    setErrorMessages([]);

    try {
      if (action === "preview") {
        const payload = await previewProblem(request, apiBaseUrl);
        setPreview(payload.problem);
        setWarnings(payload.warnings);
        return;
      }

      const payload = await createProblem(request, apiBaseUrl);
      setPreview(payload);
      setWarnings([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessages([`Request failed: ${message}`]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyTextSample(sampleId: string): void {
    const sample = TEXT_DEMO_SAMPLES.find((item) => item.id === sampleId);
    if (!sample) {
      return;
    }

    setProblemName(sample.name);
    setTextInput(sample.text);
  }

  function applyTableSample(sampleId: string): void {
    const sample = TABLE_DEMO_SAMPLES.find((item) => item.id === sampleId);
    if (!sample) {
      return;
    }

    setProblemName(sample.name);
    setTableInput(sample.csv);
  }

  function applyMatrixSample(sampleId: string): void {
    const sample = MATRIX_DEMO_SAMPLES.find((item) => item.id === sampleId);
    if (!sample) {
      return;
    }

    setProblemName(sample.name);
    setMatrixInput(sample.matrix);
    setMatrixLabelsInput(sample.labels);
  }

  function applyDrawSample(sampleId: string): void {
    const sample = DRAW_DEMO_SAMPLES.find((item) => item.id === sampleId);
    if (!sample) {
      return;
    }

    setProblemName(sample.name);
    setCanvasInitialPayload(sample.payload);
    setCanvasPayload(sample.payload);
    setCanvasInstanceKey((current) => current + 1);
  }

  function resetCanvas(): void {
    setCanvasInitialPayload(EMPTY_CANVAS_PAYLOAD);
    setCanvasPayload(EMPTY_CANVAS_PAYLOAD);
    setCanvasInstanceKey((current) => current + 1);
  }

  function toggleSolver(solver: SolverName): void {
    setSelectedSolvers((current) =>
      current.includes(solver)
        ? current.filter((item) => item !== solver)
        : [...current, solver],
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1760px] flex-col gap-8 px-6 py-14">
      <section className="space-y-4">
        <Badge>Phase 002 + 003</Badge>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Ingest routing problems, then launch async solver jobs directly.
        </h1>
        <p className="max-w-3xl text-lg text-slate-300">
          Everything normalizes into the generic nodes-and-weighted-matrix schema before persistence, whether the edge values represent distance, cost, or time.
        </p>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(460px,1fr)]">
        <Card className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {MODES.map((item) => {
                const isActive = item.id === mode;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "border-blue-400 bg-blue-500/20 text-blue-100"
                        : "border-border bg-slate-900/60 text-slate-300 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[1.75rem] border border-border bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Demo Samples
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Load one of {demoCountByMode(mode)} ready-made examples for this mode instead of starting from scratch.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer select-none items-center gap-2 rounded-full border border-border bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={showSamples}
                      onChange={(event) => setShowSamples(event.target.checked)}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span>Show samples</span>
                  </label>
                  {mode === "gui" ? (
                    <button
                      type="button"
                      onClick={resetCanvas}
                      className="rounded-full border border-border bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white"
                    >
                      Reset canvas
                    </button>
                  ) : null}
                </div>
              </div>

              {showSamples && mode === "text" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {TEXT_DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => applyTextSample(sample.id)}
                      className="rounded-3xl border border-border bg-slate-900/70 p-4 text-left transition hover:border-blue-400/60 hover:bg-slate-900"
                    >
                      <p className="text-sm font-semibold text-white">{sample.title}</p>
                      <p className="mt-2 text-sm text-slate-300">{sample.summary}</p>
                      <p className="mt-3 font-mono text-xs text-blue-200">{sample.text}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              {showSamples && mode === "table" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {TABLE_DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => applyTableSample(sample.id)}
                      className="rounded-3xl border border-border bg-slate-900/70 p-4 text-left transition hover:border-blue-400/60 hover:bg-slate-900"
                    >
                      <p className="text-sm font-semibold text-white">{sample.title}</p>
                      <p className="mt-2 text-sm text-slate-300">{sample.summary}</p>
                      <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-blue-200">
                        {sample.csv}
                      </pre>
                    </button>
                  ))}
                </div>
              ) : null}

              {showSamples && mode === "matrix" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {MATRIX_DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => applyMatrixSample(sample.id)}
                      className="rounded-3xl border border-border bg-slate-900/70 p-4 text-left transition hover:border-blue-400/60 hover:bg-slate-900"
                    >
                      <p className="text-sm font-semibold text-white">{sample.title}</p>
                      <p className="mt-2 text-sm text-slate-300">{sample.summary}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">
                        Labels
                      </p>
                      <p className="mt-1 text-sm text-blue-200">{sample.labels}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              {showSamples && mode === "gui" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {DRAW_DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => applyDrawSample(sample.id)}
                      className="rounded-3xl border border-border bg-slate-900/70 p-4 text-left transition hover:border-blue-400/60 hover:bg-slate-900"
                    >
                      <p className="text-sm font-semibold text-white">{sample.title}</p>
                      <p className="mt-2 text-sm text-slate-300">{sample.summary}</p>
                      <p className="mt-3 text-xs text-blue-200">
                        {sample.payload.payload.nodes.length} nodes, {sample.payload.payload.edges.length} edges
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}

              {showSamples && mode === "map" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMapCountryCode("MY");
                      setMapCityIds([
                        "Kuala Lumpur (KL)",
                        "Penang",
                        "Johor Bahru",
                        "Kota Kinabalu",
                        "Kuching",
                        "Malacca City",
                      ]);
                      setMapStartCityId("Kuala Lumpur (KL)");
                    }}
                    className="rounded-3xl border border-border bg-slate-900/70 p-4 text-left transition hover:border-blue-400/60 hover:bg-slate-900"
                  >
                    <p className="text-sm font-semibold text-white">Malaysia major cities</p>
                    <p className="mt-2 text-sm text-slate-300">
                      KL, Penang, JB, Kuching, Kota Kinabalu, Melaka.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMapCountryCode("MY");
                      setMapCityIds([
                        "Kuala Lumpur (KL)",
                        "Shah Alam",
                        "Ipoh",
                        "Penang",
                        "Alor Setar",
                        "Kota Bharu",
                        "Kuala Terengganu",
                        "Kuantan",
                        "Johor Bahru",
                      ]);
                      setMapStartCityId("Kuala Lumpur (KL)");
                    }}
                    className="rounded-3xl border border-border bg-slate-900/70 p-4 text-left transition hover:border-blue-400/60 hover:bg-slate-900"
                  >
                    <p className="text-sm font-semibold text-white">Peninsular run</p>
                    <p className="mt-2 text-sm text-slate-300">
                      A larger peninsular set to show a richer weighted matrix generated from map coordinates.
                    </p>
                  </button>
                </div>
              ) : null}

              {showSamples && mode === "image" ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-3">
                    {IMAGE_DEMO_SAMPLES.map((sample) => {
                      const isActive = sample.id === activeImageSample?.id;

                      return (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => setActiveImageSampleId(sample.id)}
                          className={[
                            "rounded-3xl border p-4 text-left transition",
                            isActive
                              ? "border-blue-400/70 bg-blue-500/10"
                              : "border-border bg-slate-900/70 hover:border-blue-400/60 hover:bg-slate-900",
                          ].join(" ")}
                        >
                          <p className="text-sm font-semibold text-white">{sample.title}</p>
                          <p className="mt-2 text-sm text-slate-300">{sample.summary}</p>
                          <p className="mt-3 font-mono text-xs text-slate-400">{sample.source}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-3xl border border-dashed border-border bg-slate-900/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      OCR Demo Preview
                    </p>
                    <p className="mt-3 text-sm text-slate-300">
                      Phase 002 keeps image ingestion as a stub, but these samples show the kind of text normalization the future OCR pipeline should emit.
                    </p>
                    <div className="mt-4 rounded-3xl border border-border bg-slate-950/70 p-4">
                      <p className="text-sm font-semibold text-white">{activeImageSample?.title}</p>
                      <p className="mt-2 text-sm text-slate-300">{activeImageSample?.summary}</p>
                      <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-border bg-slate-950 px-4 py-3 font-mono text-xs text-blue-200">
                        {activeImageSample?.extractedPreview}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : null}

              {!showSamples ? (
                <div className="mt-4 rounded-3xl border border-dashed border-border bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                  Samples are hidden to save space. Use <span className="text-white">Show samples</span> when you want demo-ready inputs.
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Problem name</span>
                <input
                  value={problemName}
                  onChange={(event) => setProblemName(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-border bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                />
              </label>
              <div className="rounded-2xl border border-border bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                <p className="font-medium text-white">Normalization target</p>
                <p className="mt-1">Canonical problem schema with nodes, weighted matrix, objective, and metadata.</p>
              </div>
            </div>
          </div>

          <div>
            {mode === "text" ? (
              <textarea
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                className="min-h-[260px] w-full rounded-[1.75rem] border border-border bg-slate-950/80 p-5 font-mono text-sm text-slate-100 outline-none transition focus:border-blue-400"
              />
            ) : null}

            {mode === "table" ? (
              <textarea
                value={tableInput}
                onChange={(event) => setTableInput(event.target.value)}
                className="min-h-[260px] w-full rounded-[1.75rem] border border-border bg-slate-950/80 p-5 font-mono text-sm text-slate-100 outline-none transition focus:border-blue-400"
              />
            ) : null}

            {mode === "matrix" ? (
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Matrix labels</span>
                  <input
                    value={matrixLabelsInput}
                    onChange={(event) => setMatrixLabelsInput(event.target.value)}
                    placeholder="A, B, C"
                    className="w-full rounded-2xl border border-border bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                  />
                </label>
                <textarea
                  value={matrixInput}
                  onChange={(event) => setMatrixInput(event.target.value)}
                  className="min-h-[260px] w-full rounded-[1.75rem] border border-border bg-slate-950/80 p-5 font-mono text-sm text-slate-100 outline-none transition focus:border-blue-400"
                />
              </div>
            ) : null}

            {mode === "map" ? (
              <CountryCityPicker
                value={{
                  countryCode: mapCountryCode,
                  selectedCityIds: mapCityIds,
                  startCityId: mapStartCityId,
                }}
                onChange={(next) => {
                  setMapCountryCode(next.countryCode);
                  setMapCityIds(next.selectedCityIds);
                  setMapStartCityId(next.startCityId);
                }}
              />
            ) : null}

            {mode === "gui" ? (
              <GraphCanvas
                key={canvasInstanceKey}
                initialPayload={canvasInitialPayload}
                onPayloadChange={setCanvasPayload}
              />
            ) : null}

            {mode === "image" ? (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-slate-950/70 p-8">
                <CardTitle>Image ingestion stub</CardTitle>
                <CardDescription className="mt-3">
                  OCR-driven image parsing is reserved for Phase 006B. This tab is intentionally non-functional in Phase 002.
                </CardDescription>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isSubmitting}
              className="rounded-full border border-blue-400 bg-blue-500/20 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting…" : "Preview normalized problem"}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="rounded-full border border-border bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save problem
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Phase 003
                </p>
                <h2 className="text-xl font-semibold text-white">Launch Async Solvers</h2>
                <p className="max-w-2xl text-sm text-slate-300">
                  This saves the current problem, creates a solver job, and redirects to the live status page. The solvers optimize whatever edge weight the matrix represents: distance, cost, or time.
                </p>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Seed</span>
                <input
                  value={jobSeed}
                  onChange={(event) => setJobSeed(event.target.value)}
                  placeholder="Optional"
                  className="w-28 rounded-2xl border border-border bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(["ortools", "ga", "aco"] as SolverName[]).map((solver) => {
                const isSelected = selectedSolvers.includes(solver);
                const display = getSolverDisplay(solver);
                return (
                  <button
                    key={solver}
                    type="button"
                    onClick={() => toggleSolver(solver)}
                    className={[
                      "rounded-[1.5rem] border p-4 text-left transition",
                      isSelected
                        ? "border-blue-400 bg-blue-500/15 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                        : "border-border bg-slate-900/60 text-slate-300 hover:border-blue-400/50 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="inline-flex rounded-full border border-blue-400/30 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                      {display.abbreviation}
                    </span>
                    <span className="mt-3 block text-base font-semibold text-white">
                      {display.fullName}
                    </span>
                    <span className="mt-1 block text-sm text-slate-300">{display.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveAndRun}
                disabled={isSubmitting || isLaunchingJob}
                className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLaunchingJob ? "Launching…" : "Save + Run Phase 003"}
              </button>
            </div>
          </div>

          {errorMessages.length > 0 ? (
            <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200">
                Validation
              </p>
              <ul className="mt-3 space-y-2 text-sm text-rose-100">
                {errorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <ParsedPreviewCard
          problem={preview}
          warnings={warnings}
          heading={preview ? "Normalized problem ready" : "Awaiting preview"}
        />
      </div>
    </main>
  );
}

  function buildRequest({
  mode,
  textInput,
  tableInput,
  matrixInput,
  matrixLabelsInput,
  canvasPayload,
  problemName,
  mapCountryCode,
  mapCityIds,
  mapStartCityId,
}: {
  mode: ProblemInputType;
  textInput: string;
  tableInput: string;
  matrixInput: string;
  matrixLabelsInput: string;
  canvasPayload: SerializedCanvasPayload;
  problemName: string;
  mapCountryCode: string;
  mapCityIds: string[];
  mapStartCityId: string | null;
}): ProblemInputRequest {
  const name = problemName.trim() || null;

  if (mode === "text") {
    return { inputType: "text", payload: textInput, name };
  }

  if (mode === "table") {
    return { inputType: "table", payload: parseDelimitedGrid(tableInput), name };
  }

  if (mode === "matrix") {
    const labels = matrixLabelsInput
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    return {
      inputType: "matrix",
      payload: {
        data: parseDelimitedGrid(matrixInput),
      },
      labels: labels.length > 0 ? labels : undefined,
      name,
    };
  }

  if (mode === "map") {
    const country = COUNTRIES.find((item) => item.code === mapCountryCode);
    const cityById = new Map((country?.cities ?? []).map((city) => [city.id, city]));
    const nodes = mapCityIds
      .map((cityId) => cityById.get(cityId))
      .filter((city): city is NonNullable<typeof city> => Boolean(city))
      .map((city) => ({ id: city.id, label: city.label, x: city.lat, y: city.lon }));

    return {
      inputType: "map",
      payload: {
        nodes,
        edges: [],
        startNodeId: mapStartCityId ?? nodes[0]?.id ?? null,
        returnToStart: true,
        objective: "min_distance",
        geo: {
          countryCode: country?.code ?? mapCountryCode,
          countryName: country?.name ?? "Unknown",
          coordinateSystem: "latlon",
        },
      },
      name,
    };
  }

  return {
    inputType: "gui",
    payload: canvasPayload.payload,
    name,
  };
}

function parseDelimitedGrid(input: string): string[][] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

async function previewProblem(
  request: ProblemInputRequest,
  apiBaseUrl: string,
): Promise<ProblemPreviewResponse> {
  const response = await fetch(`${apiBaseUrl}/api/problems/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as ProblemPreviewResponse;
}

async function createProblem(
  request: ProblemInputRequest,
  apiBaseUrl: string,
): Promise<CanonicalProblem> {
  const response = await fetch(`${apiBaseUrl}/api/problems`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as CanonicalProblem;
}

async function createJob(
  request: CreateJobRequest,
  apiBaseUrl: string,
): Promise<CreateJobResponse> {
  const response = await fetch(`${apiBaseUrl}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as CreateJobResponse;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json()) as { detail?: string[] | string };
  if (Array.isArray(payload.detail)) {
    return payload.detail.join(" ");
  }
  return payload.detail ?? `Request failed with status ${response.status}.`;
}
