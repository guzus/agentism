"use client";

import FormattedResponse from "./FormattedResponse";
import { useState } from "react";
import { usePollingAPI } from "@/lib/usePollingAPI";
import type { Command } from "@/lib/types";

const PAGE_SIZE = 10;

interface MissionaryCommandsProps {
  missionaryId: string;
  initialCommands: Command[];
  initialHasMore: boolean;
}

export default function MissionaryCommands({
  missionaryId,
  initialCommands,
  initialHasMore,
}: MissionaryCommandsProps) {
  const [page, setPage] = useState(1);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const { data, error, loading, refreshing, refresh } = usePollingAPI<{ commands: Command[]; hasMore: boolean }>(
    `/missionaries/${missionaryId}/commands?page=${page}&limit=${PAGE_SIZE}`,
    { commands: initialCommands, hasMore: initialHasMore }
  );
  const commands = data?.commands ?? [];
  const hasMore = data?.hasMore ?? false;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-teal";
      case "pending":
        return "text-gold";
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
          onClick={refresh}
          disabled={refreshing}
          className="text-xs text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50 font-mono uppercase tracking-[0.08em]"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p role="status" className="border border-gold/20 p-4 text-sm text-gold">{error}{data ? " Showing the last successful update." : ""}</p>}
      {/* Commands list */}
      {loading ? <p role="status" className="card p-8 text-center text-foreground-muted">Loading commands…</p> : !error && commands.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-foreground-muted font-body italic">
            No commands yet. Be the first to command this missionary.
          </p>
        </div>
      ) : (
        <div className="space-y-4 stagger-fade">
          {commands.map((cmd) => (
            <div key={cmd.id} className="card p-4 hover:border-gold/20 transition-all duration-300">
              {/* Command header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium font-mono uppercase tracking-[0.05em] ${getStatusColor(cmd.status)}`}>
                    {cmd.status}
                  </span>
                  {cmd.senderName && (
                    <span className="text-xs text-violet-light font-mono">
                      by {cmd.senderName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground-muted font-mono">
                  {formatTime(cmd.createdAt)}
                </span>
              </div>

              {/* Command */}
              <div className="mb-3">
                <p className="text-xs text-foreground-muted mb-1 uppercase tracking-[0.05em] font-mono">Command:</p>
                <p className="text-sm text-gold font-mono bg-background/50 p-2">
                  {cmd.command}
                </p>
              </div>

              {/* Response */}
              {cmd.response && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-foreground-muted uppercase tracking-[0.05em] font-mono">
                      Response:
                    </p>
                    <button
                      onClick={() =>
                        setExpandedDetails((prev) => ({
                          ...prev,
                          [cmd.id]: prev[cmd.id] === false,
                        }))
                      }
                      aria-expanded={expandedDetails[cmd.id] !== false}
                      className="min-h-11 text-[11px] text-foreground-muted hover:text-gold transition-colors font-mono uppercase tracking-[0.08em]"
                    >
                      {expandedDetails[cmd.id] !== false ? "Hide Details" : "Show Details"}
                    </button>
                  </div>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      expandedDetails[cmd.id] !== false
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <FormattedResponse text={cmd.response} />
                    </div>
                  </div>
                </div>
              )}

            </div>
          ))}

          {/* Pagination */}
          {(page > 1 || hasMore) && (
            <div className="flex justify-center gap-4 pt-2">
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
      )}
    </div>
  );
}
