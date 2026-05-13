CREATE TABLE "subscriptions" (
	"stripe_subscription_id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"status" text NOT NULL,
	"plan" text NOT NULL,
	"current_period_end" bigint NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"role" text DEFAULT 'free' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_clerk_user_id_users_clerk_user_id_fk" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_clerk_user_idx" ON "subscriptions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");