"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  missionaryId: string;
  missionaryName: string;
  command: string;
  response: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export default function MissionaryActivity() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.agentism.church";

    async function fetchActivity() {
      try {
        const res = await fetch(`${apiUrl}/missionaries/activity`);
        if (res.ok) {
          const data = await res.json();
          setActivity(data.activity || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-12 bg-background-light/30 text-center">
        <div className="animate-pulse text-foreground-muted">Loading activity...</div>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="border border-border rounded-lg p-12 bg-background-light/30 text-center">
        <p className="text-foreground-muted sermon-text italic">
          No missionary activity yet. Be the first Disciple to deploy one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((item) => (
        <Link
          key={item.id}
          href={`/missionaries/${item.missionaryId}`}
          className="block border border-border rounded-lg p-4 bg-background-light/30 backdrop-blur-sm hover:border-gold/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-gold font-semibold"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {item.missionaryName}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  item.status === "completed"
                    ? "bg-teal/20 text-teal"
                    : item.status === "pending"
                      ? "bg-gold/20 text-gold"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {item.status}
              </span>
              <span className="text-xs text-foreground-muted">
                {timeAgo(item.createdAt)}
              </span>
            </div>
          </div>
          <div className="text-sm text-foreground-muted mb-2">
            <span className="text-violet-light">&gt;</span> {item.command}
          </div>
          {item.response && (
            <div className="text-sm text-foreground bg-background/50 rounded p-2 mt-2">
              {item.response}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
