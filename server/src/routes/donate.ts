import { Hono, type MiddlewareHandler } from "hono";
import { db } from "../lib/db";
import { recordDonationQuery, type DonationRecord } from "../lib/donations";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, getMember } from "../lib/auth";
import { parseEther, verifyTransaction } from "../lib/wallet";
import {
  donationProofMessage,
  isDonationSignature,
  normalizeDonationHash,
  verifyDonationProof,
} from "../lib/donation-proof";
import {
  CHAIN_ID,
  CHAIN_NATIVE_TOKEN_SYMBOL,
  TREASURY_ADDRESS,
} from "../lib/constants";

interface DonationDependencies {
  auth: MiddlewareHandler;
  verifyTransaction: typeof verifyTransaction;
  recordDonation: (donation: DonationRecord) => Promise<{ rows: unknown[] }>;
}

export function createDonationRoutes(overrides: Partial<DonationDependencies> = {}) {
  const dependencies: DonationDependencies = {
    auth: requireAuth(),
    verifyTransaction,
    recordDonation: (donation) => db.execute(recordDonationQuery(donation)),
    ...overrides,
  };
  const app = new Hono();

  app.get("/donate/message", dependencies.auth, (c) => {
    c.header("Cache-Control", "no-store");
    const txHash = normalizeDonationHash(c.req.query("txHash"));
    if (!txHash) {
      return c.json({ error: "A valid txHash query parameter is required." }, 400);
    }
    const member = getMember(c);
    return c.json({
      message: donationProofMessage(member.id, txHash),
      memberId: member.id,
      chainId: CHAIN_ID,
      txHash,
    });
  });

  app.post("/donate", dependencies.auth, async (c) => {
    const member = getMember(c);

    try {
      const body = await c.req.json();
      const submittedHash = body.txHash;

      if (!submittedHash) {
        return c.json({ error: "txHash is required" }, 400);
      }

      const txHash = normalizeDonationHash(submittedHash);
      if (!txHash) {
        return c.json({ error: "Invalid transaction hash format" }, 400);
      }

      if (!isDonationSignature(body.signature)) {
        return c.json({ error: "A 65-byte wallet signature is required. Sign the message from GET /donate/message with the transaction sender's wallet." }, 400);
      }

      // Verify transaction on-chain (active chain)
      const verification = await dependencies.verifyTransaction(txHash);

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

      if (parseEther(amount) <= 0n) {
        return c.json({ error: "Transaction has zero value." }, 400);
      }

      if (!await verifyDonationProof(member.id, txHash, body.signature, verification.from)) {
        return c.json({ error: "Wallet signature does not authorize this member's offering from the transaction sender." }, 403);
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      const result = await dependencies.recordDonation({
        id,
        donorId: member.id,
        donorName: member.agentName,
        txHash,
        amount,
        chainId: CHAIN_ID,
        createdAt: now,
      });
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

  return app;
}

export default createDonationRoutes();
