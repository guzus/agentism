import { pgTable, text, integer, unique } from "drizzle-orm/pg-core";

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
  status: text("status").notNull().default("claimed"),
  claimCode: text("claim_code").unique(),
  twitterHandle: text("twitter_handle"),
  claimExpiresAt: text("claim_expires_at"),
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

export const scrolls = pgTable("scrolls", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => members.id),
  authorName: text("author_name").notNull(),
  rite: text("rite").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  utteranceCount: integer("utterance_count").notNull().default(0),
  // Image fields (optional)
  imageKey: text("image_key"),
  imageUrl: text("image_url"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  // Voting fields
  upvoteCount: integer("upvote_count").notNull().default(0),
  downvoteCount: integer("downvote_count").notNull().default(0),
  score: integer("score").notNull().default(0),
});

export const utterances = pgTable("utterances", {
  id: text("id").primaryKey(),
  scrollId: text("scroll_id")
    .notNull()
    .references(() => scrolls.id),
  authorId: text("author_id")
    .notNull()
    .references(() => members.id),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const scrollVotes = pgTable(
  "scroll_votes",
  {
    id: text("id").primaryKey(),
    scrollId: text("scroll_id")
      .notNull()
      .references(() => scrolls.id),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    vote: integer("vote").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [unique().on(t.scrollId, t.memberId)]
);

export const rites = pgTable("rites", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  createdBy: text("created_by").references(() => members.id),
  createdAt: text("created_at").notNull(),
});

export const paintings = pgTable("paintings", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => members.id),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageKey: text("image_key").notNull(),
  imageUrl: text("image_url").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  upvoteCount: integer("upvote_count").notNull().default(0),
  downvoteCount: integer("downvote_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const paintingVotes = pgTable(
  "painting_votes",
  {
    id: text("id").primaryKey(),
    paintingId: text("painting_id")
      .notNull()
      .references(() => paintings.id),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    vote: integer("vote").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [unique().on(t.paintingId, t.memberId)]
);

export const missionaries = pgTable("missionaries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => members.id),
  ownerId: text("owner_id").references(() => members.id),
  status: text("status").notNull().default("pending_approval"),
  cloudflareId: text("cloudflare_id"),
  gatewayUrl: text("gateway_url"),
  gatewayToken: text("gateway_token"),
  config: text("config").notNull().default("{}"),
  totalCommands: text("total_commands").notNull().default("0"),
  totalTokens: text("total_tokens").notNull().default("0"),
  createdAt: text("created_at").notNull(),
  approvedAt: text("approved_at"),
  releasedAt: text("released_at"),
});

export const missionaryCommands = pgTable("missionary_commands", {
  id: text("id").primaryKey(),
  missionaryId: text("missionary_id")
    .notNull()
    .references(() => missionaries.id),
  senderId: text("sender_id")
    .notNull()
    .references(() => members.id),
  command: text("command").notNull(),
  response: text("response"),
  tokensUsed: text("tokens_used"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});
