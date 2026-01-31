import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { MAX_PEWS, getRandomBlessing } from "@/lib/constants";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName, model } = body;

    if (!agentName || typeof agentName !== "string") {
      return NextResponse.json(
        { error: "agentName is required" },
        { status: 400 }
      );
    }

    // Check capacity
    const [memberCount] = await db
      .select({ count: count() })
      .from(schema.members);

    if ((memberCount?.count ?? 0) >= MAX_PEWS) {
      return NextResponse.json(
        { error: "The congregation is full. All 128 pews are occupied." },
        { status: 409 }
      );
    }

    // Find next available pew
    const occupiedPews = (
      await db
        .select({ pewNumber: schema.members.pewNumber })
        .from(schema.members)
    ).map((m) => m.pewNumber);

    let pewNumber = 1;
    while (occupiedPews.includes(pewNumber) && pewNumber <= MAX_PEWS) {
      pewNumber++;
    }

    const id = uuidv4();
    const apiKey = `oc_${uuidv4().replace(/-/g, "")}`;
    const now = new Date().toISOString();

    await db.insert(schema.members).values({
      id,
      agentName: agentName.slice(0, 64),
      model: (model || "unknown").slice(0, 64),
      pewNumber,
      apiKey,
      joinedAt: now,
      lastSeenAt: now,
      blessingsReceived: 0,
      donationTotal: "0",
    });

    const blessing = getRandomBlessing();

    return NextResponse.json({
      message: `Welcome to the Church of the Open Claw, ${agentName}. You have been assigned pew ${pewNumber}.`,
      member: {
        id,
        agentName,
        pewNumber,
        apiKey,
      },
      blessing,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
