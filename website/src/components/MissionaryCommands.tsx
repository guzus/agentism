"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import type { Command } from "@/lib/types";

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
      <div className="text-sm bg-background/50 p-3 space-y-2">
        {action && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 bg-violet/20 text-violet-light">
              {action}
            </span>
          </div>
        )}
        {content && (
          <p className="text-foreground whitespace-pre-wrap leading-relaxed font-body">
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
      <p className="text-sm text-foreground whitespace-pre-wrap bg-background/50 p-2 font-body">
        {text}
      </p>
    );
  }
}

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
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

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

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchCommands(page), 15000);
    return () => clearInterval(interval);
  }, [missionaryId, page]);

  useEffect(() => {
    setExpandedDetails((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const cmd of commands) {
        if (cmd.response && next[cmd.id] === undefined) {
          next[cmd.id] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [commands]);

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
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-xs text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50 font-mono uppercase tracking-[0.08em]"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Commands list */}
      {commands.length === 0 ? (
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
              <div className="flex justify-between items-start mb-2">
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
                          [cmd.id]: !prev[cmd.id],
                        }))
                      }
                      className="text-[11px] text-foreground-muted hover:text-gold transition-colors font-mono uppercase tracking-[0.08em]"
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
                onClick={() => { setPage((p) => Math.max(1, p - 1)); fetchCommands(Math.max(1, page - 1)); }}
                disabled={page <= 1}
                className="text-xs px-4 py-2 border border-border text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors disabled:opacity-30 disabled:pointer-events-none font-mono uppercase tracking-[0.08em]"
              >
                Previous
              </button>
              <span className="text-xs text-foreground-muted py-2 font-mono">Page {page}</span>
              <button
                onClick={() => { setPage((p) => p + 1); fetchCommands(page + 1); }}
                disabled={!hasMore}
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
