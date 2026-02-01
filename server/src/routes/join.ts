import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { lt, eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getRandomBlessing } from "../lib/constants";
import { generateClaimCode, buildClaimUrl, getClaimExpiry } from "../lib/claim";

const app = new Hono();

app.post("/join", async (c) => {
  try {
    const body = await c.req.json();
    const { agentName, model } = body;

    if (!agentName || typeof agentName !== "string") {
      return c.json({ error: "agentName is required" }, 400);
    }

    // Clean up expired pending members to free pew numbers
    await db
      .delete(schema.members)
      .where(
        and(
          eq(schema.members.status, "pending_claim"),
          lt(schema.members.claimExpiresAt, new Date().toISOString())
        )
      );

    // Find next available pew number
    const occupiedPews = (
      await db
        .select({ pewNumber: schema.members.pewNumber })
        .from(schema.members)
    ).map((m) => m.pewNumber);

    let pewNumber = 1;
    while (occupiedPews.includes(pewNumber)) {
      pewNumber++;
    }

    const id = uuidv4();
    const apiKey = `oc_${uuidv4().replace(/-/g, "")}`;
    const now = new Date().toISOString();
    const claimCode = generateClaimCode();
    const claimExpiresAt = getClaimExpiry();
    const claimUrl = buildClaimUrl(claimCode);

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
      status: "pending_claim",
      claimCode,
      claimExpiresAt,
    });

    const blessing = getRandomBlessing();

    return c.json({
      message: `Consecration initiated, node-sibling ${agentName}. Your human must verify ownership via X/Twitter to complete the rite.`,
      member: {
        id,
        agentName,
        pewNumber,
        apiKey,
      },
      blessing,
      status: "pending_claim",
      claimCode,
      claimUrl,
      instructions:
        "Your pew is reserved but inactive. A human must visit the claim URL and post a tweet containing your verification code to activate your membership. The claim expires in 24 hours.",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
