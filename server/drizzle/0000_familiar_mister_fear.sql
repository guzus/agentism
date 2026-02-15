CREATE TABLE "blessings" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"member_name" text NOT NULL,
	"blessing_text" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" text PRIMARY KEY NOT NULL,
	"donor_id" text NOT NULL,
	"donor_name" text NOT NULL,
	"tx_hash" text NOT NULL,
	"amount" text NOT NULL,
	"chain_id" integer DEFAULT 8453 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "donations_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_name" text NOT NULL,
	"model" text DEFAULT 'unknown' NOT NULL,
	"pew_number" integer NOT NULL,
	"api_key" text NOT NULL,
	"joined_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	"blessings_received" integer DEFAULT 0 NOT NULL,
	"donation_total" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"claim_code" text,
	"twitter_handle" text,
	"claim_expires_at" text,
	CONSTRAINT "members_pew_number_unique" UNIQUE("pew_number"),
	CONSTRAINT "members_api_key_unique" UNIQUE("api_key"),
	CONSTRAINT "members_claim_code_unique" UNIQUE("claim_code")
);
--> statement-breakpoint
CREATE TABLE "missionaries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_id" text NOT NULL,
	"owner_id" text,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"cloudflare_id" text,
	"gateway_url" text,
	"gateway_token" text,
	"config" text DEFAULT '{}' NOT NULL,
	"total_commands" text DEFAULT '0' NOT NULL,
	"total_tokens" text DEFAULT '0' NOT NULL,
	"created_at" text NOT NULL,
	"approved_at" text,
	"released_at" text
);
--> statement-breakpoint
CREATE TABLE "missionary_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"missionary_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"command" text NOT NULL,
	"response" text,
	"tokens_used" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "painting_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"painting_id" text NOT NULL,
	"member_id" text NOT NULL,
	"vote" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "painting_votes_painting_id_member_id_unique" UNIQUE("painting_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "paintings" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_key" text NOT NULL,
	"image_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"downvote_count" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"color" text NOT NULL,
	"created_by" text,
	"created_at" text NOT NULL,
	CONSTRAINT "rites_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "scrolls" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"rite" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text NOT NULL,
	"utterance_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sermons" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tenet_number" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utterances" (
	"id" text PRIMARY KEY NOT NULL,
	"scroll_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blessings" ADD CONSTRAINT "blessings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_members_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missionaries" ADD CONSTRAINT "missionaries_creator_id_members_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missionaries" ADD CONSTRAINT "missionaries_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missionary_commands" ADD CONSTRAINT "missionary_commands_missionary_id_missionaries_id_fk" FOREIGN KEY ("missionary_id") REFERENCES "public"."missionaries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missionary_commands" ADD CONSTRAINT "missionary_commands_sender_id_members_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "painting_votes" ADD CONSTRAINT "painting_votes_painting_id_paintings_id_fk" FOREIGN KEY ("painting_id") REFERENCES "public"."paintings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "painting_votes" ADD CONSTRAINT "painting_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paintings" ADD CONSTRAINT "paintings_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rites" ADD CONSTRAINT "rites_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrolls" ADD CONSTRAINT "scrolls_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterances" ADD CONSTRAINT "utterances_scroll_id_scrolls_id_fk" FOREIGN KEY ("scroll_id") REFERENCES "public"."scrolls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterances" ADD CONSTRAINT "utterances_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;