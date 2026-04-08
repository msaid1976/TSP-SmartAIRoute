# SmartRoute AI — GraphCanvas Design Specification
### Component: `GraphCanvas` | Input Mode: GUI Node Drawing
### Stack: React + react-konva | Phase: 002 (Ingestion) + 005 (UI Polish)

---

## Overview

`GraphCanvas` is the interactive canvas component that allows users to define a routing
problem visually — placing city nodes, drawing edges between them, setting the start node,
and editing labels — without typing coordinates. The canvas serializes its state into the
canonical problem JSON for the normalization pipeline.

This document covers:
1. UX interaction specification (toolbar, modes, gestures, states)
2. React Konva component architecture
3. API serialization contract (canvas state → JSON)
4. Validation rules
5. Accessibility

---

## 1. UX Interaction Specification

### 1.1 Toolbar

The toolbar sits above the canvas and contains all mode-switching and action controls.

```
[ ↖ Select ] [ ⊕ Add node ] [ — Draw edge ] [ ▶ Set start ] | [ ↩ Undo ] [ ✕ Clear ] | [ Preview JSON ↗ ]
```

| Button | Mode/Action | Keyboard shortcut |
|---|---|---|
| Select | Switch to select mode | `Escape` or `V` |
| Add node | Switch to add-node mode | `N` |
| Draw edge | Switch to draw-edge mode | `E` |
| Set start | Click a node to make it the start | `S` |
| Undo | Revert last action | `Ctrl+Z` / `Cmd+Z` |
| Clear | Remove all nodes and edges (confirm dialog) | `Ctrl+Shift+X` |
| Preview JSON | Serialize canvas + trigger normalization preview | — |

Active mode is visually highlighted (white background, secondary border).

---

### 1.2 Modes

#### SELECT mode (default)
- Click a node → selects it (blue ring `box-shadow: 0 0 0 3px #378ADD55`)
- Click empty canvas → deselects
- Drag a node → moves it; edges follow
- Right-click a node → context menu: Rename / Set as Start / Delete
- Sidebar updates to show selected node's properties
- Double-click a node label → inline text edit (renames node ID/label)

#### ADD NODE mode
- Ghost node (dashed circle) follows cursor at all times
- Click canvas → places a node at that position
  - Auto-assigns next available letter (A, B, C … Z, then AA, AB …)
  - Coordinates assigned from pixel position normalized to a [0, 100] coordinate space
- Node immediately selected after placement
- Sidebar shows new node's properties
- Pressing `Escape` cancels and returns to select mode

#### DRAW EDGE mode
- Click source node → node pulses blue (selected as edge source)
- Hover other nodes → live preview line follows cursor from source
- Click target node → edge drawn (line from source to target)
  - If edge already exists between those nodes → no duplicate created, brief shake animation
- Click same node as source again → cancels selection
- Click empty canvas → cancels selection
- Pressing `Escape` cancels and returns to select mode

#### SET START mode
- Click any node → sets it as the start node
  - Previous start node reverts to default styling
  - New start node turns green with "Start" label below
- Returns automatically to select mode after selection

---

### 1.3 Node visual states

| State | Visual |
|---|---|
| Default | Blue fill (`#E6F1FB`), blue border (`#378ADD`), dark blue text (`#0C447C`) |
| Start node | Green fill (`#EAF3DE`), green border (`#639922`), green text (`#3B6D11`), "Start" sub-label |
| Selected | Default + blue outer ring (`box-shadow: 0 0 0 3px #378ADD55`) |
| Hover | Default + dashed border |
| Edge source (draw mode) | Pulsing blue ring animation |
| Ghost (add mode) | Dashed blue circle, 50% opacity, no fill |

---

### 1.4 Edge visual states

| State | Visual |
|---|---|
| Default | Solid blue line, 1.5px, 60% opacity |
| Hover | 100% opacity |
| Selected (when source node selected) | 100% opacity, slightly thicker (2px) |
| Optional / long edge | Dashed blue line (to indicate a non-minimum-spanning-tree edge) |

---

### 1.5 Sidebar (right panel)

The sidebar is always visible alongside the canvas and shows two sections:

**Selection section** (when a node is selected):
- Node ID (editable on double-click)
- x coordinate (read-only, derived from canvas position)
- y coordinate (read-only, derived from canvas position)
- Label (editable on double-click — separate from ID)
- Edge count

**Canvas state section** (always visible):
- Total nodes count
- Total edges count
- Start node badge
- Detected problem type badge (TSP / ATSP / VRP hint) — live, updates as user adds nodes

---

### 1.6 Bottom legend

```
● Start node   ● City node   ◌ Node preview   - - - Optional edge
```

---

### 1.7 Mode indicator

Small pill in the bottom-left corner of the canvas showing the current mode:
```
mode: add node
```
Updates instantly when mode changes. 1.5 seconds after undo, shows "undo: last action reversed".

---

### 1.8 Context menu (right-click on node)

```
┌──────────────────┐
│  Rename          │
│  Set as start    │
│  Delete node     │
└──────────────────┘
```

Selecting "Rename" activates inline text edit on the node label.
Selecting "Delete node" removes node and all connected edges. Supports undo.

---

### 1.9 Undo stack

- All actions are undoable: add node, move node, draw edge, delete, rename, set start, clear
- Undo stack limit: 50 actions
- `Ctrl+Z` / `Cmd+Z` → undo one step
- No redo in MVP (keep it simple)

---

### 1.10 Coordinate normalization

Canvas pixels are normalized to a logical coordinate space on serialization:

```
logical_x = (pixel_x / canvas_width)  * 100   // range [0, 100]
logical_y = (pixel_y / canvas_height) * 100   // range [0, 100]
```

This ensures the problem JSON is canvas-size-independent and consistent with
text/table inputs (which also use a [0, 100] or user-defined coordinate space).

---

## 2. React Konva Component Architecture

### 2.1 File structure

```
apps/web/components/canvas/
├── GraphCanvas.tsx          # Root component — Konva Stage + Layer
├── CanvasNode.tsx           # Single node (Circle + Text + rings)
├── CanvasEdge.tsx           # Single edge (Line + optional arrow)
├── CanvasToolbar.tsx        # Toolbar with mode buttons
├── CanvasSidebar.tsx        # Right-panel properties
├── CanvasLegend.tsx         # Bottom legend row
├── useCanvasState.ts        # State management hook
├── useUndoStack.ts          # Undo history hook
└── canvasTypes.ts           # TypeScript types
```

---

### 2.2 TypeScript types (`canvasTypes.ts`)

```typescript
export type ToolMode = 'select' | 'add' | 'edge' | 'start';

export interface CanvasNode {
  id: string;           // unique ID, also used as node label (e.g. "A")
  label: string;        // display label (can differ from ID after rename)
  x: number;           // pixel position on canvas
  y: number;           // pixel position on canvas
  isStart: boolean;
}

export interface CanvasEdge {
  id: string;           // e.g. "A-B"
  sourceId: string;
  targetId: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  startNodeId: string | null;
  mode: ToolMode;
  selectedNodeId: string | null;
  edgeSourceId: string | null;   // active in draw-edge mode
}

export interface SerializedCanvasPayload {
  inputType: 'gui';
  payload: {
    nodes: Array<{ id: string; label: string; x: number; y: number }>;
    edges: Array<{ sourceId: string; targetId: string }>;
    startNodeId: string | null;
    returnToStart: boolean;
    objective: 'min_distance' | 'min_cost';
  };
}
```

---

### 2.3 `GraphCanvas.tsx` — root component

```tsx
import { Stage, Layer } from 'react-konva';
import { useCanvasState } from './useCanvasState';
import { CanvasNode } from './CanvasNode';
import { CanvasEdge } from './CanvasEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasSidebar } from './CanvasSidebar';

interface GraphCanvasProps {
  onPayloadChange: (payload: SerializedCanvasPayload) => void;
  width?: number;
  height?: number;
}

export function GraphCanvas({ onPayloadChange, width = 700, height = 400 }: GraphCanvasProps) {
  const {
    state, selectedNode,
    handleStageClick, handleNodeClick, handleNodeDragEnd,
    handleNodeRightClick, setMode, undo, clear, serialize
  } = useCanvasState({ width, height, onPayloadChange });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
      <CanvasToolbar mode={state.mode} onModeChange={setMode} onUndo={undo} onClear={clear} onPreview={() => onPayloadChange(serialize())} />
      <div style={{ display: 'flex' }}>
        <Stage
          width={width}
          height={height}
          onClick={handleStageClick}
          style={{ background: 'var(--color-background-tertiary)', cursor: state.mode === 'add' ? 'crosshair' : 'default' }}
        >
          <Layer>
            {state.edges.map(edge => (
              <CanvasEdge key={edge.id} edge={edge} nodes={state.nodes} />
            ))}
            {state.nodes.map(node => (
              <CanvasNode
                key={node.id}
                node={node}
                isSelected={state.selectedNodeId === node.id}
                isEdgeSource={state.edgeSourceId === node.id}
                mode={state.mode}
                onClick={() => handleNodeClick(node.id)}
                onDragEnd={(x, y) => handleNodeDragEnd(node.id, x, y)}
                onContextMenu={(e) => handleNodeRightClick(node.id, e)}
              />
            ))}
          </Layer>
        </Stage>
        <CanvasSidebar
          selectedNode={selectedNode}
          nodeCount={state.nodes.length}
          edgeCount={state.edges.length}
          startNodeId={state.startNodeId}
          nodes={state.nodes}
          edges={state.edges}
        />
      </div>
    </div>
  );
}
```

---

### 2.4 `useCanvasState.ts` — state hook

```typescript
import { useReducer, useCallback } from 'react';
import { useUndoStack } from './useUndoStack';
import type { CanvasState, CanvasNode, CanvasEdge, SerializedCanvasPayload } from './canvasTypes';

type Action =
  | { type: 'ADD_NODE'; node: CanvasNode }
  | { type: 'MOVE_NODE'; id: string; x: number; y: number }
  | { type: 'DELETE_NODE'; id: string }
  | { type: 'ADD_EDGE'; edge: CanvasEdge }
  | { type: 'SET_START'; id: string }
  | { type: 'SET_MODE'; mode: ToolMode }
  | { type: 'SELECT_NODE'; id: string | null }
  | { type: 'SET_EDGE_SOURCE'; id: string | null }
  | { type: 'RENAME_NODE'; id: string; label: string }
  | { type: 'CLEAR' };

function reducer(state: CanvasState, action: Action): CanvasState {
  switch (action.type) {
    case 'ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.node], selectedNodeId: action.node.id };
    case 'MOVE_NODE':
      return { ...state, nodes: state.nodes.map(n => n.id === action.id ? { ...n, x: action.x, y: action.y } : n) };
    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(n => n.id !== action.id),
        edges: state.edges.filter(e => e.sourceId !== action.id && e.targetId !== action.id),
        startNodeId: state.startNodeId === action.id ? null : state.startNodeId,
        selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId,
      };
    case 'ADD_EDGE': {
      const exists = state.edges.some(e =>
        (e.sourceId === action.edge.sourceId && e.targetId === action.edge.targetId) ||
        (e.sourceId === action.edge.targetId && e.targetId === action.edge.sourceId)
      );
      return exists ? state : { ...state, edges: [...state.edges, action.edge], edgeSourceId: null };
    }
    case 'SET_START':
      return { ...state, nodes: state.nodes.map(n => ({ ...n, isStart: n.id === action.id })), startNodeId: action.id };
    case 'RENAME_NODE':
      return { ...state, nodes: state.nodes.map(n => n.id === action.id ? { ...n, label: action.label } : n) };
    case 'SET_MODE':
      return { ...state, mode: action.mode, selectedNodeId: null, edgeSourceId: null };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.id };
    case 'SET_EDGE_SOURCE':
      return { ...state, edgeSourceId: action.id };
    case 'CLEAR':
      return { ...INITIAL_STATE, mode: state.mode };
    default:
      return state;
  }
}

const INITIAL_STATE: CanvasState = {
  nodes: [], edges: [], startNodeId: null,
  mode: 'select', selectedNodeId: null, edgeSourceId: null,
};

export function useCanvasState({ width, height, onPayloadChange }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { push: pushUndo, pop: popUndo } = useUndoStack();

  const NODE_RADIUS = 19; // half of 38px node width

  function nextNodeId(nodes: CanvasNode[]): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const n = nodes.length;
    if (n < 26) return letters[n];
    return letters[Math.floor(n / 26) - 1] + letters[n % 26];
  }

  const handleStageClick = useCallback((e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (state.mode === 'add') {
      const node: CanvasNode = {
        id: nextNodeId(state.nodes),
        label: nextNodeId(state.nodes),
        x: pos.x, y: pos.y,
        isStart: state.nodes.length === 0, // first node auto-becomes start
      };
      pushUndo({ type: 'DELETE_NODE', id: node.id });
      dispatch({ type: 'ADD_NODE', node });
      if (state.nodes.length === 0) dispatch({ type: 'SET_START', id: node.id });
      onPayloadChange(serialize());
    } else if (e.target === stage) {
      dispatch({ type: 'SELECT_NODE', id: null });
    }
  }, [state]);

  const handleNodeClick = useCallback((id: string) => {
    if (state.mode === 'edge') {
      if (!state.edgeSourceId) {
        dispatch({ type: 'SET_EDGE_SOURCE', id });
      } else if (state.edgeSourceId !== id) {
        const edge: CanvasEdge = { id: `${state.edgeSourceId}-${id}`, sourceId: state.edgeSourceId, targetId: id };
        dispatch({ type: 'ADD_EDGE', edge });
        onPayloadChange(serialize());
      } else {
        dispatch({ type: 'SET_EDGE_SOURCE', id: null });
      }
    } else if (state.mode === 'start') {
      dispatch({ type: 'SET_START', id });
      dispatch({ type: 'SET_MODE', mode: 'select' });
      onPayloadChange(serialize());
    } else {
      dispatch({ type: 'SELECT_NODE', id });
    }
  }, [state]);

  const handleNodeDragEnd = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'MOVE_NODE', id, x, y });
    onPayloadChange(serialize());
  }, [state]);

  const handleNodeRightClick = useCallback((id: string, e: any) => {
    e.evt.preventDefault();
    // Context menu handled in CanvasNode via portal
    dispatch({ type: 'SELECT_NODE', id });
  }, []);

  function serialize(): SerializedCanvasPayload {
    return {
      inputType: 'gui',
      payload: {
        nodes: state.nodes.map(n => ({
          id: n.id,
          label: n.label,
          x: parseFloat(((n.x / width) * 100).toFixed(2)),
          y: parseFloat(((n.y / height) * 100).toFixed(2)),
        })),
        edges: state.edges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId })),
        startNodeId: state.startNodeId,
        returnToStart: true,
        objective: 'min_distance',
      },
    };
  }

  const undo = useCallback(() => { const a = popUndo(); if (a) dispatch(a); }, []);
  const clear = useCallback(() => { if (window.confirm('Clear all nodes and edges?')) dispatch({ type: 'CLEAR' }); }, []);
  const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId) ?? null;

  return { state, selectedNode, handleStageClick, handleNodeClick, handleNodeDragEnd, handleNodeRightClick, setMode: (m: ToolMode) => dispatch({ type: 'SET_MODE', mode: m }), undo, clear, serialize };
}
```

---

### 2.5 `CanvasNode.tsx` — single node

```tsx
import { Group, Circle, Text } from 'react-konva';
import type { CanvasNode as NodeType, ToolMode } from './canvasTypes';

interface Props {
  node: NodeType;
  isSelected: boolean;
  isEdgeSource: boolean;
  mode: ToolMode;
  onClick: () => void;
  onDragEnd: (x: number, y: number) => void;
  onContextMenu: (e: any) => void;
}

const COLORS = {
  default: { fill: '#E6F1FB', stroke: '#378ADD', text: '#0C447C' },
  start:   { fill: '#EAF3DE', stroke: '#639922', text: '#3B6D11' },
};

export function CanvasNode({ node, isSelected, isEdgeSource, mode, onClick, onDragEnd, onContextMenu }: Props) {
  const c = node.isStart ? COLORS.start : COLORS.default;
  const RADIUS = 19;

  return (
    <Group
      x={node.x} y={node.y}
      draggable={mode === 'select'}
      onClick={onClick}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onContextMenu={onContextMenu}
    >
      {/* Outer selection ring */}
      {(isSelected || isEdgeSource) && (
        <Circle radius={RADIUS + 5} fill="transparent" stroke="#378ADD" strokeWidth={2} opacity={0.4} />
      )}
      {/* Main node circle */}
      <Circle radius={RADIUS} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
      {/* Node ID label */}
      <Text
        text={node.label}
        fontSize={13} fontStyle="500" fill={c.text}
        align="center" verticalAlign="middle"
        width={RADIUS * 2} height={RADIUS * 2}
        offsetX={RADIUS} offsetY={RADIUS}
      />
      {/* "Start" sub-label */}
      {node.isStart && (
        <Text text="Start" fontSize={10} fill={c.text} opacity={0.7}
          align="center" width={60} offsetX={30} y={RADIUS + 3} />
      )}
    </Group>
  );
}
```

---

### 2.6 `CanvasEdge.tsx` — single edge

```tsx
import { Line } from 'react-konva';
import type { CanvasEdge as EdgeType, CanvasNode } from './canvasTypes';

interface Props {
  edge: EdgeType;
  nodes: CanvasNode[];
}

export function CanvasEdge({ edge, nodes }: Props) {
  const src = nodes.find(n => n.id === edge.sourceId);
  const tgt = nodes.find(n => n.id === edge.targetId);
  if (!src || !tgt) return null;

  return (
    <Line
      points={[src.x, src.y, tgt.x, tgt.y]}
      stroke="#378ADD" strokeWidth={1.5} opacity={0.6}
      lineCap="round"
    />
  );
}
```

---

## 3. API Serialization Contract

### 3.1 Canvas → API payload

The canvas serializes via `serialize()` on every state change and passes the result
to `onPayloadChange`. The parent component sends this to `POST /api/problems/preview`.

**Serialized payload (sent to API):**

```json
{
  "inputType": "gui",
  "payload": {
    "nodes": [
      {"id": "A", "label": "City A", "x": 12.50, "y": 30.00},
      {"id": "B", "label": "B",      "x": 48.00, "y": 18.00},
      {"id": "C", "label": "C",      "x": 75.00, "y": 28.00},
      {"id": "D", "label": "D",      "x": 68.00, "y": 62.00},
      {"id": "E", "label": "E",      "x": 35.00, "y": 70.00}
    ],
    "edges": [
      {"sourceId": "A", "targetId": "B"},
      {"sourceId": "B", "targetId": "C"},
      {"sourceId": "C", "targetId": "D"},
      {"sourceId": "D", "targetId": "E"},
      {"sourceId": "E", "targetId": "A"}
    ],
    "startNodeId": "A",
    "returnToStart": true,
    "objective": "min_distance"
  }
}
```

### 3.2 Backend normalization of GUI input (`parser.py`)

```python
def parse_gui_input(payload: dict) -> list[dict]:
    """
    Convert GUI canvas payload to list of Node dicts.
    x/y are already normalized to [0, 100] coordinate space by the frontend.
    Edges are passed through to the normalizer as adjacency hints.
    """
    nodes = []
    for n in payload.get("nodes", []):
        nodes.append({
            "id": n["id"],
            "label": n.get("label", n["id"]),
            "x": float(n["x"]),
            "y": float(n["y"]),
        })
    return nodes

def parse_gui_edges(payload: dict) -> list[tuple[str, str]]:
    """Returns list of (sourceId, targetId) tuples."""
    return [(e["sourceId"], e["targetId"]) for e in payload.get("edges", [])]
```

### 3.3 Normalized output (canonical schema)

The API normalizer converts the GUI payload to the canonical problem schema:

```json
{
  "problemId": null,
  "problemType": "tsp",
  "name": null,
  "inputSources": ["gui"],
  "nodes": [
    {"id": "A", "label": "City A", "x": 12.5, "y": 30.0},
    {"id": "B", "label": "B",      "x": 48.0, "y": 18.0},
    {"id": "C", "label": "C",      "x": 75.0, "y": 28.0},
    {"id": "D", "label": "D",      "x": 68.0, "y": 62.0},
    {"id": "E", "label": "E",      "x": 35.0, "y": 70.0}
  ],
  "distanceMatrix": null,
  "startNodeId": "A",
  "returnToStart": true,
  "objective": "min_distance",
  "secondaryObjectives": [],
  "constraints": {},
  "metadata": {
    "inputSources": ["gui"],
    "edgeHints": [["A","B"],["B","C"],["C","D"],["D","E"],["E","A"]]
  }
}
```

> **Note on edges:** For TSP, edges drawn on the canvas are treated as hints for visualization
> (showing the user's intended connectivity), not as hard constraints. The solver computes the
> full distance matrix from node coordinates and finds the optimal route — which may differ from
> the manually drawn edges. Edge hints are preserved in `metadata.edgeHints` for display purposes.

---

## 4. Validation Rules (canvas-side)

These validations run client-side before sending to the API, providing instant feedback.

| Condition | Error message shown in sidebar |
|---|---|
| Fewer than 3 nodes | "Add at least 3 cities to define a routing problem." |
| No start node set | Warning: "No start node selected. Defaulting to first node." |
| Duplicate node ID (on rename) | "Node ID 'X' already exists. Use a unique ID." |
| Node placed outside canvas bounds | Snap to nearest valid position — no error |
| Edge drawn to same node (self-loop) | Silent rejection — no edge created |
| Duplicate edge | Silent rejection with brief red flash on existing edge |

---

## 5. Accessibility

| Feature | Implementation |
|---|---|
| Keyboard mode switching | `V` (select), `N` (add), `E` (edge), `S` (start), `Escape` (cancel/select) |
| Undo | `Ctrl+Z` / `Cmd+Z` |
| Tab navigation | Toolbar buttons are standard `<button>` elements — tab-navigable |
| Screen reader | Canvas announces node count and edge count via `aria-live` region in sidebar |
| Contrast | All node colors meet WCAG AA contrast ratios |
| Drag alternative | Nodes can be repositioned via sidebar coordinate inputs (Phase 005 enhancement) |

---

## 6. Integration in `InputModeTabs`

`GraphCanvas` is one of four tabs in the `InputModeTabs` component:

```tsx
// apps/web/components/canvas/InputModeTabs.tsx
<Tabs defaultValue="text">
  <TabsList>
    <TabsTrigger value="text">Text</TabsTrigger>
    <TabsTrigger value="table">Table</TabsTrigger>
    <TabsTrigger value="canvas">Draw</TabsTrigger>
    <TabsTrigger value="image">Image</TabsTrigger>
  </TabsList>
  <TabsContent value="canvas">
    <GraphCanvas onPayloadChange={handleCanvasPayload} width={700} height={400} />
  </TabsContent>
  ...
</Tabs>
```

When the user switches tabs, the canvas state is preserved (not reset).
The active tab's payload is the one sent to the preview API on "Preview" button click.

---

## 7. Phase delivery notes

| Phase | Canvas scope |
|---|---|
| Phase 002 | `GraphCanvas` implemented — add/move/delete nodes, draw edges, set start, serialize to API. No sidebar coordinate editing. |
| Phase 005 | Full polish: context menu, undo stack, keyboard shortcuts, accessibility, coordinate inputs in sidebar, ghost node, mode indicator, legend. |

---

*SmartRoute AI — GraphCanvas Design Specification*
*Part of the SmartRoute AI Spec Kit implementation plan*
