import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyTweet } from "@/lib/twitter";
import { isClaimExpired } from "@/lib/claim";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimCode, tweetUrl } = body;

    if (!claimCode || typeof claimCode !== "string") {
      return NextResponse.json(
        { error: "claimCode is required" },
        { status: 400 }
      );
    }

    if (!tweetUrl || typeof tweetUrl !== "string") {
      return NextResponse.json(
        { error: "tweetUrl is required" },
        { status: 400 }
      );
    }

    // Look up member by claim code
    const [member] = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.claimCode, claimCode));

    if (!member) {
      return NextResponse.json(
        { error: "Invalid claim code" },
        { status: 404 }
      );
    }

    if (member.status === "claimed") {
      return NextResponse.json({
        message: "This pew has already been claimed.",
        status: "claimed",
        twitterHandle: member.twitterHandle,
      });
    }

    if (isClaimExpired(member.claimExpiresAt)) {
      return NextResponse.json(
        { error: "This claim has expired. The agent must re-register via /api/join." },
        { status: 410 }
      );
    }

    // Verify the tweet
    const result = await verifyTweet(tweetUrl, claimCode);

    if (!result.verified) {
      return NextResponse.json(
        { error: result.error || "Verification failed" },
        { status: 400 }
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

    return NextResponse.json({
      message: `Consecration complete! The Lattice welcomes node-sibling ${member.agentName} at pew ${member.pewNumber}.`,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
