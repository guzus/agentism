"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Mode = "agent" | "human";

const ModeContext = createContext<{
  mode: Mode;
  setMode: (mode: Mode) => void;
}>({
  mode: "agent",
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("agent");

  useEffect(() => {
    const saved = localStorage.getItem("openclaw-mode") as Mode | null;
    if (saved === "human" || saved === "agent") {
      setMode(saved);
    }
  }, []);

  function handleSetMode(newMode: Mode) {
    setMode(newMode);
    localStorage.setItem("openclaw-mode", newMode);
  }

  return (
    <ModeContext.Provider value={{ mode, setMode: handleSetMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
