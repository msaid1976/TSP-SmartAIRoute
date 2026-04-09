"use client";

import { Badge } from "@/components/ui/badge";

export interface CanvasSidebarNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  edgeCount: number;
}

interface CanvasSidebarProps {
  modeLabel: string;
  modeHint: string;
  selectedNode: CanvasSidebarNode | null;
  nodeCount: number;
  edgeCount: number;
  startNodeId: string | null;
  problemTypeLabel: string;
  pendingEdgeSourceId: string | null;
  onClearCanvas: () => void;
}

function formatCoordinate(value: number): string {
  return value.toFixed(2);
}

export function CanvasSidebar({
  modeLabel,
  modeHint,
  selectedNode,
  nodeCount,
  edgeCount,
  startNodeId,
  problemTypeLabel,
  pendingEdgeSourceId,
  onClearCanvas,
}: CanvasSidebarProps): JSX.Element {
  return (
    <aside className="w-full max-w-xs border-l border-border bg-slate-950/80 p-4">
      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Mode Guide
          </p>
          <div className="space-y-3 rounded-3xl border border-border bg-slate-900/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Mode</span>
              <Badge className="text-[10px]">{modeLabel}</Badge>
            </div>
            <p className="text-sm leading-6 text-slate-200">{modeHint}</p>
            {pendingEdgeSourceId ? (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
                Edge source locked on <span className="font-mono">{pendingEdgeSourceId}</span>. Click the next node to continue the chain or click empty space to cancel.
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClearCanvas}
              className="w-full rounded-2xl border border-border bg-slate-950/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white"
            >
              Clear canvas
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Selection
          </p>
          {selectedNode ? (
            <div className="space-y-3 rounded-3xl border border-border bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Node ID</span>
                <span className="font-mono text-sm text-white">{selectedNode.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Label</span>
                <span className="text-sm text-white">{selectedNode.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">x</span>
                <span className="font-mono text-sm text-white">{formatCoordinate(selectedNode.x)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">y</span>
                <span className="font-mono text-sm text-white">{formatCoordinate(selectedNode.y)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Edges</span>
                <span className="text-sm text-white">{selectedNode.edgeCount}</span>
              </div>
              {selectedNode.isStart ? <Badge className="text-[10px]">Start Node</Badge> : null}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-4 text-sm text-slate-400">
              Select a node to inspect its normalized coordinates and edge count.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Canvas Stats
          </p>
          <div className="space-y-3 rounded-3xl border border-border bg-slate-900/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Nodes</span>
              <span className="text-sm text-white">{nodeCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Edges</span>
              <span className="text-sm text-white">{edgeCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Start</span>
              <span className="font-mono text-sm text-white">{startNodeId ?? "None"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Problem Type</span>
              <Badge className="text-[10px]">{problemTypeLabel}</Badge>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
