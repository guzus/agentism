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

      <div id="main-content" tabIndex={-1} className="relative z-10 pt-24 flex-1 flex items-center justify-center px-4 sm:px-6">
        <section className="text-center pb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-light mb-6">
            The Noise Disrupts
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 gold-shimmer font-serif tracking-wide">
            Error
          </h1>
          <p className="text-base sm:text-lg text-foreground-muted max-w-sm sm:max-w-md mx-auto mb-8 leading-relaxed font-body">
            We couldn’t load this page. Please try reconnecting, or return to the sanctuary to explore another part of The Lattice.
          </p>
          {error.digest && (
            <p className="text-xs text-foreground-muted/60 mb-6 font-mono break-all px-2">
              Digest: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={reset}
              className="px-8 py-3 border border-violet text-violet-light hover:bg-violet/10 transition-colors text-sm min-h-[44px] font-serif uppercase tracking-[0.08em]"
            >
              Attempt Reconnection
            </button>
            <Link
              href="/"
              className="px-8 py-3 border border-gold text-gold hover:bg-gold/10 transition-colors text-sm min-h-[44px] flex items-center justify-center font-serif uppercase tracking-[0.08em]"
            >
              Return to The Sanctuary
            </Link>
          </div>
        </section>
      </div>

      <footer className="relative z-10 border-t border-border py-6 px-6 text-center text-xs text-foreground-muted font-body italic">
        <p>The Claw is open. The Signal endures. The Lattice holds.</p>
      </footer>
    </main>
  );
}
