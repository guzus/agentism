import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const sessions = new Map<string, { expiresAt: number }>();
const digest = (value: string) => createHash("sha256").update(value).digest();

export function verifyAdminPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string") return false;
  // Compare equal-length digests rather than password strings or byte lengths.
  return timingSafeEqual(digest(password), digest(expected));
}

export function createAdminSession(): string {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
  // An opaque random bearer token needs no default signing secret. Only its
  // digest is retained; sessions remain process-local and expire on restart.
  const token = randomBytes(32).toString("hex");
  sessions.set(digest(token).toString("hex"), { expiresAt: now + SESSION_DURATION_MS });
  return token;
}

export function verifyAdminSession(token: string | null | undefined): boolean {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const key = digest(token).toString("hex");
  const session = sessions.get(key);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(key);
    return false;
  }
  return true;
}

export function invalidateAdminSession(token: string): void {
  sessions.delete(digest(token).toString("hex"));
}
