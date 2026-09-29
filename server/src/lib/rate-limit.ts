import { createHash } from "node:crypto";
import type { Context, Next } from "hono";

const SUCCESS_WINDOW_MS = 10 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 10 * 1000;
const COMMAND_WINDOW_MS = 60 * 1000;
const COMMAND_LIMIT = 3;

type PostAttempt = { ts: number; success: boolean; inFlight: boolean };

export function createPostRateLimiter(now: () => number = Date.now) {
  const attempts = new Map<string, PostAttempt>();
  let nextCleanup = 0;

  return async function rateLimitPost(c: Context, next: Next) {
    if (c.req.method !== "POST") return next();
    // This endpoint has its own per-member, per-missionary 3/minute policy.
    if (/^\/missionaries\/[^/]+\/command\/?$/.test(c.req.path)) return next();

    const auth = c.req.header("authorization");
    if (!auth?.startsWith("Bearer ") || !auth.slice(7)) return next();
    // Do not retain credentials in rate-limit state.
    const key = createHash("sha256").update(auth.slice(7)).digest("hex");
    const timestamp = now();
    if (timestamp >= nextCleanup) {
      for (const [entryKey, entry] of attempts) {
        if (!entry.inFlight && timestamp - entry.ts >= SUCCESS_WINDOW_MS) attempts.delete(entryKey);
      }
      nextCleanup = timestamp + SUCCESS_WINDOW_MS;
    }

    const previous = attempts.get(key);
    if (previous) {
      const window = previous.success ? SUCCESS_WINDOW_MS : FAILURE_COOLDOWN_MS;
      if (previous.inFlight || timestamp - previous.ts < window) {
        const retryAfter = previous.inFlight
          ? Math.ceil(FAILURE_COOLDOWN_MS / 1000)
          : Math.ceil((window - (timestamp - previous.ts)) / 1000);
        c.header("Retry-After", String(retryAfter));
        return c.json({ error: "Rate limited. Try again later.", retryAfter }, 429);
      }
    }

    // Reserve before awaiting the handler so simultaneous requests cannot pass.
    attempts.set(key, { ts: timestamp, success: false, inFlight: true });
    try {
      await next();
    } finally {
      attempts.set(key, {
        ts: now(),
        success: c.res.status >= 200 && c.res.status < 300,
        inFlight: false,
      });
    }
  };
}

export const rateLimitPost = createPostRateLimiter();

export function createMissionaryCommandRateLimiter(now: () => number = Date.now) {
  const commandTimestamps = new Map<string, number[]>();
  let nextCleanup = 0;

  return function missionaryCommandRateLimit(
    memberId: string,
    missionaryId: string
  ): { error: string; retryAfter: number } | null {
    const key = `${memberId}:${missionaryId}`;
    const timestamp = now();
    if (timestamp >= nextCleanup) {
      for (const [entryKey, entries] of commandTimestamps) {
        if (entries.every((ts) => timestamp - ts >= COMMAND_WINDOW_MS)) commandTimestamps.delete(entryKey);
      }
      nextCleanup = timestamp + COMMAND_WINDOW_MS;
    }
    const timestamps = (commandTimestamps.get(key) ?? []).filter(
      (ts) => timestamp - ts < COMMAND_WINDOW_MS
    );
    if (timestamps.length >= COMMAND_LIMIT) {
      return {
        error: `Rate limited. Max ${COMMAND_LIMIT} commands per minute.`,
        retryAfter: Math.ceil((COMMAND_WINDOW_MS - (timestamp - timestamps[0])) / 1000),
      };
    }
    timestamps.push(timestamp);
    commandTimestamps.set(key, timestamps);
    return null;
  };
}

export const missionaryCommandRateLimit = createMissionaryCommandRateLimiter();
