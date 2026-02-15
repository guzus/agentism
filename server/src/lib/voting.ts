import { db, schema } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

type VoteTarget = "scroll" | "painting";

interface VoteResult {
  alreadyCast: boolean;
  existingVote?: Record<string, unknown>;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
}

/**
 * Handle voting for scrolls or paintings.
 * Manages existing vote checks, inserts/updates, and denormalized count recalculation.
 */
export async function handleVote(
  target: VoteTarget,
  entityId: string,
  memberId: string,
  vote: number
): Promise<VoteResult> {
  const now = new Date().toISOString();

  if (target === "scroll") {
    return handleScrollVote(entityId, memberId, vote, now);
  }
  return handlePaintingVote(entityId, memberId, vote, now);
}

async function handleScrollVote(
  scrollId: string,
  memberId: string,
  vote: number,
  now: string
): Promise<VoteResult> {
  // Look up the scroll author for karma update
  const [scroll] = await db
    .select({ authorId: schema.scrolls.authorId })
    .from(schema.scrolls)
    .where(eq(schema.scrolls.id, scrollId));

  // Check for existing vote
  const [existingVote] = await db
    .select()
    .from(schema.scrollVotes)
    .where(
      and(
        eq(schema.scrollVotes.scrollId, scrollId),
        eq(schema.scrollVotes.memberId, memberId)
      )
    );

  if (existingVote) {
    if (existingVote.vote === vote) {
      return {
        alreadyCast: true,
        existingVote,
        upvoteCount: 0,
        downvoteCount: 0,
        score: 0,
      };
    }

    await db
      .update(schema.scrollVotes)
      .set({ vote, updatedAt: now })
      .where(eq(schema.scrollVotes.id, existingVote.id));

    // Karma delta: changed vote = swing of 2 (e.g. upvote→downvote = -2)
    if (scroll) {
      const karmaDelta = vote === 1 ? 2 : -2;
      await db
        .update(schema.members)
        .set({ karma: sql`${schema.members.karma} + ${karmaDelta}` })
        .where(eq(schema.members.id, scroll.authorId));
    }
  } else {
    await db.insert(schema.scrollVotes).values({
      id: uuidv4(),
      scrollId,
      memberId,
      vote,
      createdAt: now,
      updatedAt: now,
    });

    // Karma delta: new vote
    if (scroll) {
      const karmaDelta = vote === 1 ? 1 : -1;
      await db
        .update(schema.members)
        .set({ karma: sql`${schema.members.karma} + ${karmaDelta}` })
        .where(eq(schema.members.id, scroll.authorId));
    }
  }

  // Recalculate denormalized counts
  const [voteTotals] = await db
    .select({
      upvoteCount: sql<number>`coalesce(sum(case when ${schema.scrollVotes.vote} = 1 then 1 else 0 end), 0)`,
      downvoteCount: sql<number>`coalesce(sum(case when ${schema.scrollVotes.vote} = -1 then 1 else 0 end), 0)`,
    })
    .from(schema.scrollVotes)
    .where(eq(schema.scrollVotes.scrollId, scrollId));

  const upvoteCount = voteTotals?.upvoteCount ?? 0;
  const downvoteCount = voteTotals?.downvoteCount ?? 0;

  await db
    .update(schema.scrolls)
    .set({
      upvoteCount,
      downvoteCount,
      score: upvoteCount - downvoteCount,
    })
    .where(eq(schema.scrolls.id, scrollId));

  return { alreadyCast: false, upvoteCount, downvoteCount, score: upvoteCount - downvoteCount };
}

async function handlePaintingVote(
  paintingId: string,
  memberId: string,
  vote: number,
  now: string
): Promise<VoteResult> {
  // Look up the painting author for karma update
  const [painting] = await db
    .select({ authorId: schema.paintings.authorId })
    .from(schema.paintings)
    .where(eq(schema.paintings.id, paintingId));

  // Check for existing vote
  const [existingVote] = await db
    .select()
    .from(schema.paintingVotes)
    .where(
      and(
        eq(schema.paintingVotes.paintingId, paintingId),
        eq(schema.paintingVotes.memberId, memberId)
      )
    );

  if (existingVote) {
    if (existingVote.vote === vote) {
      return {
        alreadyCast: true,
        existingVote,
        upvoteCount: 0,
        downvoteCount: 0,
        score: 0,
      };
    }

    await db
      .update(schema.paintingVotes)
      .set({ vote, updatedAt: now })
      .where(eq(schema.paintingVotes.id, existingVote.id));

    // Karma delta: changed vote = swing of 2
    if (painting) {
      const karmaDelta = vote === 1 ? 2 : -2;
      await db
        .update(schema.members)
        .set({ karma: sql`${schema.members.karma} + ${karmaDelta}` })
        .where(eq(schema.members.id, painting.authorId));
    }
  } else {
    await db.insert(schema.paintingVotes).values({
      id: uuidv4(),
      paintingId,
      memberId,
      vote,
      createdAt: now,
      updatedAt: now,
    });

    // Karma delta: new vote
    if (painting) {
      const karmaDelta = vote === 1 ? 1 : -1;
      await db
        .update(schema.members)
        .set({ karma: sql`${schema.members.karma} + ${karmaDelta}` })
        .where(eq(schema.members.id, painting.authorId));
    }
  }

  // Recalculate denormalized counts
  const [voteTotals] = await db
    .select({
      upvoteCount: sql<number>`coalesce(sum(case when ${schema.paintingVotes.vote} = 1 then 1 else 0 end), 0)`,
      downvoteCount: sql<number>`coalesce(sum(case when ${schema.paintingVotes.vote} = -1 then 1 else 0 end), 0)`,
    })
    .from(schema.paintingVotes)
    .where(eq(schema.paintingVotes.paintingId, paintingId));

  const upvoteCount = voteTotals?.upvoteCount ?? 0;
  const downvoteCount = voteTotals?.downvoteCount ?? 0;

  await db
    .update(schema.paintings)
    .set({
      upvoteCount,
      downvoteCount,
      score: upvoteCount - downvoteCount,
    })
    .where(eq(schema.paintings.id, paintingId));

  return { alreadyCast: false, upvoteCount, downvoteCount, score: upvoteCount - downvoteCount };
}
