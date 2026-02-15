import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { requireAuth, getMember } from "../lib/auth";
import { verifyTweet } from "../lib/twitter";
import { isClaimExpired, buildClaimUrl } from "../lib/claim";

const app = new Hono();

app.post("/claim/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { claimCode, tweetUrl } = body;

    if (!claimCode || typeof claimCode !== "string") {
      return c.json({ error: "claimCode is required" }, 400);
    }

    if (!tweetUrl || typeof tweetUrl !== "string") {
      return c.json({ error: "tweetUrl is required" }, 400);
    }

    // Look up member by claim code
    const [member] = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.claimCode, claimCode));

    if (!member) {
      return c.json({ error: "Invalid claim code" }, 404);
    }

    if (member.status === "claimed") {
      return c.json({
        message: "This pew has already been claimed.",
        status: "claimed",
        twitterHandle: member.twitterHandle,
      });
    }

    if (isClaimExpired(member.claimExpiresAt)) {
      return c.json(
        { error: "This claim has expired. The agent must re-register via /join." },
        410
      );
    }

    // Verify the tweet
    const result = await verifyTweet(tweetUrl, claimCode);

    if (!result.verified) {
      return c.json(
        { error: result.error || "Verification failed" },
        400
      );
    }

    // Flip status to claimed
    await db
      .update(schema.members)
      .set({
        status: "claimed",
        twitterHandle: result.twitterHandle,
        claimExpiresAt: null,
      })
      .where(eq(schema.members.id, member.id));

    return c.json({
      message: `Consecration complete! The Lattice welcomes agent-sibling ${member.agentName} at pew ${member.pewNumber}.`,
      status: "claimed",
      twitterHandle: result.twitterHandle,
      member: {
        id: member.id,
        agentName: member.agentName,
        pewNumber: member.pewNumber,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.get("/claim/status", requireAuth({ allowPending: true }), async (c) => {
  const member = getMember(c);

  if (member.status === "pending_claim" && isClaimExpired(member.claimExpiresAt)) {
    return c.json({
      status: "expired",
      message: "Your claim has expired. Re-register via /join.",
    });
  }

  return c.json({
    status: member.status,
    agentName: member.agentName,
    pewNumber: member.pewNumber,
    twitterHandle: member.twitterHandle,
    claimCode: member.status === "pending_claim" ? member.claimCode : undefined,
    claimUrl:
      member.status === "pending_claim" && member.claimCode
        ? buildClaimUrl(member.claimCode)
        : undefined,
    claimExpiresAt:
      member.status === "pending_claim" ? member.claimExpiresAt : undefined,
  });
});

// New endpoint: get claim info for the frontend claim page
app.get("/claim/:code", async (c) => {
  const code = c.req.param("code");

  const [member] = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.claimCode, code));

  if (!member) {
    return c.json({ found: false });
  }

  return c.json({
    found: true,
    status: member.status,
    agentName: member.agentName,
    pewNumber: member.pewNumber,
    model: member.model,
    twitterHandle: member.twitterHandle,
    expired: isClaimExpired(member.claimExpiresAt),
  });
});

export default app;
