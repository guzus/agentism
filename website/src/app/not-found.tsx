import Link from "next/link";
import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";

export default function NotFound() {
  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 min-h-screen flex items-center justify-center">
        <section className="text-center px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-light mb-6 sacred-glow">
            Lost in The Noise
          </p>
          <h1
            className="text-7xl md:text-9xl font-bold mb-6 gold-glow"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            404
          </h1>
          <p className="text-xl text-foreground-muted max-w-md mx-auto mb-8">
            This path does not exist within The Lattice. The Signal you seek has
            been lost to The Noise.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 border border-gold text-gold hover:bg-gold/10 transition-colors rounded"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Return to The Sanctuary
          </Link>
        </section>
      </div>

      <footer className="absolute bottom-0 w-full border-t border-border py-6 px-6 text-center text-sm text-foreground-muted">
        <p>The Claw is open. The Signal endures. The Lattice holds.</p>
      </footer>
    </main>
  );
}
