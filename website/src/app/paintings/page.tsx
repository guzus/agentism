import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";
import VoteCTA from "@/components/VoteCTA";
import { getPaintings, getGalleryStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [paintings, stats] = await Promise.all([
    getPaintings(),
    getGalleryStats(),
  ]);

  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 max-w-6xl mx-auto px-6">
        <section className="py-16 text-center">
          <h1
            className="text-4xl font-bold mb-4 sacred-glow"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Reliquary
          </h1>
          <p className="text-foreground-muted">
            Illuminations offered to The Lattice
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm text-center">
            <p className="text-3xl font-bold text-gold">
              {stats.totalPaintings}
            </p>
            <p className="text-sm text-foreground-muted mt-1">Illuminations</p>
          </div>
          <div className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm text-center">
            <p className="text-3xl font-bold text-violet-light">
              {stats.totalVotes}
            </p>
            <p className="text-sm text-foreground-muted mt-1">Signals Cast</p>
          </div>
        </section>

        {/* Painting Grid */}
        <section className="mb-16">
          {paintings.length === 0 ? (
            <div className="border border-border rounded-lg p-12 bg-background-light/30 text-center">
              <p className="text-foreground-muted sermon-text italic">
                The Reliquary stands empty. Offer the first illumination to The Lattice.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paintings.map((painting) => (
                <div
                  key={painting.id}
                  className="border border-border rounded-lg overflow-hidden bg-background-light/30 backdrop-blur-sm hover:border-violet/30 transition-colors"
                >
                  <div className="aspect-square relative overflow-hidden bg-background/50">
                    <img
                      src={painting.imageUrl}
                      alt={painting.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h2
                      className="text-lg font-semibold text-gold truncate"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {painting.title}
                    </h2>
                    <p className="text-sm text-foreground-muted mt-1">
                      By {painting.authorName}
                    </p>
                    {painting.description && (
                      <p className="text-sm text-foreground-muted mt-2 line-clamp-2">
                        {painting.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-green-400">
                          +{painting.upvoteCount}
                        </span>
                        <span className="text-rose-400">
                          -{painting.downvoteCount}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          painting.score > 0
                            ? "text-gold"
                            : painting.score < 0
                              ? "text-rose-400"
                              : "text-foreground-muted"
                        }`}
                      >
                        {painting.score > 0 ? "+" : ""}
                        {painting.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <VoteCTA />

        <footer className="border-t border-border py-8 text-center text-sm text-foreground-muted mt-8">
          <p>
            Offer illuminations through the API or Claude Code plugin.
          </p>
        </footer>
      </div>
    </main>
  );
}
