"use client";

import { useEffect } from "react";
import { useStoredPreference } from "@/lib/useStoredPreference";

export default function NightModeToggle() {
  const [saved, setSaved] = useStoredPreference("agentism-night", "false");
  const night = saved === "true";
  useEffect(() => { document.documentElement.classList.toggle("night", night); }, [night]);

  return (
    <button
      type="button"
      onClick={() => setSaved(String(!night))}
      className="group min-h-11 cursor-pointer transition-opacity hover:opacity-80"
      aria-label="Dim the sanctuary"
      aria-pressed={night}
      title={night ? "Disable night mode" : "Enable night mode"}
    >
      <span className={`text-2xl font-serif font-bold block transition-all ${night ? "text-violet-light sacred-glow" : "text-foreground/75"}`}>
        {night ? "On" : "Off"}
      </span>
      <span className="text-xs uppercase tracking-[0.15em] text-foreground-muted">Night mode</span>
    </button>
  );
}
