"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";

interface MissionaryCommandFormProps {
  missionaryId: string;
}

interface CommandResponse {
  commandId: string;
  status: string;
  response?: string;
  tokensUsed?: string;
  error?: string;
  message?: string;
}

const API_KEY_STORAGE_KEY = "agentism_api_key";

export default function MissionaryCommandForm({
  missionaryId,
}: MissionaryCommandFormProps) {
  const [command, setCommand] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [result, setResult] = useState<CommandResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  // Persist API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }
  }, [apiKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!command.trim() || !apiKey.trim()) return;

    setStatus("sending");
    setResult(null);
    setErrorMessage("");

    try {
      const res = await fetch(
        `${API_URL}/missionaries/${missionaryId}/command`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({ command: command.trim() }),
        }
      );

      const data = (await res.json()) as CommandResponse & {
        error?: string;
        retryAfter?: number;
      };

      if (res.status === 429) {
        const retryAfter = data.retryAfter ?? 60;
        setStatus("error");
        setErrorMessage(
          `Rate limited. Please wait ${retryAfter} second${retryAfter === 1 ? "" : "s"} before trying again.`
        );
        return;
      }

      if (res.status === 401 || res.status === 403) {
        setStatus("error");
        setErrorMessage(data.error || "Unauthorized. Check your API key.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Command failed. Please try again.");
        return;
      }

      setStatus("success");
      setResult(data);
      setCommand("");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* API Key */}
        <div className="space-y-2">
          <label
            htmlFor="apiKey"
            className="text-xs text-foreground-muted block"
          >
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            placeholder="Your member API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-background-light border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-violet transition-colors"
          />
        </div>

        {/* Command textarea */}
        <div className="space-y-2">
          <label
            htmlFor="command"
            className="text-xs text-foreground-muted block"
          >
            Command (max 2000 characters)
          </label>
          <textarea
            id="command"
            placeholder="Enter a command for this missionary..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            maxLength={2000}
            rows={4}
            className="w-full bg-background-light border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-violet transition-colors resize-y"
          />
          <div className="text-xs text-foreground-muted text-right">
            {command.length}/2000
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            !command.trim() || !apiKey.trim() || status === "sending"
          }
          className="w-full px-6 py-3 bg-violet text-foreground font-semibold rounded-lg hover:bg-violet-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Sending..." : "Send Command"}
        </button>
      </form>

      {/* Error message */}
      {status === "error" && errorMessage && (
        <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/10 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Success response */}
      {status === "success" && result && (
        <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-green-400">
              {result.status?.toUpperCase() || "COMPLETED"}
            </span>
            {result.tokensUsed && (
              <span className="text-xs text-foreground-muted">
                {result.tokensUsed} tokens
              </span>
            )}
          </div>
          {result.response && (
            <div>
              <p className="text-xs text-foreground-muted mb-1">Response:</p>
              <p className="text-sm text-foreground whitespace-pre-wrap bg-background/50 rounded p-2">
                {result.response}
              </p>
            </div>
          )}
          {result.message && !result.response && (
            <p className="text-sm text-foreground-muted">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
