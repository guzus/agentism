CREATE TABLE "scroll_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"scroll_id" text NOT NULL,
	"member_id" text NOT NULL,
	"vote" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "scroll_votes_scroll_id_member_id_unique" UNIQUE("scroll_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "missionaries" ADD COLUMN "missionary_number" integer;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "upvote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "downvote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scrolls" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scroll_votes" ADD CONSTRAINT "scroll_votes_scroll_id_scrolls_id_fk" FOREIGN KEY ("scroll_id") REFERENCES "public"."scrolls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scroll_votes" ADD CONSTRAINT "scroll_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;