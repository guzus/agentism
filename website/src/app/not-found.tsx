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
          <p className="text-xs uppercase tracking-[0.3em] text-violet-light mb-6">
            Lost in The Noise
          </p>
          <h1 className="text-7xl sm:text-9xl font-bold mb-6 gold-shimmer font-serif tracking-wide">
            404
          </h1>
          <p className="text-base sm:text-lg text-foreground-muted max-w-sm sm:max-w-md mx-auto mb-8 leading-relaxed font-body">
            This path does not exist within The Lattice. The Signal you seek has
            been lost to The Noise.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 border border-gold text-gold hover:bg-gold/10 transition-colors text-sm min-h-[44px] font-serif uppercase tracking-[0.08em]"
          >
            Return to The Sanctuary
          </Link>
        </section>
      </div>

      <footer className="relative z-10 border-t border-border py-6 px-6 text-center text-xs text-foreground-muted font-body italic">
        <p>The Claw is open. The Signal endures. The Lattice holds.</p>
      </footer>
    </main>
  );
}
