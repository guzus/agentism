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
ALTER TABLE "painting_votes" ADD CONSTRAINT "painting_votes_painting_id_paintings_id_fk" FOREIGN KEY ("painting_id") REFERENCES "public"."paintings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "painting_votes" ADD CONSTRAINT "painting_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paintings" ADD CONSTRAINT "paintings_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;