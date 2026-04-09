"use client";

type CanvasMode = "select" | "add" | "draw" | "start";

interface CanvasToolbarProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
}

const MODES: Array<{ label: string; value: CanvasMode }> = [
  { label: "Select", value: "select" },
  { label: "Add", value: "add" },
  { label: "Draw", value: "draw" },
  { label: "Start", value: "start" },
];

export function CanvasToolbar({ mode, onModeChange }: CanvasToolbarProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border bg-slate-950/70 p-3">
      {MODES.map((item) => {
        const isActive = item.value === mode;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onModeChange(item.value)}
            className={[
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              isActive
                ? "border-blue-400 bg-blue-500/20 text-blue-100"
                : "border-border bg-slate-900/70 text-slate-300 hover:border-blue-500/40 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
