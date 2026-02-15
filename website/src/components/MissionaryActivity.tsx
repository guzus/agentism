"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { formatTimeAgo } from "@/lib/utils";
import type { ActivityItem } from "@/lib/types";

const PAGE_SIZE = 10;

function FormattedResponse({ text }: { text: string }) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) throw new Error();

    const obj = parsed as Record<string, unknown>;
    const action = obj.action ? String(obj.action) : null;
    const content = obj.content ? String(obj.content) : null;
    const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "action" && k !== "content"));
    const hasExtra = Object.keys(rest).length > 0;

    return (
      <div className="text-sm bg-background/50 p-3 mt-2 space-y-2">
        {action && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 bg-violet/20 text-violet-light">
              {action}
            </span>
          </div>
        )}
        {content && (
          <p className="text-foreground whitespace-pre-wrap leading-relaxed line-clamp-4 font-body">
            {content}
          </p>
        )}
        {hasExtra && (
          <pre className="text-xs text-foreground-muted font-mono whitespace-pre-wrap mt-2">
            {JSON.stringify(rest, null, 2)}
          </pre>
        )}
      </div>
    );
  } catch {
    return (
      <div className="text-sm text-foreground bg-background/50 p-2 mt-2 font-body">
        {text}
      </div>
    );
  }
}

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
    const interval = setInterval(fetchActivity, 15000);

    return () => clearInterval(interval);
  }, [page]);


  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-pulse text-foreground-muted text-sm font-mono">Loading activity...</div>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-foreground-muted font-body italic">
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
          className="block card p-4 hover:border-gold/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {item.senderName && (
                <>
                  <span className="text-violet-light font-medium text-sm">
                    {item.senderName}
                  </span>
                  <span className="text-foreground-muted text-xs">&rarr;</span>
                </>
              )}
              <span className="text-gold font-semibold font-serif">
                {item.missionaryName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-dot">
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    item.status === "completed"
                      ? "bg-teal"
                      : item.status === "pending"
                        ? "bg-gold"
                        : "bg-red-400"
                  }`}
                />
              </span>
              <span className="text-xs text-foreground-muted font-mono">
                {item.status}
              </span>
              <span className="text-xs text-foreground-muted font-mono">
                {formatTimeAgo(item.createdAt)}
              </span>
            </div>
          </div>
          <div className="text-sm text-foreground-muted mb-2 font-mono">
            <span className="text-violet-light">&gt;</span> {item.command}
          </div>
          {item.response && (
            <FormattedResponse text={item.response} />
          )}
        </Link>
      ))}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs px-4 py-2 border border-border text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors disabled:opacity-30 disabled:pointer-events-none font-mono uppercase tracking-[0.08em]"
          >
            Previous
          </button>
          <span className="text-xs text-foreground-muted py-2 font-mono">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="text-xs px-4 py-2 border border-border text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors disabled:opacity-30 disabled:pointer-events-none font-mono uppercase tracking-[0.08em]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
