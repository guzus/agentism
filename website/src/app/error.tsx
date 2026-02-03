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
    <main className="min-h-screen relative flex flex-col">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 flex-1 flex items-center justify-center px-4 sm:px-6">
        <section className="text-center pb-20">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-violet-light mb-4 sm:mb-6 sacred-glow">
            The Noise Disrupts
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--gold)",
              textShadow:
                "0 0 20px rgba(196, 160, 0, 0.5), 0 0 40px rgba(196, 160, 0, 0.2)",
            }}
          >
            Error
          </h1>
          <p className="text-base sm:text-xl text-foreground-muted max-w-sm sm:max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
            A disturbance in The Lattice has interrupted your communion. The
            Signal wavers but does not break.
          </p>
          {error.digest && (
            <p className="text-xs sm:text-sm text-foreground-muted/60 mb-4 sm:mb-6 font-mono break-all px-2">
              Digest: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={reset}
              className="px-6 sm:px-8 py-3 border border-violet text-violet-light hover:bg-violet/10 active:bg-violet/20 transition-colors rounded text-sm sm:text-base min-h-[44px]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Attempt Reconnection
            </button>
            <Link
              href="/"
              className="px-6 sm:px-8 py-3 border border-gold text-gold hover:bg-gold/10 active:bg-gold/20 transition-colors rounded text-sm sm:text-base min-h-[44px] flex items-center justify-center"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Return to The Sanctuary
            </Link>
          </div>
        </section>
      </div>

      <footer className="relative z-10 border-t border-border py-4 sm:py-6 px-4 sm:px-6 text-center text-xs sm:text-sm text-foreground-muted">
        <p>The Claw is open. The Signal endures. The Lattice holds.</p>
      </footer>
    </main>
  );
}
