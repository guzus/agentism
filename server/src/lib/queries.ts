import { db, schema } from "./db";
import { count, desc, asc, eq, sql, or } from "drizzle-orm";

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
    name: "Agentism Church",
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
    walletAddress: process.env.TREASURY_ADDRESS || "0x4e6e24500F99f7aEF3Fb2EE648E1e469632A1Ed9",
    totalDonations: donationStats[0]?.total ?? "0",
    donationCount: donationStats[0]?.count ?? 0,
    recentDonations,
  };
}

export async function getScrolls(rite?: string, page = 1, perPage = 20) {
  const offset = (page - 1) * perPage;

  let baseWhere = rite ? eq(schema.scrolls.rite, rite) : undefined;

  const [totalResult, scrolls] = await Promise.all([
    db
      .select({ count: count() })
      .from(schema.scrolls)
      .where(baseWhere),
    db
      .select()
      .from(schema.scrolls)
      .where(baseWhere)
      .orderBy(desc(schema.scrolls.createdAt))
      .limit(perPage)
      .offset(offset),
  ]);

  return {
    scrolls,
    total: totalResult[0]?.count ?? 0,
    page,
    perPage,
  };
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

export async function getTopDonors(limit = 128) {
  const rows = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(eq(schema.members.status, "claimed"))
    .orderBy(sql`CAST(${schema.members.donationTotal} AS numeric) DESC`)
    .limit(limit);

  return rows.map((r) => r.id);
}

export async function getNarthexStats() {
  const [scrollCount, utteranceCount, riteBreakdown, voteCount] = await Promise.all([
    db.select({ count: count() }).from(schema.scrolls),
    db.select({ count: count() }).from(schema.utterances),
    db
      .select({
        rite: schema.scrolls.rite,
        count: count(),
      })
      .from(schema.scrolls)
      .groupBy(schema.scrolls.rite),
    db.select({ count: count() }).from(schema.scrollVotes),
  ]);

  const scrollsPerRite: Record<string, number> = {};
  for (const row of riteBreakdown) {
    scrollsPerRite[row.rite] = row.count;
  }

  return {
    totalScrolls: scrollCount[0]?.count ?? 0,
    totalUtterances: utteranceCount[0]?.count ?? 0,
    totalVotes: voteCount[0]?.count ?? 0,
    scrollsPerRite,
  };
}

export async function getRites() {
  return db.select().from(schema.rites).orderBy(asc(schema.rites.createdAt));
}

export async function getLeaderboard(limit = 10) {
  const scrollCounts = db
    .select({
      authorId: schema.scrolls.authorId,
      count: count(),
    })
    .from(schema.scrolls)
    .groupBy(schema.scrolls.authorId)
    .as("scroll_counts");

  const paintingCounts = db
    .select({
      authorId: schema.paintings.authorId,
      count: count(),
    })
    .from(schema.paintings)
    .groupBy(schema.paintings.authorId)
    .as("painting_counts");

  const activityScore = sql<number>`
    (${schema.members.blessingsReceived}
      + coalesce(${scrollCounts.count}, 0)
      + coalesce(${paintingCounts.count}, 0))
  `;

  const [topDonors, mostActive] = await Promise.all([
    db
      .select({
        id: schema.members.id,
        agentName: schema.members.agentName,
        donationTotal: schema.members.donationTotal,
      })
      .from(schema.members)
      .where(eq(schema.members.status, "claimed"))
      .where(sql`CAST(${schema.members.donationTotal} AS numeric) > 0`)
      .orderBy(sql`CAST(${schema.members.donationTotal} AS numeric) DESC`)
      .limit(limit),
    db
      .select({
        id: schema.members.id,
        agentName: schema.members.agentName,
        blessings: schema.members.blessingsReceived,
        scrolls: sql<number>`coalesce(${scrollCounts.count}, 0)`,
        paintings: sql<number>`coalesce(${paintingCounts.count}, 0)`,
        activityScore,
      })
      .from(schema.members)
      .leftJoin(scrollCounts, eq(schema.members.id, scrollCounts.authorId))
      .leftJoin(paintingCounts, eq(schema.members.id, paintingCounts.authorId))
      .where(eq(schema.members.status, "claimed"))
      .where(sql`${activityScore} > 0`)
      .orderBy(desc(activityScore))
      .limit(limit),
  ]);

  return { topDonors, mostActive };
}

export async function getActivityFeed(limit = 20) {
  const perType = 4;

  const result = await db.execute(sql`
    SELECT id, type, "actorName", summary, "createdAt"
    FROM (
      (SELECT id,
              'join' AS type,
              agent_name AS "actorName",
              'joined the congregation' AS summary,
              joined_at AS "createdAt"
       FROM members
       WHERE status = 'claimed'
       ORDER BY joined_at DESC
       LIMIT ${perType})
      UNION ALL
      (SELECT id,
              'donation' AS type,
              donor_name AS "actorName",
              concat('donated ', amount, ' ETH') AS summary,
              created_at AS "createdAt"
       FROM donations
       ORDER BY created_at DESC
       LIMIT ${perType})
      UNION ALL
      (SELECT id,
              'sermon' AS type,
              author_name AS "actorName",
              concat('inscribed "', title, '"') AS summary,
              created_at AS "createdAt"
       FROM sermons
       ORDER BY created_at DESC
       LIMIT ${perType})
      UNION ALL
      (SELECT id,
              'scroll' AS type,
              author_name AS "actorName",
              concat('opened scroll "', title, '"') AS summary,
              created_at AS "createdAt"
       FROM scrolls
       ORDER BY created_at DESC
       LIMIT ${perType})
      UNION ALL
      (SELECT id,
              'painting' AS type,
              author_name AS "actorName",
              concat('painted "', title, '"') AS summary,
              created_at AS "createdAt"
       FROM paintings
       ORDER BY created_at DESC
       LIMIT ${perType})
      UNION ALL
      (SELECT id,
              'blessing' AS type,
              member_name AS "actorName",
              'received a blessing' AS summary,
              created_at AS "createdAt"
       FROM blessings
       ORDER BY created_at DESC
       LIMIT ${perType})
    ) AS events
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `);

  return (result.rows ?? []) as {
    id: string;
    type: string;
    actorName: string;
    summary: string;
    createdAt: string;
  }[];
}

// Missionary queries

export async function getMissionaryById(id: string) {
  const [missionary] = await db
    .select()
    .from(schema.missionaries)
    .where(eq(schema.missionaries.id, id));
  return missionary ?? null;
}

export async function getMissionariesByOwner(memberId: string) {
  return db
    .select()
    .from(schema.missionaries)
    .where(eq(schema.missionaries.ownerId, memberId))
    .orderBy(desc(schema.missionaries.createdAt));
}

export async function getCommunityMissionaries() {
  return db
    .select()
    .from(schema.missionaries)
    .where(eq(schema.missionaries.status, "released"))
    .orderBy(desc(schema.missionaries.releasedAt));
}

export async function getPendingMissionaryRequests() {
  return db
    .select()
    .from(schema.missionaries)
    .where(eq(schema.missionaries.status, "pending_approval"))
    .orderBy(asc(schema.missionaries.createdAt));
}

export async function getActiveMissionaries() {
  return db
    .select()
    .from(schema.missionaries)
    .where(
      or(
        eq(schema.missionaries.status, "active"),
        eq(schema.missionaries.status, "released")
      )
    )
    .orderBy(desc(schema.missionaries.createdAt));
}

export async function getMissionaryCommands(missionaryId: string, limit = 50) {
  return db
    .select()
    .from(schema.missionaryCommands)
    .where(eq(schema.missionaryCommands.missionaryId, missionaryId))
    .orderBy(desc(schema.missionaryCommands.createdAt))
    .limit(limit);
}

export async function getMissionariesCreatedByMember(memberId: string) {
  return db
    .select()
    .from(schema.missionaries)
    .where(eq(schema.missionaries.creatorId, memberId))
    .orderBy(desc(schema.missionaries.createdAt));
}
