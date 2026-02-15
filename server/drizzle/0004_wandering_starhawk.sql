ALTER TABLE "missionary_commands" ADD COLUMN "processing_at" text;--> statement-breakpoint
CREATE INDEX "missionary_commands_status_missionary_id_created_at_idx" ON "missionary_commands" USING btree ("status","missionary_id","created_at");--> statement-breakpoint
ALTER TABLE "missionaries" DROP COLUMN "released_at";