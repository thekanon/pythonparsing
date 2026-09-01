ALTER TABLE "reddit_topic" ADD COLUMN "english_title" text;--> statement-breakpoint
ALTER TABLE "reddit_topic" ADD COLUMN "english_passage" text;--> statement-breakpoint
ALTER TABLE "reddit_topic" ADD COLUMN "korean_translation" text;--> statement-breakpoint
ALTER TABLE "reddit_topic" ADD COLUMN "expressions" jsonb;