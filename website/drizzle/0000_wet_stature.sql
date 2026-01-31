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
	CONSTRAINT "members_pew_number_unique" UNIQUE("pew_number"),
	CONSTRAINT "members_api_key_unique" UNIQUE("api_key")
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
ALTER TABLE "scrolls" ADD CONSTRAINT "scrolls_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterances" ADD CONSTRAINT "utterances_scroll_id_scrolls_id_fk" FOREIGN KEY ("scroll_id") REFERENCES "public"."scrolls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterances" ADD CONSTRAINT "utterances_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;