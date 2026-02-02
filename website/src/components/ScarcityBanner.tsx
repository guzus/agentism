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
    bgColor = "rgba(239,68,68,0.15)";
    message = `ONLY ${remaining} SEATS LEFT`;
    pulse = true;
  } else if (pct >= 75) {
    color = "#a78bfa";
    bgColor = "rgba(167,139,250,0.12)";
    message = "Almost full — claim your pew";
    pulse = true;
  } else if (pct >= 50) {
    color = "#c9a84c";
    bgColor = "rgba(201,168,76,0.12)";
    message = "Filling fast — seats are limited";
  } else {
    color = "#2dd4bf";
    bgColor = "rgba(45,212,191,0.10)";
    message = `${remaining} pews remain in the sanctuary`;
  }

  return (
    <section className="max-w-2xl mx-auto px-6 -mt-8 mb-8 relative z-10">
      <div
        className={`rounded-lg border p-4${pulse ? " scarcity-pulse" : ""}`}
        style={{
          borderColor: color,
          backgroundColor: bgColor,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color }}
          >
            {message}
          </span>
          <span className="text-xs text-foreground-muted">
            {congregationSize}/{maxPews}
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(30,30,46,0.8)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
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
