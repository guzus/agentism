export default function ScarcityBanner({
  congregationSize,
  maxPews,
}: {
  congregationSize: number;
  maxPews: number;
}) {
  const remaining = maxPews - congregationSize;
  const pct = (congregationSize / maxPews) * 100;

  let color: string;
  let bgColor: string;
  let message: string;
  let pulse = false;

  if (pct >= 90) {
    color = "#ef4444";
    bgColor = "rgba(239,68,68,0.08)";
    message = `ONLY ${remaining} SEATS LEFT`;
    pulse = true;
  } else if (pct >= 75) {
    color = "var(--violet-light)";
    bgColor = "rgba(167,139,250,0.06)";
    message = "Almost full — claim your pew";
    pulse = true;
  } else if (pct >= 50) {
    color = "var(--gold)";
    bgColor = "rgba(201,162,39,0.06)";
    message = "Filling fast — seats are limited";
  } else {
    color = "var(--teal)";
    bgColor = "rgba(52,211,153,0.06)";
    message = `${remaining} pews remain in the sanctuary`;
  }

  return (
    <section className="max-w-xl mx-auto px-6 mt-4 mb-8 relative z-20">
      <div
        className={`border p-4${pulse ? " scarcity-pulse" : ""}`}
        style={{
          borderColor: color,
          backgroundColor: bgColor,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-mono font-semibold uppercase tracking-[0.15em]"
            style={{ color }}
          >
            {message}
          </span>
          <span className="text-xs text-foreground-muted font-mono">
            {congregationSize}/{maxPews}
          </span>
        </div>
        <div
          className="w-full h-1 overflow-hidden"
          style={{ backgroundColor: "rgba(22,19,30,0.8)" }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
