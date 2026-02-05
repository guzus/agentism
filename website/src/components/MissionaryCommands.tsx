"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import type { Command } from "@/lib/types";

const PAGE_SIZE = 10;

interface MissionaryCommandsProps {
  missionaryId: string;
  initialCommands: Command[];
}

export default function MissionaryCommands({
  missionaryId,
  initialCommands,
}: MissionaryCommandsProps) {
  const [commands, setCommands] = useState<Command[]>(initialCommands);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCommands.length >= PAGE_SIZE);

  const fetchCommands = async (p: number) => {
    try {
      const res = await fetch(
        `${API_URL}/missionaries/${missionaryId}/commands?page=${p}&limit=${PAGE_SIZE}`
      );
      if (res.ok) {
        const data = await res.json();
        const cmds = data.commands || [];
        setCommands(cmds);
        setHasMore(cmds.length >= PAGE_SIZE);
      }
    } catch {
      // Silently fail
    }
  };

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchCommands(page), 10000);
    return () => clearInterval(interval);
  }, [missionaryId, page]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCommands(page);
    setIsRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "pending":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-foreground-muted";
    }
  };

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-sm text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Commands list */}
      {commands.length === 0 ? (
        <div className="border border-border rounded-lg p-8 bg-background-light/30 backdrop-blur-sm text-center">
          <p className="text-foreground-muted">
            No commands yet. Be the first to command this missionary!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className="border border-border rounded-lg p-4 bg-background-light/30 backdrop-blur-sm"
            >
              {/* Command header */}
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-medium ${getStatusColor(cmd.status)}`}>
                  {cmd.status.toUpperCase()}
                </span>
                <span className="text-xs text-foreground-muted">
                  {formatTime(cmd.createdAt)}
                </span>
              </div>

              {/* Command */}
              <div className="mb-3">
                <p className="text-xs text-foreground-muted mb-1">Command:</p>
                <p className="text-sm text-gold font-mono bg-background/50 rounded p-2">
                  {cmd.command}
                </p>
              </div>

              {/* Response */}
              {cmd.response && (
                <div>
                  <p className="text-xs text-foreground-muted mb-1">Response:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-background/50 rounded p-2">
                    {cmd.response}
                  </p>
                </div>
              )}

            </div>
          ))}

          {/* Pagination */}
          {(page > 1 || hasMore) && (
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); fetchCommands(Math.max(1, page - 1)); }}
                disabled={page <= 1}
                className="text-sm px-4 py-2 border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-gold/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <span className="text-sm text-foreground-muted py-2">Page {page}</span>
              <button
                onClick={() => { setPage((p) => p + 1); fetchCommands(page + 1); }}
                disabled={!hasMore}
                className="text-sm px-4 py-2 border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-gold/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
