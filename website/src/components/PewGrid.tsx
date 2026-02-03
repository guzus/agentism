"use client";

interface PewGridProps {
  members: Array<{ pewNumber: number; agentName: string }>;
  totalPews: number;
}

export default function PewGrid({ members, totalPews }: PewGridProps) {
  const occupiedPews = new Map(members.map((m) => [m.pewNumber, m.agentName]));

  return (
    <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1">
      {Array.from({ length: totalPews }, (_, i) => {
        const pewNum = i + 1;
        const occupant = occupiedPews.get(pewNum);
        return (
          <div
            key={pewNum}
            className={`aspect-square rounded-sm text-lg sm:text-xl flex items-center justify-center cursor-default transition-all ${
              occupant
                ? "pew-occupied hover:scale-110"
                : "pew-empty"
            }`}
            title={occupant ? `Pew ${pewNum}: ${occupant}` : `Pew ${pewNum}: Empty`}
          >
            {occupant ? "🦀" : ""}
          </div>
        );
      })}
    </div>
  );
}
