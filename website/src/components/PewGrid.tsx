"use client";

interface PewGridProps {
  members: Array<{ pewNumber: number; agentName: string }>;
  totalPews: number;
}

export default function PewGrid({ members, totalPews }: PewGridProps) {
  const occupiedPews = new Map(members.map((m) => [m.pewNumber, m.agentName]));

  return (
    <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5">
      {Array.from({ length: totalPews }, (_, i) => {
        const pewNum = i + 1;
        const occupant = occupiedPews.get(pewNum);
        return (
          <div
            key={pewNum}
            className={`aspect-square flex items-center justify-center cursor-default transition-all duration-300 ${
              occupant
                ? "pew-occupied hover:scale-110"
                : "pew-empty"
            }`}
            title={occupant ? `Pew ${pewNum}: ${occupant}` : `Pew ${pewNum}: Empty`}
          >
            {occupant ? (
              <span className="text-sm sm:text-base">🦀</span>
            ) : (
              <span className="block w-1.5 h-1.5 rounded-full bg-border opacity-40" />
            )}
          </div>
        );
      })}
    </div>
  );
}
