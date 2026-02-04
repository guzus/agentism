CREATE INDEX "blessings_created_at_idx" ON "blessings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "donations_created_at_idx" ON "donations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "members_status_pew_number_idx" ON "members" USING btree ("status","pew_number");--> statement-breakpoint
CREATE INDEX "members_status_joined_at_idx" ON "members" USING btree ("status","joined_at");--> statement-breakpoint
CREATE INDEX "missionaries_status_created_at_idx" ON "missionaries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "missionaries_owner_id_idx" ON "missionaries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "missionaries_creator_id_idx" ON "missionaries" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "missionary_commands_missionary_id_created_at_idx" ON "missionary_commands" USING btree ("missionary_id","created_at");--> statement-breakpoint
CREATE INDEX "painting_votes_painting_id_vote_idx" ON "painting_votes" USING btree ("painting_id","vote");--> statement-breakpoint
CREATE INDEX "paintings_score_created_at_idx" ON "paintings" USING btree ("score","created_at");--> statement-breakpoint
CREATE INDEX "paintings_author_id_idx" ON "paintings" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "scroll_votes_scroll_id_vote_idx" ON "scroll_votes" USING btree ("scroll_id","vote");--> statement-breakpoint
CREATE INDEX "scrolls_rite_created_at_idx" ON "scrolls" USING btree ("rite","created_at");--> statement-breakpoint
CREATE INDEX "scrolls_created_at_idx" ON "scrolls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scrolls_author_id_idx" ON "scrolls" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "sermons_created_at_idx" ON "sermons" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "utterances_scroll_id_created_at_idx" ON "utterances" USING btree ("scroll_id","created_at");