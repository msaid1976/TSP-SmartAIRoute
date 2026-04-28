"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  CanonicalProblem,
  ProblemInputRequest,
  ProblemInputType,
  ProblemPreviewResponse,
  SerializedCanvasPayload,
} from "@smartroute/shared";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import {
  DRAW_DEMO_SAMPLES,
  MATRIX_DEMO_SAMPLES,
  TABLE_DEMO_SAMPLES,
  TEXT_DEMO_SAMPLES,
} from "@/app/new-problem/demo-samples";
import { ErrorState } from "@/components/FetchState";
import { ParsedPreviewCard } from "@/components/ParsedPreviewCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { createProblem, previewProblem } from "@/lib/api-client";

const GraphCanvas = dynamic(
  () => import("@/components/canvas/GraphCanvas").then((module) => module.GraphCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[1.75rem] border border-border bg-[#111A2A]/85 p-8 text-sm text-slate-300">
        Loading graph canvas...
      </div>
    ),
  },
);

type InputTab = Extract<ProblemInputType, "text" | "table" | "matrix" | "gui" | "image">;
type PreviewState = "idle" | "loading" | "success" | "error";
type TableDetection = "node_list" | "distance_matrix" | "unknown";

const TABS: Array<{ id: InputTab; label: string }> = [
  { id: "text", label: "Text" },
  { id: "table", label: "Table" },
  { id: "matrix", label: "Matrix" },
  { id: "gui", label: "Draw" },
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
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [problemName, setProblemName] = useState("Harbor route demo");
  const [textInput, setTextInput] = useState(TEXT_DEMO_SAMPLES[1]?.text ?? "");
  const [tableInput, setTableInput] = useState(TABLE_DEMO_SAMPLES[0]?.csv ?? "");
  const [matrixSize, setMatrixSize] = useState(4);
  const [matrixLabels, setMatrixLabels] = useState<string[]>(createDefaultLabels(4));
  const [matrixData, setMatrixData] = useState<string[][]>(() =>
    createDefaultMatrix(4, MATRIX_DEMO_SAMPLES[0]?.matrix),
  );
  const [canvasPayload, setCanvasPayload] = useState<SerializedCanvasPayload>(
    DRAW_DEMO_SAMPLES[0]?.payload ?? EMPTY_CANVAS_PAYLOAD,
  );
  const [canvasInitialPayload, setCanvasInitialPayload] = useState<SerializedCanvasPayload>(
    DRAW_DEMO_SAMPLES[0]?.payload ?? EMPTY_CANVAS_PAYLOAD,
  );
  const [canvasKey, setCanvasKey] = useState(0);
  const [preview, setPreview] = useState<CanonicalProblem | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewMode, setPreviewMode] = useState<InputTab | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const tableDetection = useMemo<TableDetection>(
    () => detectTableFormat(tableInput),
    [tableInput],
  );

  useEffect(() => {
    setPreview(null);
    setWarnings([]);
    setErrorMessage(null);
    setPreviewState(activeTab === "text" ? "loading" : "idle");
    setPreviewMode(null);

    if (activeTab !== "text") {
      return;
    }

    const request = buildRequest({
      activeTab,
      canvasPayload,
      matrixData,
      matrixLabels,
      problemName,
      tableDetection,
      tableInput,
      textInput,
    });

    const timeoutId = window.setTimeout(() => {
      void runLivePreview(request);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, canvasPayload, matrixData, matrixLabels, problemName, tableDetection, tableInput, textInput]);

  async function runLivePreview(request: ProblemInputRequest): Promise<void> {
    if (String(request.payload).trim() === "") {
      setPreview(null);
      setWarnings([]);
      setPreviewState("idle");
      setPreviewMode(null);
      setErrorMessage(null);
      return;
    }

    try {
      const payload = await previewProblem(request);
      setPreview(payload.problem);
      setWarnings(payload.warnings);
      setPreviewState("success");
      setPreviewMode("text");
      setErrorMessage(null);
    } catch (error) {
      setPreview(null);
      setWarnings([]);
      setPreviewState("error");
      setPreviewMode(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to parse text input.");
    }
  }

  async function handlePreview(): Promise<void> {
    if (activeTab === "image") {
      setErrorMessage("OCR extraction is planned for Phase 006B and is not available yet.");
      setPreviewState("error");
      return;
    }

    const request = buildRequest({
      activeTab,
      canvasPayload,
      matrixData,
      matrixLabels,
      problemName,
      tableDetection,
      tableInput,
      textInput,
    });

    setPreviewState("loading");
    setErrorMessage(null);

    try {
      const payload: ProblemPreviewResponse = await previewProblem(request);
      setPreview(payload.problem);
      setWarnings(payload.warnings);
      setPreviewState("success");
      setPreviewMode(activeTab);
    } catch (error) {
      setPreview(null);
      setWarnings([]);
      setPreviewState("error");
      setPreviewMode(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to preview the problem.");
    }
  }

  async function handleNext(): Promise<void> {
    const request = buildRequest({
      activeTab,
      canvasPayload,
      matrixData,
      matrixLabels,
      problemName,
      tableDetection,
      tableInput,
      textInput,
    });

    setIsAdvancing(true);
    setErrorMessage(null);

    try {
      const problem = await createProblem(request);
      router.push(`/problems/${problem.problemId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create the problem.");
    } finally {
      setIsAdvancing(false);
    }
  }

  const nextEnabled = preview !== null && previewMode === activeTab && previewState === "success";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-6 py-14">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
        <div className="space-y-4">
          <Badge>Phase 005</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Model any routing problem, preview the normalized graph, then move into solver selection.
          </h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Text, pasted tables, editable matrices, and direct graph drawing all normalize into the same generic routing schema before optimization.
          </p>
        </div>

        <Card className="space-y-4 bg-[#1E2A3A]/85">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workflow</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              1. Enter or draw the problem.
              <br />
              2. Preview the normalized problem.
              <br />
              3. Continue to mode and solver selection.
            </p>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-100">Problem name</span>
            <input
              value={problemName}
              onChange={(event) => setProblemName(event.target.value)}
              className="w-full rounded-2xl border border-border bg-[#0F172A]/90 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              placeholder="Optional"
            />
          </label>
        </Card>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.9fr)]">
        <Card className="space-y-6 bg-[#1E2A3A]/82">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "border-blue-400 bg-blue-500/20 text-white shadow-[0_0_18px_rgba(59,130,246,0.18)]"
                      : "border-border bg-[#0F172A]/80 text-slate-300 hover:border-blue-400/50 hover:text-white",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <TabPanel active={activeTab === "text"}>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Text Input</CardTitle>
                  <CardDescription className="mt-2">
                    Enter `Name(x,y)` or line-based coordinates. Parsing updates automatically after 300ms.
                  </CardDescription>
                </div>
                <InlineParseStatus state={previewState} isVisible={activeTab === "text"} />
              </div>

              <div className="flex flex-wrap gap-2">
                {TEXT_DEMO_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setProblemName(sample.name);
                      setTextInput(sample.text);
                    }}
                    className="rounded-full border border-border bg-[#0F172A]/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>

              <textarea
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                className="min-h-[320px] w-full rounded-[1.75rem] border border-border bg-[#0B1220]/95 p-5 font-mono text-sm text-slate-100 outline-none transition focus:border-blue-400"
                placeholder="Example: A(0,0), B(3,5), C(6,2)"
              />
            </section>
          </TabPanel>

          <TabPanel active={activeTab === "table"}>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Table Input</CardTitle>
                  <CardDescription className="mt-2">
                    Paste CSV data. The parser auto-detects whether it is a node list or distance matrix.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-500/12">
                  {tableDetection === "node_list"
                    ? "Detected: Node List"
                    : tableDetection === "distance_matrix"
                      ? "Detected: Distance Matrix"
                      : "Detected: Waiting"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {TABLE_DEMO_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setProblemName(sample.name);
                      setTableInput(sample.csv);
                    }}
                    className="rounded-full border border-border bg-[#0F172A]/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>

              <textarea
                value={tableInput}
                onChange={(event) => setTableInput(event.target.value)}
                className="min-h-[320px] w-full rounded-[1.75rem] border border-border bg-[#0B1220]/95 p-5 font-mono text-sm text-slate-100 outline-none transition focus:border-blue-400"
                placeholder="id,x,y&#10;A,0,0&#10;B,3,5"
              />
            </section>
          </TabPanel>

          <TabPanel active={activeTab === "matrix"}>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">Matrix Input</CardTitle>
                  <CardDescription className="mt-2">
                    Edit a weighted distance matrix directly. Node labels auto-generate as W1, W2, and so on.
                  </CardDescription>
                </div>
                <label className="flex items-center gap-3 rounded-full border border-border bg-[#0F172A]/85 px-4 py-2 text-sm text-slate-200">
                  <span>Size</span>
                  <select
                    value={matrixSize}
                    onChange={(event) => resizeMatrix(Number(event.target.value))}
                    className="bg-transparent font-mono outline-none"
                  >
                    {[3, 4, 5, 6, 7].map((size) => (
                      <option key={size} value={size} className="bg-[#0A0F1E]">
                        {size} x {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {MATRIX_DEMO_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadMatrixSample(sample.labels, sample.matrix, sample.name)}
                    className="rounded-full border border-border bg-[#0F172A]/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-[1.75rem] border border-border bg-[#0B1220]/95 p-4">
                <table className="min-w-full border-collapse text-sm text-slate-100">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                        Node
                      </th>
                      {matrixLabels.map((label, index) => (
                        <th key={label} className="px-2 py-2">
                          <input
                            value={label}
                            onChange={(event) => updateMatrixLabel(index, event.target.value)}
                            className="w-16 rounded-xl border border-border bg-[#111A2A] px-2 py-1 text-center font-mono text-sm text-white outline-none transition focus:border-blue-400"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`}>
                        <td className="px-2 py-2">
                          <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 font-mono text-xs text-blue-100">
                            {matrixLabels[rowIndex]}
                          </span>
                        </td>
                        {row.map((value, columnIndex) => (
                          <td key={`cell-${rowIndex}-${columnIndex}`} className="px-2 py-2">
                            <input
                              value={value}
                              onChange={(event) =>
                                updateMatrixCell(rowIndex, columnIndex, event.target.value)
                              }
                              className="w-16 rounded-xl border border-border bg-[#111A2A] px-2 py-2 text-center font-mono text-sm text-white outline-none transition focus:border-blue-400"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </TabPanel>

          <TabPanel active={activeTab === "gui"}>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Draw Graph</CardTitle>
                  <CardDescription className="mt-2">
                    Build a route graph visually with the GraphCanvas from Phase 002.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DRAW_DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setProblemName(sample.name);
                        setCanvasInitialPayload(sample.payload);
                        setCanvasPayload(sample.payload);
                        setCanvasKey((current) => current + 1);
                      }}
                      className="rounded-full border border-border bg-[#0F172A]/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </div>

              <GraphCanvas
                key={canvasKey}
                initialPayload={canvasInitialPayload}
                onPayloadChange={setCanvasPayload}
              />
            </section>
          </TabPanel>

          <TabPanel active={activeTab === "image"}>
            <section className="space-y-4">
              <div>
                <CardTitle className="text-2xl">Image Input</CardTitle>
                <CardDescription className="mt-2">
                  OCR-driven extraction is planned next. This tab shows the intended upload entry point.
                </CardDescription>
              </div>

              <div className="rounded-[1.75rem] border border-dashed border-blue-400/30 bg-[#0F172A]/85 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-3xl text-blue-200">
                  ↑
                </div>
                <p className="mt-5 text-lg font-semibold text-white">OCR extraction placeholder</p>
                <p className="mt-2 text-sm text-slate-300">
                  Upload and structured image parsing will land in Phase 006B.
                </p>
                <Badge className="mt-5 border-amber-400/30 bg-amber-500/10 text-amber-100">
                  Coming Soon
                </Badge>
              </div>
            </section>
          </TabPanel>

          {errorMessage ? (
            <ErrorState
              message={errorMessage}
              onRetry={() => {
                if (activeTab === "image") {
                  setErrorMessage(null);
                  setPreviewState("idle");
                  return;
                }
                void handlePreview();
              }}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handlePreview();
              }}
              disabled={previewState === "loading" || activeTab === "image"}
              className="rounded-full border border-blue-400 bg-blue-500/20 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {previewState === "loading" && activeTab !== "image"
                ? "Previewing..."
                : "Preview normalized problem"}
            </button>
            {nextEnabled ? (
              <button
                type="button"
                onClick={() => {
                  void handleNext();
                }}
                disabled={isAdvancing}
                className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdvancing ? "Creating..." : "Next ->"}
              </button>
            ) : null}
          </div>
        </Card>

        <ParsedPreviewCard
          heading={preview ? "Normalized problem ready" : "Awaiting preview"}
          problem={preview}
          warnings={warnings}
          isLoading={previewState === "loading"}
        />
      </div>
    </main>
  );

  function resizeMatrix(nextSize: number): void {
    setMatrixSize(nextSize);
    setMatrixLabels((current) =>
      Array.from({ length: nextSize }, (_, index) => current[index] ?? `W${index + 1}`),
    );
    setMatrixData((current) =>
      Array.from({ length: nextSize }, (_, rowIndex) =>
        Array.from({ length: nextSize }, (_, columnIndex) => {
          if (rowIndex === columnIndex) {
            return "0";
          }
          return current[rowIndex]?.[columnIndex] ?? "";
        }),
      ),
    );
  }

  function updateMatrixLabel(index: number, value: string): void {
    setMatrixLabels((current) =>
      current.map((label, itemIndex) => (itemIndex === index ? value || `W${index + 1}` : label)),
    );
  }

  function updateMatrixCell(rowIndex: number, columnIndex: number, value: string): void {
    setMatrixData((current) =>
      current.map((row, currentRow) =>
        row.map((cell, currentColumn) =>
          currentRow === rowIndex && currentColumn === columnIndex ? value : cell,
        ),
      ),
    );
  }

  function loadMatrixSample(labelsText: string, matrixText: string, name: string): void {
    const nextLabels = labelsText
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    const nextMatrix = parseDelimitedGrid(matrixText);
    setProblemName(name);
    setMatrixSize(nextMatrix.length);
    setMatrixLabels(nextLabels.length > 0 ? nextLabels : createDefaultLabels(nextMatrix.length));
    setMatrixData(nextMatrix.map((row) => row.map((value) => value.trim())));
  }
}

function buildRequest({
  activeTab,
  canvasPayload,
  matrixData,
  matrixLabels,
  problemName,
  tableDetection,
  tableInput,
  textInput,
}: {
  activeTab: InputTab;
  canvasPayload: SerializedCanvasPayload;
  matrixData: string[][];
  matrixLabels: string[];
  problemName: string;
  tableDetection: TableDetection;
  tableInput: string;
  textInput: string;
}): ProblemInputRequest {
  const name = problemName.trim() || null;

  if (activeTab === "text") {
    return {
      inputType: "text",
      name,
      payload: textInput.trim(),
    };
  }

  if (activeTab === "table") {
    if (tableDetection === "distance_matrix") {
      const parsed = parseMatrixTable(tableInput);
      return {
        inputType: "matrix",
        name,
        labels: parsed.labels,
        payload: {
          data: parsed.data,
        },
      };
    }

    return {
      inputType: "table",
      name,
      payload: {
        text: tableInput,
      },
    };
  }

  if (activeTab === "matrix") {
    return {
      inputType: "matrix",
      name,
      labels: matrixLabels,
      payload: {
        data: matrixData,
      },
    };
  }

  if (activeTab === "gui") {
    return {
      inputType: "gui",
      name,
      payload: canvasPayload.payload,
    };
  }

  return {
    inputType: "image",
    name,
    payload: {},
  };
}

function InlineParseStatus({
  state,
  isVisible,
}: {
  state: PreviewState;
  isVisible: boolean;
}): JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  const status =
    state === "success"
      ? { icon: "OK", label: "Parsed", className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" }
      : state === "error"
        ? { icon: "X", label: "Invalid", className: "border-rose-400/40 bg-rose-500/10 text-rose-100" }
        : state === "loading"
          ? { icon: "...", label: "Parsing", className: "border-blue-400/40 bg-blue-500/10 text-blue-100" }
          : { icon: "-", label: "Waiting", className: "border-border bg-[#0F172A]/85 text-slate-300" };

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
        status.className,
      ].join(" ")}
    >
      <span className="font-mono">{status.icon}</span>
      <span>{status.label}</span>
    </span>
  );
}

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className={[
        "overflow-hidden transition-all duration-300",
        active ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function detectTableFormat(input: string): TableDetection {
  const rows = parseDelimitedGrid(input);
  if (rows.length === 0) {
    return "unknown";
  }

  if (looksLikeMatrix(rows)) {
    return "distance_matrix";
  }

  return "node_list";
}

function parseMatrixTable(input: string): { data: string[][]; labels?: string[] } {
  const rows = parseDelimitedGrid(input);
  if (rows.length === 0) {
    return { data: [] };
  }

  if (rows.every((row) => row.every(isNumericCell))) {
    return { data: rows };
  }

  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const labels = header.slice(1).map((cell) => cell.trim()).filter(Boolean);
  const data = body.map((row) => row.slice(1));

  return {
    data,
    labels: labels.length > 0 ? labels : undefined,
  };
}

function looksLikeMatrix(rows: string[][]): boolean {
  if (rows.every((row) => row.length === rows.length && row.every(isNumericCell))) {
    return true;
  }

  const header = rows[0] ?? [];
  const body = rows.slice(1);

  if (header.length < 2 || body.length === 0) {
    return false;
  }

  const expectedWidth = header.length;
  if (body.length !== header.length - 1) {
    return false;
  }

  return body.every((row) => {
    if (row.length !== expectedWidth) {
      return false;
    }
    return row.slice(1).every(isNumericCell);
  });
}

function parseDelimitedGrid(input: string): string[][] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function isNumericCell(value: string): boolean {
  return value.trim() !== "" && !Number.isNaN(Number(value));
}

function createDefaultLabels(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `W${index + 1}`);
}

function createDefaultMatrix(size: number, sample?: string): string[][] {
  if (sample) {
    const rows = parseDelimitedGrid(sample);
    if (rows.length === size) {
      return rows;
    }
  }

  return Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, columnIndex) => (rowIndex === columnIndex ? "0" : "")),
  );
}
