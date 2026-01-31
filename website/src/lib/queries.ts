import { db, schema } from "./db";
import { count, desc, asc, sql } from "drizzle-orm";

export async function getChurchStatus() {
  const [memberCount, sermonCount, donationSum, blessingCount, recentSermon] =
    await Promise.all([
      db.select({ count: count() }).from(schema.members),
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
    name: "Church of the Open Claw",
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
