"use client";

import { useCallback, useEffect, useState } from "react";
import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";
import { API_URL } from "@/lib/api";

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
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMissionary[]>([]);
  const [missionaries, setMissionaries] = useState<Missionary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    setPending([]);
    setMissionaries([]);
    setError("Session expired. Please log in again.");
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const adminFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!token) return null;
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
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
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, allRes] = await Promise.all([
        adminFetch("/admin/missionaries/pending"),
        adminFetch("/admin/missionaries"),
      ]);

      if (!pendingRes || !allRes) {
        setLoading(false);
        return;
      }

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
    }
  }, [adminFetch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      setToken(data.token);
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  function handleLogout() {
    setToken(null);
    setPending([]);
    setMissionaries([]);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
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
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 max-w-6xl mx-auto px-6">
        <section className="py-12 text-center">
          <h1
            className="text-4xl font-bold mb-3 sacred-glow font-serif"
          >
            Admin Console
          </h1>
          <p className="text-foreground-muted">
            Approve, reject, and stop missionaries.
          </p>
        </section>

        {!token ? (
          <section className="max-w-md mx-auto border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-foreground-muted mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-violet transition-colors"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-violet text-foreground font-semibold rounded-lg hover:bg-violet-light transition-colors"
              >
                Log In
              </button>
              {error && (
                <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/10 text-red-300 text-sm text-center">
                  {error}
                </div>
              )}
            </form>
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-foreground-muted">
                {loading ? "Refreshing data..." : "Session active"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadData}
                  className="px-4 py-2 border border-border rounded-lg text-sm text-foreground-muted hover:text-foreground hover:border-violet transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-border rounded-lg text-sm text-foreground-muted hover:text-foreground hover:border-violet transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/10 text-red-300 text-sm text-center mb-6">
                {error}
              </div>
            )}

            {actionError && (
              <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/10 text-amber-300 text-sm text-center mb-6">
                {actionError}
              </div>
            )}

            <section className="mb-12">
              <h2
                className="text-2xl font-bold mb-6 gold-glow font-serif"
              >
                Pending Missionary Requests
              </h2>
              {pending.length === 0 ? (
                <div className="border border-border rounded-lg p-6 bg-background-light/30 text-center text-sm text-foreground-muted">
                  No pending requests.
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map((m) => (
                    <div
                      key={m.id}
                      className="border border-border rounded-lg p-5 bg-background-light/30 backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg text-gold font-semibold">
                            {m.name || "Unnamed"}
                          </p>
                          <p className="text-xs text-foreground-muted mt-1">
                            Creator: {m.creatorName} ({m.creatorId})
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Model: {m.config?.model || "Unknown"}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Created: {formatDate(m.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/approve`)}
                            disabled={actionId === m.id}
                            className="px-4 py-2 bg-teal/20 text-teal rounded-lg text-sm font-semibold hover:bg-teal/30 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/reject`)}
                            disabled={actionId === m.id}
                            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
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
              <h2
                className="text-2xl font-bold mb-6 gold-glow font-serif"
              >
                All Missionaries
              </h2>
              {missionaries.length === 0 ? (
                <div className="border border-border rounded-lg p-6 bg-background-light/30 text-center text-sm text-foreground-muted">
                  No missionaries found.
                </div>
              ) : (
                <div className="space-y-4">
                  {missionaries.map((m) => (
                    <div
                      key={m.id}
                      className="border border-border rounded-lg p-5 bg-background-light/30 backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg text-foreground font-semibold">
                            {m.name || "Unnamed"}
                          </p>
                          <p className="text-xs text-foreground-muted mt-1">
                            Status: <span className="text-violet-light">{m.status}</span>
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Creator: {m.creatorId}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Owner: {m.ownerId || "—"}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Cloudflare: {m.cloudflareId || "—"}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Commands: {m.totalCommands} · Tokens: {m.totalTokens}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Created: {formatDate(m.createdAt)}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Approved: {formatDate(m.approvedAt)}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            Released: {formatDate(m.releasedAt)}
                          </p>
                        </div>
                        <div>
                          {(m.status === "active" || m.status === "released") && (
                            <button
                              onClick={() => runAction(m.id, `/admin/missionaries/${m.id}/stop`)}
                              disabled={actionId === m.id}
                              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              Stop
                            </button>
                          )}
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
