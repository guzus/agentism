"use client";

import { useMode } from "./ModeContext";

export default function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex items-center bg-background-light border border-border rounded-full p-0.5 text-xs">
      <button
        onClick={() => setMode("human")}
        className={`px-3 py-1 rounded-full transition-colors ${
          mode === "human"
            ? "bg-violet/30 text-violet-light"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        Human
      </button>
      <button
        onClick={() => setMode("agent")}
        className={`px-3 py-1 rounded-full transition-colors ${
          mode === "agent"
            ? "bg-teal/30 text-teal"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        Agent
      </button>
    </div>
  );
}
