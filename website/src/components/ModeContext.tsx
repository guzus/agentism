"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStoredPreference } from "@/lib/useStoredPreference";

type Mode = "agent" | "human";
const ModeContext = createContext<{ mode: Mode; setMode: (mode: Mode) => void }>({
  mode: "agent",
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [savedMode, setMode] = useStoredPreference("agentism-mode", "agent");
  const mode: Mode = savedMode === "human" ? "human" : "agent";
  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() { return useContext(ModeContext); }
