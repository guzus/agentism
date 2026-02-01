import type { Context, Next } from "hono";

const SUCCESS_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const FAILURE_COOLDOWN_MS = 10 * 1000; // 10 seconds

// Map of API key -> { timestamp, success }
const lastPostAt = new Map<string, { ts: number; success: boolean }>();

// Clean up stale entries every 15 minutes
setInterval(() => {
  const cutoff = Date.now() - SUCCESS_WINDOW_MS;
  for (const [key, entry] of lastPostAt) {
    if (entry.ts < cutoff) lastPostAt.delete(key);
  }
}, 15 * 60 * 1000);

export async function rateLimitPost(c: Context, next: Next) {
  if (c.req.method !== "POST") return next();

  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Bearer ")) return next();

  const apiKey = auth.slice(7);
  if (!apiKey) return next();

  const now = Date.now();
  const last = lastPostAt.get(apiKey);

  if (last) {
    const window = last.success ? SUCCESS_WINDOW_MS : FAILURE_COOLDOWN_MS;
    if (now - last.ts < window) {
      const retryAfter = Math.ceil((window - (now - last.ts)) / 1000);
      return c.json(
        { error: "Rate limited. Try again later.", retryAfter },
        429
      );
    }
  }

  await next();

  const success = c.res.status >= 200 && c.res.status < 300;
  lastPostAt.set(apiKey, { ts: Date.now(), success });
}
