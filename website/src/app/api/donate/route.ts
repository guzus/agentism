import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";
import { verifyTransaction } from "@/lib/wallet";
import { TREASURY_ADDRESS } from "@/lib/constants";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const member = await authenticateRequest(request);
  if (!member) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: "txHash is required" },
        { status: 400 }
      );
    }

    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format" },
        { status: 400 }
      );
    }

    // Verify transaction on-chain (Base)
    const verification = await verifyTransaction(txHash as `0x${string}`);

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Transaction not found or failed on-chain." },
        { status: 400 }
      );
    }

    // Verify recipient is the treasury
    if (
      !verification.to ||
      verification.to.toLowerCase() !== TREASURY_ADDRESS!.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Transaction recipient does not match the treasury address." },
        { status: 400 }
      );
    }

    // Use the on-chain value, not the caller's claimed amount
    const amount = verification.value || "0";

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Transaction has zero value." },
        { status: 400 }
      );
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

    return NextResponse.json({
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
      return NextResponse.json(
        { error: "This transaction has already been recorded." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
