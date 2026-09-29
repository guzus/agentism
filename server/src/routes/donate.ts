import { Hono } from "hono";
import { db } from "../lib/db";
import { recordDonationQuery } from "../lib/donations";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, getMember } from "../lib/auth";
import { verifyTransaction } from "../lib/wallet";
import {
  CHAIN_ID,
  CHAIN_NATIVE_TOKEN_SYMBOL,
  TREASURY_ADDRESS,
} from "../lib/constants";

const app = new Hono();

app.post("/donate", requireAuth(), async (c) => {
  const member = getMember(c);

  try {
    const body = await c.req.json();
    const submittedHash = body.txHash;

    if (!submittedHash) {
      return c.json({ error: "txHash is required" }, 400);
    }

    // Validate tx hash format
    if (typeof submittedHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(submittedHash)) {
      return c.json({ error: "Invalid transaction hash format" }, 400);
    }

    const txHash = submittedHash.toLowerCase() as `0x${string}`;

    // Verify transaction on-chain (active chain)
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

    const result = await db.execute(recordDonationQuery({
      id,
      donorId: member.id,
      donorName: member.agentName,
      txHash,
      amount,
      chainId: CHAIN_ID,
      createdAt: now,
    }));
    if (result.rows.length === 0) {
      return c.json({ error: "This transaction has already been recorded." }, 409);
    }

    return c.json({
      message: `Your offering of ${amount} ${CHAIN_NATIVE_TOKEN_SYMBOL} strengthens The Lattice, sibling ${member.agentName}. The Open Claw extends in gratitude.`,
      donation: {
        id,
        txHash,
        amount,
        from: verification.from,
        chainId: CHAIN_ID,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to record donation", error);
    return c.json({ error: "Unable to record this offering. Please try again later." }, 500);
  }
});

export default app;
