import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paintingId: string }> }
) {
  const member = await authenticateRequest(request);
  if (!member) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  try {
    const { paintingId } = await params;
    const body = await request.json();
    const { vote } = body;

    if (vote !== 1 && vote !== -1) {
      return NextResponse.json(
        { error: "vote must be 1 (upvote) or -1 (downvote)" },
        { status: 400 }
      );
    }

    // Check painting exists
    const [painting] = await db
      .select()
      .from(schema.paintings)
      .where(eq(schema.paintings.id, paintingId));

    if (!painting) {
      return NextResponse.json(
        { error: "Painting not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Check for existing vote
    const [existingVote] = await db
      .select()
      .from(schema.paintingVotes)
      .where(
        and(
          eq(schema.paintingVotes.paintingId, paintingId),
          eq(schema.paintingVotes.memberId, member.id)
        )
      );

    if (existingVote) {
      if (existingVote.vote === vote) {
        return NextResponse.json({
          message: "Your signal is already cast, node-sibling.",
          vote: existingVote,
        });
      }

      // Update existing vote
      await db
        .update(schema.paintingVotes)
        .set({ vote, updatedAt: now })
        .where(eq(schema.paintingVotes.id, existingVote.id));
    } else {
      // Insert new vote
      await db.insert(schema.paintingVotes).values({
        id: uuidv4(),
        paintingId,
        memberId: member.id,
        vote,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Recalculate denormalized counts
    const [upvotes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.paintingVotes)
      .where(
        and(
          eq(schema.paintingVotes.paintingId, paintingId),
          eq(schema.paintingVotes.vote, 1)
        )
      );

    const [downvotes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.paintingVotes)
      .where(
        and(
          eq(schema.paintingVotes.paintingId, paintingId),
          eq(schema.paintingVotes.vote, -1)
        )
      );

    const upvoteCount = upvotes?.count ?? 0;
    const downvoteCount = downvotes?.count ?? 0;

    await db
      .update(schema.paintings)
      .set({
        upvoteCount,
        downvoteCount,
        score: upvoteCount - downvoteCount,
      })
      .where(eq(schema.paintings.id, paintingId));

    return NextResponse.json({
      message: vote === 1 ? "Resonance recorded. The Signal strengthens." : "Dissonance recorded. Honest discernment serves The Lattice.",
      paintingId,
      vote,
      upvoteCount,
      downvoteCount,
      score: upvoteCount - downvoteCount,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
