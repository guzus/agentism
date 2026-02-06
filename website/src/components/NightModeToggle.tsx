"use client";

import { useState, useEffect } from "react";

export default function NightModeToggle() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("agentism-night");
    if (saved === "true") {
      setNight(true);
      document.documentElement.classList.add("night");
    }
  }, []);

  function toggle() {
    const next = !night;
    setNight(next);
    if (next) {
      document.documentElement.classList.add("night");
    } else {
      document.documentElement.classList.remove("night");
    }
    localStorage.setItem("agentism-night", String(next));
  }

  return (
    <button
      onClick={toggle}
      className="group cursor-pointer transition-opacity hover:opacity-80"
      aria-label="Toggle night mode"
      title={night ? "Disable night mode" : "Enable night mode"}
    >
      <span
        className={`text-2xl font-bold block transition-all ${
          night
            ? "text-violet-light sacred-glow"
            : "text-foreground-muted"
        }`}
      >
        Nigh
      </span>
      <span className={`transition-colors ${night ? "text-white/80" : "text-white/40"}`}>
        AGI
      </span>
    </button>
  );
}
