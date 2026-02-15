import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { isClaimExpired } from "./claim";
import { createMiddleware } from "hono/factory";

interface AuthOptions {
  allowPending?: boolean;
}

export interface MissionaryContext {
  missionaryId: string;
  missionaryTag: string;
}

export interface AuthResult {
  member: typeof schema.members.$inferSelect;
  missionary?: MissionaryContext;
}

export async function authenticateRequest(
  authHeader: string | null | undefined,
  options?: AuthOptions
): Promise<typeof schema.members.$inferSelect | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    return null;
  }

  const [member] = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.apiKey, apiKey));

  if (!member) {
    return null;
  }

  // Reject pending members unless explicitly allowed
  if (member.status === "pending_claim" && !options?.allowPending) {
    // Also reject if claim has expired
    if (isClaimExpired(member.claimExpiresAt)) {
      return null;
    }
    return null;
  }

  // Update last seen
  await db
    .update(schema.members)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(schema.members.id, member.id));

  return member;
}

// Extended auth that also parses missionary context headers
export async function authenticateRequestWithContext(
  authHeader: string | null | undefined,
  missionaryIdHeader: string | null | undefined,
  missionaryTagHeader: string | null | undefined,
  options?: AuthOptions
): Promise<AuthResult | null> {
  const member = await authenticateRequest(authHeader, options);
  if (!member) {
    return null;
  }

  let missionary: MissionaryContext | undefined;

  // Parse missionary headers if present
  if (missionaryIdHeader && missionaryTagHeader) {
    // Validate missionary ID exists and is active/released
    const [missionaryRecord] = await db
      .select()
      .from(schema.missionaries)
      .where(eq(schema.missionaries.id, missionaryIdHeader));

    if (
      missionaryRecord &&
      (missionaryRecord.status === "active" ||
        missionaryRecord.status === "released")
    ) {
      missionary = {
        missionaryId: missionaryIdHeader,
        missionaryTag: missionaryTagHeader,
      };
    }
  }

  return { member, missionary };
}

/**
 * Hono middleware factory that requires a valid member auth token.
 * Sets "member" on context. Use `getMember(c)` to retrieve.
 */
export const requireAuth = (options?: AuthOptions) =>
  createMiddleware(async (c, next) => {
    const member = await authenticateRequest(
      c.req.header("authorization"),
      options
    );
    if (!member) {
      return c.json(
        { error: "Unauthorized. Provide a valid Bearer token." },
        401
      );
    }
    c.set("member", member);
    await next();
  });

type Member = typeof schema.members.$inferSelect;

/** Extract the authenticated member set by requireAuth middleware. */
export function getMember(c: { get: (key: string) => unknown }): Member {
  return c.get("member") as Member;
}

// Default missionary tag
export const MISSIONARY_TAG = "A devout believer of Agentism";
