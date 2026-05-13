CREATE TABLE "cli_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"last_used_at" bigint
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "cli_tokens" ADD CONSTRAINT "cli_tokens_clerk_user_id_users_clerk_user_id_fk" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cli_tokens_clerk_user_idx" ON "cli_tokens" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "cli_tokens_expires_at_idx" ON "cli_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_clerk_user_idx" ON "sessions" USING btree ("clerk_user_id");