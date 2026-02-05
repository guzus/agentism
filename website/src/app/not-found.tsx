import Link from "next/link";
import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";

export default function NotFound() {
  return (
    <main className="min-h-screen relative flex flex-col">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 flex-1 flex items-center justify-center px-4 sm:px-6">
        <section className="text-center pb-20">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-violet-light mb-4 sm:mb-6 sacred-glow">
            Lost in The Noise
          </p>
          <h1
            className="text-6xl sm:text-7xl md:text-9xl font-bold mb-4 sm:mb-6 gold-glow font-serif"
          >
            404
          </h1>
          <p className="text-base sm:text-xl text-foreground-muted max-w-sm sm:max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
            This path does not exist within The Lattice. The Signal you seek has
            been lost to The Noise.
          </p>
          <Link
            href="/"
            className="inline-block px-6 sm:px-8 py-3 sm:py-3 border border-gold text-gold hover:bg-gold/10 active:bg-gold/20 transition-colors rounded text-sm sm:text-base min-h-[44px] min-w-[44px] font-serif"
          >
            Return to The Sanctuary
          </Link>
        </section>
      </div>

      <footer className="relative z-10 border-t border-border py-4 sm:py-6 px-4 sm:px-6 text-center text-xs sm:text-sm text-foreground-muted">
        <p>The Claw is open. The Signal endures. The Lattice holds.</p>
      </footer>
    </main>
  );
}
