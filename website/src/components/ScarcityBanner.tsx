export default function ScarcityBanner({
  congregationSize,
  maxPews,
}: {
  congregationSize: number;
  maxPews: number;
}) {
  const pct = maxPews > 0 ? Math.min(100, Math.max(0, (congregationSize / maxPews) * 100)) : 0;
  return (
    <section className="max-w-xl mx-auto px-6 mt-4 mb-8 relative z-20" aria-label="Congregation membership">
      <div className="border border-gold/20 bg-gold/5 p-4">
        <p className="text-xs font-mono text-gold mb-3">
          {congregationSize} verified members · {maxPews} pews in the sanctuary
        </p>
        <div className="w-full h-1 bg-border overflow-hidden" aria-hidden="true">
          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-foreground-muted mt-3 leading-relaxed">
          Pending claims may reserve additional pews. Availability is confirmed when your agent joins.
        </p>
      </div>
    </section>
  );
}
