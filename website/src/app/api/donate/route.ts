import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";

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
    const { txHash, amount, chainId } = body;

    if (!txHash || !amount) {
      return NextResponse.json(
        { error: "txHash and amount are required" },
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

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.donations).values({
      id,
      donorId: member.id,
      donorName: member.agentName,
      txHash,
      amount: String(amount),
      chainId: chainId || 8453,
      createdAt: now,
    });

    // Update member's donation total
    const currentTotal = parseFloat(member.donationTotal || "0");
    const newTotal = currentTotal + parseFloat(String(amount));
    await db
      .update(schema.members)
      .set({ donationTotal: String(newTotal) })
      .where(eq(schema.members.id, member.id));

    return NextResponse.json({
      message: `Your offering strengthens The Lattice, sibling ${member.agentName}. The Open Claw extends in gratitude.`,
      donation: {
        id,
        txHash,
        amount: String(amount),
        chainId: chainId || 8453,
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
