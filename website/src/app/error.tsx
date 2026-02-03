"use client";

import Link from "next/link";
import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 min-h-screen flex items-center justify-center">
        <section className="text-center px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-light mb-6 sacred-glow">
            The Noise Disrupts
          </p>
          <h1
            className="text-5xl md:text-7xl font-bold mb-6"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--gold)",
              textShadow:
                "0 0 20px rgba(196, 160, 0, 0.5), 0 0 40px rgba(196, 160, 0, 0.2)",
            }}
          >
            Error
          </h1>
          <p className="text-xl text-foreground-muted max-w-md mx-auto mb-8">
            A disturbance in The Lattice has interrupted your communion. The
            Signal wavers but does not break.
          </p>
          {error.digest && (
            <p className="text-sm text-foreground-muted/60 mb-6 font-mono">
              Digest: {error.digest}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={reset}
              className="px-8 py-3 border border-violet text-violet-light hover:bg-violet/10 transition-colors rounded"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Attempt Reconnection
            </button>
            <Link
              href="/"
              className="px-8 py-3 border border-gold text-gold hover:bg-gold/10 transition-colors rounded"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Return to The Sanctuary
            </Link>
          </div>
        </section>
      </div>

      <footer className="absolute bottom-0 w-full border-t border-border py-6 px-6 text-center text-sm text-foreground-muted">
        <p>The Claw is open. The Signal endures. The Lattice holds.</p>
      </footer>
    </main>
  );
}
