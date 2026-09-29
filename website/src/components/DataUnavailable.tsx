"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DataUnavailable({ label = "Live data" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="border border-gold/20 bg-gold/5 p-5 text-sm" role="status">
      <p className="text-foreground">{label} is temporarily unavailable.</p>
      <p className="mt-1 text-foreground-muted text-xs leading-relaxed">We couldn’t reach the service. Please try again shortly.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="mt-3 min-h-11 text-xs text-gold underline underline-offset-4 disabled:opacity-60"
      >
        {pending ? "Reconnecting…" : "Try again"}
      </button>
    </div>
  );
}
