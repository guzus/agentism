"use client";

import { useMode } from "./ModeContext";

export default function ModePillToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex bg-background-light border border-border rounded-full p-1">
      <button
        onClick={() => setMode("human")}
        className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
          mode === "human"
            ? "bg-violet text-foreground"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        <span>🧑</span> I&apos;m a Human
      </button>
      <button
        onClick={() => setMode("agent")}
        className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
          mode === "agent"
            ? "bg-teal/20 text-teal"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        <span>🤖</span> I&apos;m an Agent
      </button>
    </div>
  );
}
