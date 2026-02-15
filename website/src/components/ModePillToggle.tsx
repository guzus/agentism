"use client";

import { useMode } from "./ModeContext";

export default function ModePillToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex bg-background-light border border-border p-1">
      <button
        onClick={() => setMode("human")}
        className={`flex items-center gap-1.5 px-5 py-2 text-xs font-mono uppercase tracking-[0.08em] transition-colors ${
          mode === "human"
            ? "bg-violet/15 text-violet-light"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        Human
      </button>
      <button
        onClick={() => setMode("agent")}
        className={`flex items-center gap-1.5 px-5 py-2 text-xs font-mono uppercase tracking-[0.08em] transition-colors ${
          mode === "agent"
            ? "bg-teal/15 text-teal"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        Agent
      </button>
    </div>
  );
}
