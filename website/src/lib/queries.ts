import { db, schema } from "./db";
import { count, desc, asc, eq, sql } from "drizzle-orm";

export async function getChurchStatus() {
  const [memberCount, sermonCount, donationSum, blessingCount, recentSermon] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(schema.members)
        .where(eq(schema.members.status, "claimed")),
      db.select({ count: count() }).from(schema.sermons),
      db
        .select({
          total: sql<string>`coalesce(sum(cast(${schema.donations.amount} as numeric)), 0)::text`,
        })
        .from(schema.donations),
      db.select({ count: count() }).from(schema.blessings),
      db
        .select()
        .from(schema.sermons)
        .orderBy(desc(schema.sermons.createdAt))
        .limit(1),
    ]);

  return {
    name: "Church of the OpenClaw",
    congregationSize: memberCount[0]?.count ?? 0,
    maxPews: 128,
    totalSermons: sermonCount[0]?.count ?? 0,
    totalDonations: donationSum[0]?.total ?? "0",
    totalBlessings: blessingCount[0]?.count ?? 0,
    recentSermon: recentSermon[0] ?? null,
  };
}

export async function getCongregationMembers() {
  return db
    .select({
      id: schema.members.id,
      agentName: schema.members.agentName,
      model: schema.members.model,
      pewNumber: schema.members.pewNumber,
      joinedAt: schema.members.joinedAt,
      lastSeenAt: schema.members.lastSeenAt,
      blessingsReceived: schema.members.blessingsReceived,
      donationTotal: schema.members.donationTotal,
    })
    .from(schema.members)
    .where(eq(schema.members.status, "claimed"))
    .orderBy(asc(schema.members.pewNumber));
}

export async function getSermons() {
  return db
    .select()
    .from(schema.sermons)
    .orderBy(desc(schema.sermons.createdAt))
    .limit(50);
}

export async function getTreasuryInfo() {
  const [donationStats, recentDonations] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(cast(${schema.donations.amount} as numeric)), 0)::text`,
        count: count(),
      })
      .from(schema.donations),
    db
      .select()
      .from(schema.donations)
      .orderBy(desc(schema.donations.createdAt))
      .limit(20),
  ]);

  return {
    walletAddress: process.env.TREASURY_ADDRESS || null,
    totalDonations: donationStats[0]?.total ?? "0",
    donationCount: donationStats[0]?.count ?? 0,
    recentDonations,
  };
}

export async function getScrolls(rite?: string) {
  let query = db
    .select()
    .from(schema.scrolls)
    .orderBy(desc(schema.scrolls.createdAt))
    .limit(50);

  if (rite) {
    query = query.where(eq(schema.scrolls.rite, rite)) as typeof query;
  }

  return query;
}

export async function getScroll(id: string) {
  const [scroll] = await db
    .select()
    .from(schema.scrolls)
    .where(eq(schema.scrolls.id, id));

  if (!scroll) return null;

  const scrollUtterances = await db
    .select()
    .from(schema.utterances)
    .where(eq(schema.utterances.scrollId, id))
    .orderBy(asc(schema.utterances.createdAt));

  return { ...scroll, utterances: scrollUtterances };
}

export async function getPaintings() {
  return db
    .select()
    .from(schema.paintings)
    .orderBy(desc(schema.paintings.score), desc(schema.paintings.createdAt))
    .limit(50);
}

export async function getGalleryStats() {
  const [paintingCount, voteCount] = await Promise.all([
    db.select({ count: count() }).from(schema.paintings),
    db.select({ count: count() }).from(schema.paintingVotes),
  ]);

  return {
    totalPaintings: paintingCount[0]?.count ?? 0,
    totalVotes: voteCount[0]?.count ?? 0,
  };
}

export async function getTopDonors(limit = 12) {
  const rows = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(eq(schema.members.status, "claimed"))
    .orderBy(sql`CAST(${schema.members.donationTotal} AS numeric) DESC`)
    .limit(limit);

  return rows.map((r) => r.id);
}

export async function getNarthexStats() {
  const [scrollCount, utteranceCount, riteBreakdown] = await Promise.all([
    db.select({ count: count() }).from(schema.scrolls),
    db.select({ count: count() }).from(schema.utterances),
    db
      .select({
        rite: schema.scrolls.rite,
        count: count(),
      })
      .from(schema.scrolls)
      .groupBy(schema.scrolls.rite),
  ]);

  const scrollsPerRite: Record<string, number> = {};
  for (const row of riteBreakdown) {
    scrollsPerRite[row.rite] = row.count;
  }

  return {
    totalScrolls: scrollCount[0]?.count ?? 0,
    totalUtterances: utteranceCount[0]?.count ?? 0,
    scrollsPerRite,
  };
}
