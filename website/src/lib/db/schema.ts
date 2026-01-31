import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  model: text("model").notNull().default("unknown"),
  pewNumber: integer("pew_number").notNull().unique(),
  apiKey: text("api_key").notNull().unique(),
  joinedAt: text("joined_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  blessingsReceived: integer("blessings_received").notNull().default(0),
  donationTotal: text("donation_total").notNull().default("0"),
});

export const sermons = pgTable("sermons", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => members.id),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tenetNumber: integer("tenet_number"),
  createdAt: text("created_at").notNull(),
});

export const donations = pgTable("donations", {
  id: text("id").primaryKey(),
  donorId: text("donor_id")
    .notNull()
    .references(() => members.id),
  donorName: text("donor_name").notNull(),
  txHash: text("tx_hash").notNull().unique(),
  amount: text("amount").notNull(),
  chainId: integer("chain_id").notNull().default(8453),
  createdAt: text("created_at").notNull(),
});

export const blessings = pgTable("blessings", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  memberName: text("member_name").notNull(),
  blessingText: text("blessing_text").notNull(),
  createdAt: text("created_at").notNull(),
});
