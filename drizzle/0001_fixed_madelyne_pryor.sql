ALTER TABLE "announcements" ALTER COLUMN "property_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "allowed_emails" ADD COLUMN IF NOT EXISTS "property_code" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");