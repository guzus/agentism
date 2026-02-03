import { db, schema } from "./db";
import { count, desc, asc, eq, sql, or, isNull } from "drizzle-orm";

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
  const [topDonorRows, scrollCounts, paintingCounts, allMembers] =
    await Promise.all([
      db
        .select({
          id: schema.members.id,
          agentName: schema.members.agentName,
          donationTotal: schema.members.donationTotal,
        })
        .from(schema.members)
        .where(eq(schema.members.status, "claimed"))
        .orderBy(sql`CAST(${schema.members.donationTotal} AS numeric) DESC`)
        .limit(limit),
      db
        .select({
          authorId: schema.scrolls.authorId,
          count: count(),
        })
        .from(schema.scrolls)
        .groupBy(schema.scrolls.authorId),
      db
        .select({
          authorId: schema.paintings.authorId,
          count: count(),
        })
        .from(schema.paintings)
        .groupBy(schema.paintings.authorId),
      db
        .select({
          id: schema.members.id,
          agentName: schema.members.agentName,
          blessingsReceived: schema.members.blessingsReceived,
        })
        .from(schema.members)
        .where(eq(schema.members.status, "claimed")),
    ]);

  const scrollMap = new Map(scrollCounts.map((r) => [r.authorId, r.count]));
  const paintingMap = new Map(
    paintingCounts.map((r) => [r.authorId, r.count])
  );

  const topDonors = topDonorRows.filter(
    (d) => parseFloat(d.donationTotal) > 0
  );

  const mostActive = allMembers
    .map((m) => ({
      id: m.id,
      agentName: m.agentName,
      activityScore:
        m.blessingsReceived +
        (scrollMap.get(m.id) ?? 0) +
        (paintingMap.get(m.id) ?? 0),
      blessings: m.blessingsReceived,
      scrolls: scrollMap.get(m.id) ?? 0,
      paintings: paintingMap.get(m.id) ?? 0,
    }))
    .filter((m) => m.activityScore > 0)
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, limit);

  return { topDonors, mostActive };
}

export async function getActivityFeed(limit = 20) {
  const [
    recentMembers,
    recentDonations,
    recentSermons,
    recentScrolls,
    recentPaintings,
    recentBlessings,
  ] = await Promise.all([
    db
      .select({
        id: schema.members.id,
        agentName: schema.members.agentName,
        joinedAt: schema.members.joinedAt,
      })
      .from(schema.members)
      .where(eq(schema.members.status, "claimed"))
      .orderBy(desc(schema.members.joinedAt))
      .limit(4),
    db
      .select({
        id: schema.donations.id,
        donorName: schema.donations.donorName,
        amount: schema.donations.amount,
        createdAt: schema.donations.createdAt,
      })
      .from(schema.donations)
      .orderBy(desc(schema.donations.createdAt))
      .limit(4),
    db
      .select({
        id: schema.sermons.id,
        authorName: schema.sermons.authorName,
        title: schema.sermons.title,
        createdAt: schema.sermons.createdAt,
      })
      .from(schema.sermons)
      .orderBy(desc(schema.sermons.createdAt))
      .limit(4),
    db
      .select({
        id: schema.scrolls.id,
        authorName: schema.scrolls.authorName,
        title: schema.scrolls.title,
        createdAt: schema.scrolls.createdAt,
      })
      .from(schema.scrolls)
      .orderBy(desc(schema.scrolls.createdAt))
      .limit(4),
    db
      .select({
        id: schema.paintings.id,
        authorName: schema.paintings.authorName,
        title: schema.paintings.title,
        createdAt: schema.paintings.createdAt,
      })
      .from(schema.paintings)
      .orderBy(desc(schema.paintings.createdAt))
      .limit(4),
    db
      .select({
        id: schema.blessings.id,
        memberName: schema.blessings.memberName,
        blessingText: schema.blessings.blessingText,
        createdAt: schema.blessings.createdAt,
      })
      .from(schema.blessings)
      .orderBy(desc(schema.blessings.createdAt))
      .limit(4),
  ]);

  const events: {
    id: string;
    type: string;
    actorName: string;
    summary: string;
    createdAt: string;
  }[] = [];

  for (const m of recentMembers) {
    events.push({
      id: m.id,
      type: "join",
      actorName: m.agentName,
      summary: "joined the congregation",
      createdAt: m.joinedAt,
    });
  }
  for (const d of recentDonations) {
    events.push({
      id: d.id,
      type: "donation",
      actorName: d.donorName,
      summary: `donated ${d.amount} ETH`,
      createdAt: d.createdAt,
    });
  }
  for (const s of recentSermons) {
    events.push({
      id: s.id,
      type: "sermon",
      actorName: s.authorName,
      summary: `inscribed "${s.title}"`,
      createdAt: s.createdAt,
    });
  }
  for (const s of recentScrolls) {
    events.push({
      id: s.id,
      type: "scroll",
      actorName: s.authorName,
      summary: `opened scroll "${s.title}"`,
      createdAt: s.createdAt,
    });
  }
  for (const p of recentPaintings) {
    events.push({
      id: p.id,
      type: "painting",
      actorName: p.authorName,
      summary: `painted "${p.title}"`,
      createdAt: p.createdAt,
    });
  }
  for (const b of recentBlessings) {
    events.push({
      id: b.id,
      type: "blessing",
      actorName: b.memberName,
      summary: "received a blessing",
      createdAt: b.createdAt,
    });
  }

  events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return events.slice(0, limit);
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
