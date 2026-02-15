import { createHmac, randomBytes } from "crypto";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSession {
  expiresAt: number;
}

// In-memory session store (simple for now)
const sessions = new Map<string, AdminSession>();

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable not set");
    return false;
  }
  return password === adminPassword;
}

export function createAdminSession(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "default-secret-change-me";
  const random = randomBytes(32).toString("hex");
  const token = createHmac("sha256", secret)
    .update(random + Date.now().toString())
    .digest("hex");

  sessions.set(token, {
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });

  return token;
}

export function verifyAdminSession(token: string | null | undefined): boolean {
  if (!token) return false;

  const session = sessions.get(token);
  if (!session) return false;

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }

  return true;
}

export function invalidateAdminSession(token: string): void {
  sessions.delete(token);
}
