"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SerializedCanvasPayload } from "@smartroute/shared";
import { Circle, Group, Layer, Line, Stage, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

import { CanvasSidebar, type CanvasSidebarNode } from "@/components/canvas/CanvasSidebar";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";

type CanvasMode = "select" | "add" | "draw" | "start";

interface CanvasNodeState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
}

interface CanvasEdgeState {
  id: string;
  sourceId: string;
  targetId: string;
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface GraphCanvasProps {
  onPayloadChange: (payload: SerializedCanvasPayload) => void;
  initialPayload?: SerializedCanvasPayload;
  width?: number;
  height?: number;
}

const NODE_RADIUS = 20;

export function GraphCanvas({
  onPayloadChange,
  initialPayload,
  width = 720,
  height = 440,
}: GraphCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<CanvasMode>("select");
  const initialState = useMemo(
    () => deserializeCanvas(initialPayload, width, height),
    [height, initialPayload, width],
  );
  const [nodes, setNodes] = useState<CanvasNodeState[]>(initialState.nodes);
  const [edges, setEdges] = useState<CanvasEdgeState[]>(initialState.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialState.selectedNodeId);
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    setNodes(initialState.nodes);
    setEdges(initialState.edges);
    setSelectedNodeId(initialState.selectedNodeId);
    setEdgeSourceId(null);
    setContextMenu(null);
    setMode("select");
  }, [initialState]);

  const serializedPayload = useMemo(
    () => serializeCanvas({ nodes, edges, width, height }),
    [edges, height, nodes, width],
  );

  useEffect(() => {
    onPayloadChange(serializedPayload);
  }, [onPayloadChange, serializedPayload]);

  useEffect(() => {
    if (mode !== "draw") {
      setEdgeSourceId(null);
    }
    setContextMenu(null);
  }, [mode]);

  const selectedNode = useMemo<CanvasSidebarNode | null>(() => {
    if (selectedNodeId === null) {
      return null;
    }

    const node = nodes.find((item) => item.id === selectedNodeId);
    if (!node) {
      return null;
    }

    return {
      id: node.id,
      label: node.label,
      x: normalizeCoordinate(node.x, width),
      y: normalizeCoordinate(node.y, height),
      isStart: node.isStart,
      edgeCount: edges.filter(
        (edge) => edge.sourceId === node.id || edge.targetId === node.id,
      ).length,
    };
  }, [edges, height, nodes, selectedNodeId, width]);

  const modeHint = useMemo(() => {
    if (mode === "add") {
      return "Click any open spot to place the next node. IDs auto-increment from A onward.";
    }

    if (mode === "draw") {
      if (edgeSourceId) {
        return `Source node ${edgeSourceId} is active. Click another node to draw the next edge, or click empty space to cancel.`;
      }

      return "Click one node to start an edge, then click the next node to connect them. New edges continue chaining from the last target.";
    }

    if (mode === "start") {
      return "Click the node that should be highlighted as the route start. The canvas returns to select mode right after.";
    }

    return "Click a node to inspect it, drag to reposition it, and right-click for rename, start, or delete actions.";
  }, [edgeSourceId, mode]);

  function handleStageClick(event: KonvaEventObject<MouseEvent>): void {
    if (event.target !== event.target.getStage()) {
      return;
    }

    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) {
      return;
    }

    setContextMenu(null);

    if (mode === "add") {
      const nextId = nextNodeId(nodes);
      const clampedX = clamp(pointer.x, NODE_RADIUS, width - NODE_RADIUS);
      const clampedY = clamp(pointer.y, NODE_RADIUS, height - NODE_RADIUS);
      const nextNode: CanvasNodeState = {
        id: nextId,
        label: nextId,
        x: clampedX,
        y: clampedY,
        isStart: nodes.length === 0,
      };
      setNodes((current) => [
        ...current.map((node) => ({ ...node, isStart: false })),
        nextNode,
      ]);
      setSelectedNodeId(nextNode.id);
      return;
    }

    if (mode === "draw") {
      setEdgeSourceId(null);
    }

    setSelectedNodeId(null);
  }

  function handleNodeClick(nodeId: string): void {
    setContextMenu(null);

    if (mode === "draw") {
      if (edgeSourceId === null) {
        setEdgeSourceId(nodeId);
        setSelectedNodeId(nodeId);
        return;
      }

      if (edgeSourceId === nodeId) {
        setEdgeSourceId(null);
        return;
      }

      if (!hasEdge(edges, edgeSourceId, nodeId)) {
        setEdges((current) => [
          ...current,
          {
            id: `${edgeSourceId}-${nodeId}`,
            sourceId: edgeSourceId,
            targetId: nodeId,
          },
        ]);
      }

      setEdgeSourceId(nodeId);
      setSelectedNodeId(nodeId);
      return;
    }

    if (mode === "start") {
      setStartNode(nodeId);
      setMode("select");
      setSelectedNodeId(nodeId);
      return;
    }

    setSelectedNodeId(nodeId);
  }

  function handleNodeDragMove(nodeId: string, x: number, y: number): void {
    if (mode !== "select") {
      return;
    }

    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x: clamp(x, NODE_RADIUS, width - NODE_RADIUS),
              y: clamp(y, NODE_RADIUS, height - NODE_RADIUS),
            }
          : node,
      ),
    );
  }

  function handleNodeContextMenu(
    nodeId: string,
    event: KonvaEventObject<PointerEvent>,
  ): void {
    event.evt.preventDefault();
    if (mode !== "select") {
      return;
    }

    const bounds = containerRef.current?.getBoundingClientRect();
    setSelectedNodeId(nodeId);
    setContextMenu({
      nodeId,
      x: (bounds ? event.evt.clientX - bounds.left : event.evt.clientX) + 6,
      y: (bounds ? event.evt.clientY - bounds.top : event.evt.clientY) + 6,
    });
  }

  function handleRenameNode(nodeId: string): void {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    const nextId = window.prompt("Rename node ID", node.id)?.trim();
    if (!nextId || nextId === node.id) {
      setContextMenu(null);
      return;
    }

    if (nodes.some((item) => item.id === nextId)) {
      window.alert(`Node ID '${nextId}' already exists. Use a unique ID.`);
      return;
    }

    setNodes((current) =>
      current.map((item) =>
        item.id === nodeId ? { ...item, id: nextId, label: nextId } : item,
      ),
    );
    setEdges((current) =>
      current.map((edge) => ({
        ...edge,
        id: `${edge.sourceId === nodeId ? nextId : edge.sourceId}-${edge.targetId === nodeId ? nextId : edge.targetId}`,
        sourceId: edge.sourceId === nodeId ? nextId : edge.sourceId,
        targetId: edge.targetId === nodeId ? nextId : edge.targetId,
      })),
    );
    setSelectedNodeId(nextId);
    if (edgeSourceId === nodeId) {
      setEdgeSourceId(nextId);
    }
    setContextMenu(null);
  }

  function handleDeleteNode(nodeId: string): void {
    const remainingNodes = nodes.filter((node) => node.id !== nodeId);
    const nextStartNodeId = remainingNodes.find((node) => node.isStart)?.id ?? null;

    setNodes(
      remainingNodes.map((node, index) => ({
        ...node,
        isStart: nextStartNodeId ? node.id === nextStartNodeId : index === 0,
      })),
    );
    setEdges((current) =>
      current.filter((edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId),
    );
    setSelectedNodeId(null);
    setEdgeSourceId((current) => (current === nodeId ? null : current));
    setContextMenu(null);
  }

  function setStartNode(nodeId: string): void {
    setNodes((current) =>
      current.map((node) => ({ ...node, isStart: node.id === nodeId })),
    );
  }

  function clearCanvas(): void {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setEdgeSourceId(null);
    setContextMenu(null);
    setMode("add");
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-[1.75rem] border border-border bg-slate-950/80"
    >
      <CanvasToolbar mode={mode} onModeChange={(nextMode) => setMode(nextMode)} />
      <div className="flex items-center justify-between gap-4 border-b border-border/80 bg-slate-950/50 px-4 py-3">
        <p className="max-w-2xl text-sm text-slate-300">{modeHint}</p>
        <div className="rounded-full border border-border bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
          {edgeSourceId ? `Source ${edgeSourceId}` : `${nodes.length} nodes / ${edges.length} edges`}
        </div>
      </div>
      <div className="flex flex-col lg:flex-row">
        <div className="relative">
          <Stage
            width={width}
            height={height}
            onClick={handleStageClick}
            className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]"
          >
            <Layer>
              {edges.map((edge) => {
                const source = nodes.find((node) => node.id === edge.sourceId);
                const target = nodes.find((node) => node.id === edge.targetId);
                if (!source || !target) {
                  return null;
                }

                const isHighlighted =
                  edgeSourceId === edge.sourceId || edgeSourceId === edge.targetId;

                return (
                  <Line
                    key={edge.id}
                    points={[source.x, source.y, target.x, target.y]}
                    stroke="#378ADD"
                    strokeWidth={isHighlighted ? 2.4 : 1.6}
                    opacity={isHighlighted ? 0.95 : 0.65}
                    lineCap="round"
                  />
                );
              })}

              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isEdgeSource = edgeSourceId === node.id;
                const fill = node.isStart ? "#EAF3DE" : "#E6F1FB";
                const stroke = node.isStart ? "#639922" : "#378ADD";
                const text = node.isStart ? "#3B6D11" : "#0C447C";

                return (
                  <Group
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    draggable={mode === "select"}
                    onClick={() => handleNodeClick(node.id)}
                    onDragMove={(event: KonvaEventObject<DragEvent>) =>
                      handleNodeDragMove(node.id, event.target.x(), event.target.y())
                    }
                    onContextMenu={(event: KonvaEventObject<PointerEvent>) =>
                      handleNodeContextMenu(node.id, event)
                    }
                  >
                    {isSelected || isEdgeSource ? (
                      <Circle
                        radius={NODE_RADIUS + 6}
                        stroke="#60A5FA"
                        strokeWidth={2}
                        opacity={0.45}
                      />
                    ) : null}
                    <Circle radius={NODE_RADIUS} fill={fill} stroke={stroke} strokeWidth={2} />
                    <Text
                      text={node.label}
                      width={NODE_RADIUS * 2}
                      height={NODE_RADIUS * 2}
                      offsetX={NODE_RADIUS}
                      offsetY={NODE_RADIUS}
                      align="center"
                      verticalAlign="middle"
                      fill={text}
                      fontSize={13}
                      fontStyle="600"
                    />
                    {node.isStart ? (
                      <Text
                        text="Start"
                        width={58}
                        offsetX={29}
                        y={NODE_RADIUS + 6}
                        align="center"
                        fill={text}
                        fontSize={10}
                        opacity={0.8}
                      />
                    ) : null}
                  </Group>
                );
              })}
            </Layer>
          </Stage>

          {nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="rounded-3xl border border-dashed border-border bg-slate-950/85 px-5 py-4 text-center text-sm text-slate-300 shadow-xl">
                Use <span className="font-semibold text-white">Add</span> to place nodes or load a draw sample above the canvas.
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-blue-500/30 bg-slate-950/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-blue-200">
            {mode}
          </div>
        </div>

        <CanvasSidebar
          modeLabel={mode}
          modeHint={modeHint}
          selectedNode={selectedNode}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          startNodeId={nodes.find((node) => node.isStart)?.id ?? null}
          problemTypeLabel="TSP"
          pendingEdgeSourceId={edgeSourceId}
          onClearCanvas={clearCanvas}
        />
      </div>

      {contextMenu ? (
        <div
          className="absolute z-20 min-w-40 rounded-2xl border border-border bg-slate-950/95 p-2 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => handleRenameNode(contextMenu.nodeId)}
          >
            Rename
          </button>
          <button
            type="button"
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => {
              setStartNode(contextMenu.nodeId);
              setContextMenu(null);
            }}
          >
            Set as start
          </button>
          <button
            type="button"
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
            onClick={() => handleDeleteNode(contextMenu.nodeId)}
          >
            Delete node
          </button>
        </div>
      ) : null}
    </div>
  );
}

function deserializeCanvas(
  payload: SerializedCanvasPayload | undefined,
  width: number,
  height: number,
): {
  nodes: CanvasNodeState[];
  edges: CanvasEdgeState[];
  selectedNodeId: string | null;
} {
  const raw = payload?.payload;
  if (!raw) {
    return { nodes: [], edges: [], selectedNodeId: null };
  }

  const startNodeId = raw.startNodeId ?? null;
  const nodes = raw.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    x: denormalizeCoordinate(node.x, width),
    y: denormalizeCoordinate(node.y, height),
    isStart: node.id === startNodeId,
  }));
  const edges = raw.edges.map((edge) => ({
    id: `${edge.sourceId}-${edge.targetId}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
  }));

  return {
    nodes,
    edges,
    selectedNodeId: nodes[0]?.id ?? null,
  };
}

function serializeCanvas({
  nodes,
  edges,
  width,
  height,
}: {
  nodes: CanvasNodeState[];
  edges: CanvasEdgeState[];
  width: number;
  height: number;
}): SerializedCanvasPayload {
  return {
    inputType: "gui",
    payload: {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.label,
        x: normalizeCoordinate(node.x, width),
        y: normalizeCoordinate(node.y, height),
      })),
      edges: edges.map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      })),
      startNodeId: nodes.find((node) => node.isStart)?.id ?? null,
      returnToStart: true,
      objective: "min_distance",
    },
  };
}

function normalizeCoordinate(value: number, size: number): number {
  return Number(((value / size) * 100).toFixed(2));
}

function denormalizeCoordinate(value: number, size: number): number {
  return clamp((value / 100) * size, NODE_RADIUS, size - NODE_RADIUS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hasEdge(edges: CanvasEdgeState[], sourceId: string, targetId: string): boolean {
  return edges.some(
    (edge) =>
      (edge.sourceId === sourceId && edge.targetId === targetId) ||
      (edge.sourceId === targetId && edge.targetId === sourceId),
  );
}

function nextNodeId(nodes: CanvasNodeState[]): string {
  const existing = new Set(nodes.map((node) => node.id));
  let index = 0;
  while (true) {
    const candidate = indexToLabel(index);
    if (!existing.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

function indexToLabel(index: number): string {
  let current = index;
  let label = "";

  while (true) {
    const remainder = current % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor(current / 26) - 1;
    if (current < 0) {
      return label;
    }
  }
}
