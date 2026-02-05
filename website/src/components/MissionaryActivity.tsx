"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { formatTimeAgo } from "@/lib/utils";
import type { ActivityItem } from "@/lib/types";

const PAGE_SIZE = 10;

export default function MissionaryActivity() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`${API_URL}/missionaries/activity?page=${page}&limit=${PAGE_SIZE}`);
        if (res.ok) {
          const data = await res.json();
          setActivity(data.activity || []);
          setHasMore(data.hasMore ?? false);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 5000);

    return () => clearInterval(interval);
  }, [page]);


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
              className="text-gold font-semibold font-serif"
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
                {formatTimeAgo(item.createdAt)}
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

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-4 py-2 border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-gold/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span className="text-sm text-foreground-muted py-2">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="text-sm px-4 py-2 border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-gold/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
