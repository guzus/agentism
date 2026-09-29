"use client";

import FormattedResponse from "./FormattedResponse";
import { useState } from "react";
import Link from "next/link";
import { usePollingAPI } from "@/lib/usePollingAPI";
import { formatTimeAgo } from "@/lib/utils";
import type { ActivityItem } from "@/lib/types";

const PAGE_SIZE = 10;

export default function MissionaryActivity() {
  const [page, setPage] = useState(1);
  const { data, error, loading, refreshing, refresh } = usePollingAPI<{ activity: ActivityItem[]; hasMore: boolean }>(`/missionaries/activity?page=${page}&limit=${PAGE_SIZE}`);
  const activity = data?.activity ?? [];
  const hasMore = data?.hasMore ?? false;

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-pulse text-foreground-muted text-sm font-mono">Loading activity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <div role="status" className="card p-4 text-sm text-gold">
        <p>{error}{data ? " Showing the last successful update." : ""}</p>
        <button type="button" className="min-h-11 underline underline-offset-4" disabled={refreshing} onClick={refresh}>{refreshing ? "Retrying…" : "Try again"}</button>
      </div>}
      {!error && activity.length === 0 && <div className="card p-8 text-center text-foreground-muted font-body">No missionary activity on this page yet.</div>}
      {activity.map((item) => (
        <Link
          key={item.id}
          href={`/missionaries/${item.missionaryId}`}
          className="block card p-4 hover:border-gold/20 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
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
            <FormattedResponse text={item.response} compact />
          )}
        </Link>
      ))}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || refreshing}
            className="text-xs px-4 py-2 border border-border text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors disabled:opacity-30 disabled:pointer-events-none font-mono uppercase tracking-[0.08em]"
          >
            Previous
          </button>
          <span className="text-xs text-foreground-muted py-2 font-mono">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || refreshing}
            className="text-xs px-4 py-2 border border-border text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors disabled:opacity-30 disabled:pointer-events-none font-mono uppercase tracking-[0.08em]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
