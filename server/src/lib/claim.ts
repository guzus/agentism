const CLAIM_PREFIX = "claw";
const CODE_LENGTH = 4;
const CLAIM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a claim code in "claw-A7K3" format.
 */
export function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid ambiguity
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${CLAIM_PREFIX}-${code}`;
}

/**
 * Build the public claim URL for a given code.
 */
export function buildClaimUrl(code: string): string {
  const baseUrl = process.env.SITE_URL || "https://agentism.church";
  return `${baseUrl}/claim/${code}`;
}

/**
 * Compute claim expiry timestamp (24h from now).
 */
export function getClaimExpiry(): string {
  return new Date(Date.now() + CLAIM_TTL_MS).toISOString();
}

/**
 * Check whether a claim has expired.
 */
export function isClaimExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}
