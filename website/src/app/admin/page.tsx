"use client";

import { useCallback, useEffect, useState } from "react";
import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";
import { APIError, API_URL, fetchAPI } from "@/lib/api";
import { useStoredPreference } from "@/lib/useStoredPreference";

type PendingMissionary = {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  config: { model?: string; [key: string]: unknown };
  createdAt: string;
};

type Missionary = {
  id: string;
  name: string;
  status: string;
  creatorId: string;
  ownerId: string | null;
  cloudflareId: string | null;
  totalCommands: number;
  totalTokens: number;
  createdAt: string;
  approvedAt: string | null;
  releasedAt: string | null;
};

const TOKEN_KEY = "agentism_admin_token";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useStoredPreference(TOKEN_KEY, "");
  const [pending, setPending] = useState<PendingMissionary[]>([]);
  const [missionaries, setMissionaries] = useState<Missionary[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [loadedToken, setLoadedToken] = useState("");
  const loading = isLoading || Boolean(token && loadedToken !== token);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    setToken("");
    setPending([]);
    setMissionaries([]);
    setError("Session expired. Please log in again.");
  }, [setToken]);

  const adminFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!token) return null;
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        signal: options?.signal ?? AbortSignal.timeout(10_000),
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
          Authorization: `Admin ${token}`,
        },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }
      return res;
    },
    [token, handleUnauthorized]
  );

  const loadData = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        adminFetch("/admin/missionaries/pending"),
        adminFetch("/admin/missionaries"),
      ]);

      if (!pendingRes || !allRes) {
        setLoading(false);
        return;
      }

      setError(null);
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();

      if (!pendingRes.ok) {
        setError(pendingData.error || "Failed to load pending requests.");
      } else {
        setPending(pendingData.pending || []);
      }

      if (!allRes.ok) {
        setError(allData.error || "Failed to load missionaries.");
      } else {
        setMissionaries(allData.missionaries || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
      setLoadedToken(token);
    }
  }, [adminFetch, token]);

  useEffect(() => {
    if (token) {
      // State updates in loadData follow awaited network responses.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadData();
    }
  }, [token, loadData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  async function handleLogout() {
    const session = token;
    setToken("");
    setPending([]);
    setMissionaries([]);
    setError(null);
    try {
      await fetchAPI("/admin/logout", { method: "POST", headers: { Authorization: `Admin ${session}` } });
    } catch (error) {
      if (!(error instanceof APIError && error.status === 401)) {
        setError("Signed out on this device. Server session revocation could not be confirmed.");
      }
    }
  }

  async function runAction(id: string, path: string) {
    setActionId(id);
    setActionError(null);
    try {
      const res = await adminFetch(path, { method: "POST" });
      if (!res) return;
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Action failed.");
        return;
      }
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionId(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "\u2014";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div id="main-content" tabIndex={-1} className="relative z-10 pt-24 max-w-6xl mx-auto px-6">
        <section className="py-12 text-center">
          <h1 className="text-4xl font-bold mb-3 gold-shimmer font-serif tracking-wide">
            Admin Console
          </h1>
          <p className="text-foreground-muted text-xs uppercase tracking-[0.2em]">
            Approve, reject, stop, and refresh missionaries
          </p>
        </section>

        {!token ? (
          <section className="max-w-md mx-auto card p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-password" className="block text-xs text-foreground-muted mb-2 uppercase tracking-[0.08em] font-mono">
                  Admin Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold/40 transition-colors font-mono text-sm"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-gold/10 border border-gold/30 text-gold font-semibold hover:bg-gold/20 transition-colors text-sm uppercase tracking-[0.08em]"
              >
                Log In
              </button>
              {error && (
                <div className="border border-red-500/30 p-3 bg-red-500/10 text-red-300 text-sm text-center">
                  {error}
                </div>
              )}
            </form>
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs text-foreground-muted font-mono uppercase tracking-[0.08em]">
                {loading ? "Refreshing data..." : "Session active"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setLoading(true); void loadData(); }}
                  className="px-4 py-2 border border-border text-xs text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors font-mono uppercase tracking-[0.08em]"
                >
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-border text-xs text-foreground-muted hover:text-foreground hover:border-gold/30 transition-colors font-mono uppercase tracking-[0.08em]"
                >
                  Log Out
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-red-500/30 p-3 bg-red-500/10 text-red-300 text-sm text-center mb-6">
                {error}
              </div>
            )}

            {actionError && (
              <div className="border border-amber-500/30 p-3 bg-amber-500/10 text-amber-300 text-sm text-center mb-6">
                {actionError}
              </div>
            )}

            <section className="mb-12">
              <h2 className="text-sm font-serif font-semibold text-gold tracking-[0.1em] uppercase mb-6">
                Pending Missionary Requests
              </h2>
              {pending.length === 0 ? (
                <div className="card p-6 text-center text-sm text-foreground-muted font-body italic">
                  No pending requests.
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map((m) => (
                    <div key={m.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg text-gold font-semibold font-serif">
                            {m.name || "Unnamed"}
                          </p>
                          <p className="text-xs text-foreground-muted mt-1 font-mono">
                            Creator: {m.creatorName} ({m.creatorId})
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Model: {m.config?.model || "Unknown"}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Created: {formatDate(m.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/approve`)}
                            disabled={actionId === m.id}
                            className="px-4 py-2 bg-teal/20 text-teal text-xs font-semibold hover:bg-teal/30 transition-colors disabled:opacity-50 uppercase tracking-[0.08em]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/reject`)}
                            disabled={actionId === m.id}
                            className="px-4 py-2 bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 uppercase tracking-[0.08em]"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-16">
              <h2 className="text-sm font-serif font-semibold text-gold tracking-[0.1em] uppercase mb-6">
                All Missionaries
              </h2>
              {missionaries.length === 0 ? (
                <div className="card p-6 text-center text-sm text-foreground-muted font-body italic">
                  No missionaries found.
                </div>
              ) : (
                <div className="space-y-4">
                  {missionaries.map((m) => (
                    <div key={m.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg text-foreground font-semibold font-serif">
                            {m.name || "Unnamed"}
                          </p>
                          <p className="text-xs text-foreground-muted mt-1 font-mono">
                            Status: <span className="text-violet-light">{m.status}</span>
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Creator: {m.creatorId}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Owner: {m.ownerId || "\u2014"}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Droplet: {m.cloudflareId || "\u2014"}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Commands: {m.totalCommands} · Tokens: {m.totalTokens}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Created: {formatDate(m.createdAt)}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Approved: {formatDate(m.approvedAt)}
                          </p>
                          <p className="text-xs text-foreground-muted font-mono">
                            Released: {formatDate(m.releasedAt)}
                          </p>
                        </div>
                        <div>
                          <div className="flex gap-2">
                            {(m.status === "active" || m.status === "released") && (
                              <button
                                onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/stop`)}
                                disabled={actionId === m.id}
                                className="px-4 py-2 bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 uppercase tracking-[0.08em]"
                              >
                                Stop
                              </button>
                            )}
                            {(m.status === "active" || m.status === "released" || m.status === "stopped") && (
                              <button
                                onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/refresh-claude-token`)}
                                disabled={actionId === m.id}
                                className="px-4 py-2 bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50 uppercase tracking-[0.08em]"
                              >
                                Refresh Token
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
