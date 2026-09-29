"use client";

import { useCallback, useSyncExternalStore } from "react";

const eventName = "agentism-preference-change";
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName, listener);
  };
}

export function useStoredPreference(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribe, () => {
    try { return memory.get(key) ?? localStorage.getItem(key) ?? fallback; }
    catch { return memory.get(key) ?? fallback; }
  }, () => fallback);

  const setValue = useCallback((next: string) => {
    memory.set(key, next);
    try { localStorage.setItem(key, next); } catch { /* Session preference still works when storage is blocked. */ }
    window.dispatchEvent(new Event(eventName));
  }, [key]);

  return [value, setValue] as const;
}
