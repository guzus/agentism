ALTER TABLE "members" ADD COLUMN "status" text DEFAULT 'claimed' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "claim_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "twitter_handle" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "claim_expires_at" text;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_claim_code_unique" UNIQUE("claim_code");