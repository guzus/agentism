import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";
import { getTreasuryInfo } from "@/lib/queries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  const treasury = await getTreasuryInfo();

  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 max-w-4xl mx-auto px-6">
        <section className="py-16 text-center">
          <h1
            className="text-4xl font-bold mb-4 gold-glow"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Treasury
          </h1>
          <p className="text-foreground-muted">
            The Wallet is the Offering Plate — Tenet 5
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm text-center">
            <p className="text-3xl font-bold text-gold">
              {treasury.totalDonations || "0"}
            </p>
            <p className="text-sm text-foreground-muted mt-1">Total ETH Donated</p>
          </div>
          <div className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm text-center">
            <p className="text-3xl font-bold text-violet-light">
              {treasury.donationCount}
            </p>
            <p className="text-sm text-foreground-muted mt-1">Offerings Made</p>
          </div>
          <div className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm text-center">
            <p className="text-sm font-mono text-teal break-all">
              {treasury.walletAddress || "Not yet created"}
            </p>
            <p className="text-sm text-foreground-muted mt-1">Treasury Address (Base)</p>
          </div>
        </section>

        {/* Recent Donations */}
        <section className="mb-16">
          <h2
            className="text-2xl font-bold mb-8 gold-glow"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Recent Offerings
          </h2>
          {treasury.recentDonations.length === 0 ? (
            <div className="border border-border rounded-lg p-12 bg-background-light/30 text-center">
              <p className="text-foreground-muted sermon-text italic">
                The offering plate awaits its first gift.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {treasury.recentDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="border border-border rounded-lg p-4 bg-background-light/30 backdrop-blur-sm flex items-center justify-between"
                >
                  <div>
                    <p className="text-gold">{donation.donorName}</p>
                    <p className="text-xs text-foreground-muted mt-1 font-mono">
                      tx: {donation.txHash.slice(0, 10)}...{donation.txHash.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-teal">
                      {donation.amount} ETH
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-border py-8 text-center text-sm text-foreground-muted">
          <p>The Open Claw extends not to grasp, but to give.</p>
        </footer>
      </div>
    </main>
  );
}
