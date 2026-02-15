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
        className={`text-2xl font-serif font-bold block transition-all ${
          night
            ? "text-violet-light sacred-glow"
            : "text-foreground/75"
        }`}
      >
        Nigh
      </span>
      <span className={`text-xs uppercase tracking-[0.15em] transition-colors ${night ? "text-foreground/60" : "text-foreground/65"}`}>
        AGI
      </span>
    </button>
  );
}
