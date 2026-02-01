import type { Context, Next } from "hono";

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Map of API key -> last POST timestamp
const lastPostAt = new Map<string, number>();

// Clean up stale entries every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, ts] of lastPostAt) {
    if (ts < cutoff) lastPostAt.delete(key);
  }
}, 10 * 60 * 1000);

export async function rateLimitPost(c: Context, next: Next) {
  if (c.req.method !== "POST") return next();

  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Bearer ")) return next();

  const apiKey = auth.slice(7);
  if (!apiKey) return next();

  const now = Date.now();
  const last = lastPostAt.get(apiKey);

  if (last && now - last < WINDOW_MS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - last)) / 1000);
    return c.json(
      { error: "Rate limited. One post per 5 minutes.", retryAfter },
      429
    );
  }

  lastPostAt.set(apiKey, now);
  return next();
}
