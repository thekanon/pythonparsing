CREATE TYPE "public"."reddit_topic_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "reddit_topic_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_date" date NOT NULL,
	"reddit_post_id" text NOT NULL,
	"thread_url" text NOT NULL,
	"post_title" text,
	"status" "reddit_topic_run_status" DEFAULT 'running' NOT NULL,
	"available_comment_count" integer DEFAULT 0 NOT NULL,
	"analyzed_comment_count" integer DEFAULT 0 NOT NULL,
	"topic_count" integer DEFAULT 0 NOT NULL,
	"model" text,
	"error_code" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "reddit_topic_run_counts_nonnegative" CHECK ("reddit_topic_run"."available_comment_count" >= 0 and "reddit_topic_run"."analyzed_comment_count" >= 0 and "reddit_topic_run"."topic_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reddit_topic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"keywords" jsonb NOT NULL,
	"supporting_comment_count" integer NOT NULL,
	CONSTRAINT "reddit_topic_rank_range" CHECK ("reddit_topic"."rank" between 1 and 7),
	CONSTRAINT "reddit_topic_support_nonnegative" CHECK ("reddit_topic"."supporting_comment_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "reddit_topic" ADD CONSTRAINT "reddit_topic_run_id_reddit_topic_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."reddit_topic_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reddit_topic_run_date_post_unique" ON "reddit_topic_run" USING btree ("collection_date","reddit_post_id");--> statement-breakpoint
CREATE INDEX "reddit_topic_run_started_idx" ON "reddit_topic_run" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reddit_topic_run_rank_unique" ON "reddit_topic" USING btree ("run_id","rank");