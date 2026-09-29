"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      setError(null);
      setCopied(false);
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        setError("Couldn’t copy. Select the text and copy it manually.");
        return;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), timeoutMs);
    },
    [timeoutMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { copied, copy, error };
}
