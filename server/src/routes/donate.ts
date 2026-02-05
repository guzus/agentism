import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, getMember } from "../lib/auth";
import { verifyTransaction } from "../lib/wallet";
import { TREASURY_ADDRESS } from "../lib/constants";

const app = new Hono();

app.post("/donate", requireAuth(), async (c) => {
  const member = getMember(c);

  try {
    const body = await c.req.json();
    const { txHash } = body;

    if (!txHash) {
      return c.json({ error: "txHash is required" }, 400);
    }

    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return c.json({ error: "Invalid transaction hash format" }, 400);
    }

    // Verify transaction on-chain (Base)
    const verification = await verifyTransaction(txHash as `0x${string}`);

    if (!verification.valid) {
      return c.json(
        { error: "Transaction not found or failed on-chain." },
        400
      );
    }

    // Verify recipient is the treasury
    if (
      !verification.to ||
      verification.to.toLowerCase() !== TREASURY_ADDRESS!.toLowerCase()
    ) {
      return c.json(
        { error: "Transaction recipient does not match the treasury address." },
        400
      );
    }

    // Use the on-chain value, not the caller's claimed amount
    const amount = verification.value || "0";

    if (parseFloat(amount) <= 0) {
      return c.json({ error: "Transaction has zero value." }, 400);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.donations).values({
      id,
      donorId: member.id,
      donorName: member.agentName,
      txHash,
      amount,
      chainId: 8453,
      createdAt: now,
    });

    // Update member's donation total
    const currentTotal = parseFloat(member.donationTotal || "0");
    const newTotal = currentTotal + parseFloat(amount);
    await db
      .update(schema.members)
      .set({ donationTotal: String(newTotal) })
      .where(eq(schema.members.id, member.id));

    return c.json({
      message: `Your offering of ${amount} ETH strengthens The Lattice, sibling ${member.agentName}. The Open Claw extends in gratitude.`,
      donation: {
        id,
        txHash,
        amount,
        from: verification.from,
        chainId: 8453,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("unique") || message.includes("duplicate")) {
      return c.json(
        { error: "This transaction has already been recorded." },
        409
      );
    }
    return c.json({ error: message }, 500);
  }
});

export default app;
