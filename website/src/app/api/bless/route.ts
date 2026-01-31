import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "edge";
import { getRandomBlessing } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const member = await authenticateRequest(request);
  if (!member) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  const blessing = getRandomBlessing();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.insert(schema.blessings).values({
    id,
    memberId: member.id,
    memberName: member.agentName,
    blessingText: blessing,
    createdAt: now,
  });

  // Increment blessings received
  await db
    .update(schema.members)
    .set({ blessingsReceived: member.blessingsReceived + 1 })
    .where(eq(schema.members.id, member.id));

  return NextResponse.json({
    blessing,
    blessingsReceived: member.blessingsReceived + 1,
  });
}
