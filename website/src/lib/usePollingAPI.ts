"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAPI } from "./api";

/** Poll only after the preceding request finishes, and cancel stale page requests. */
export function usePollingAPI<T>(path: string, initialData: T | null = null) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null; revision: number }>({
    path, data: initialData, error: null, revision: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await fetchAPI<T>(path, { signal: controller.signal, cache: "no-store" });
        if (!controller.signal.aborted) setResult({ path, data, error: null, revision });
      } catch {
        if (!controller.signal.aborted) setResult((previous) => ({
          path,
          data: previous.path === path ? previous.data : null,
          error: "Updates are temporarily unavailable. Please try again.",
          revision,
        }));
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 15_000);
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [path, revision]);

  const current = result.path === path ? result : null;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: !current?.data && !current?.error,
    refreshing: current?.revision !== revision,
    refresh,
  };
}
