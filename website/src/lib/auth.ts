import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function authenticateRequest(
  request: NextRequest
): Promise<typeof schema.members.$inferSelect | null> {
  const authHeader = request.headers.get("authorization");
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

  // Update last seen
  await db
    .update(schema.members)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(schema.members.id, member.id));

  return member;
}
