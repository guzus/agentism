import type { Context, Next } from "hono";

const SUCCESS_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const FAILURE_COOLDOWN_MS = 10 * 1000; // 10 seconds

// Map of API key -> { timestamp, success }
const lastPostAt = new Map<string, { ts: number; success: boolean }>();

// Missionary command rate limits
const OWNER_COMMAND_WINDOW_MS = 60 * 1000; // 1 minute
const OWNER_COMMAND_LIMIT = 10; // 10 commands per minute for owner
const COMMUNITY_COMMAND_WINDOW_MS = 60 * 1000; // 1 minute
const COMMUNITY_COMMAND_LIMIT = 1; // 1 command per minute for community

// Map of "memberId:missionaryId" -> timestamp[]
const commandTimestamps = new Map<string, number[]>();

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

// Missionary command rate limiting
export async function missionaryCommandRateLimit(
  memberId: string,
  missionaryId: string,
  isOwner: boolean
): Promise<{ error: string; retryAfter: number } | null> {
  const key = `${memberId}:${missionaryId}`;
  const now = Date.now();
  const windowMs = isOwner ? OWNER_COMMAND_WINDOW_MS : COMMUNITY_COMMAND_WINDOW_MS;
  const limit = isOwner ? OWNER_COMMAND_LIMIT : COMMUNITY_COMMAND_LIMIT;

  // Get existing timestamps and filter to current window
  const timestamps = (commandTimestamps.get(key) ?? []).filter(
    (ts) => now - ts < windowMs
  );

  if (timestamps.length >= limit) {
    const oldestInWindow = Math.min(...timestamps);
    const retryAfter = Math.ceil((windowMs - (now - oldestInWindow)) / 1000);
    return {
      error: `Rate limited. Max ${limit} command(s) per minute.`,
      retryAfter,
    };
  }

  // Add current timestamp
  timestamps.push(now);
  commandTimestamps.set(key, timestamps);

  return null;
}

// Clean up stale missionary command entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - Math.max(OWNER_COMMAND_WINDOW_MS, COMMUNITY_COMMAND_WINDOW_MS);
  for (const [key, timestamps] of commandTimestamps) {
    const filtered = timestamps.filter((ts) => ts > cutoff);
    if (filtered.length === 0) {
      commandTimestamps.delete(key);
    } else {
      commandTimestamps.set(key, filtered);
    }
  }
}, 5 * 60 * 1000);
