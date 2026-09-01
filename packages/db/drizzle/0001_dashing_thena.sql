CREATE TABLE "lesson_restore_identity" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"learning_date" date NOT NULL,
	"ordinal" integer NOT NULL,
	"provider_key" text NOT NULL,
	"external_id_hash" text NOT NULL,
	"source_hash" text NOT NULL,
	"restored_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_restore_identity_ordinal_range" CHECK ("lesson_restore_identity"."ordinal" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "article_revision" DROP CONSTRAINT "article_revision_published_has_content";--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_restore_identity_source_unique" ON "lesson_restore_identity" USING btree ("provider_key","external_id_hash","source_hash","learning_date");--> statement-breakpoint
CREATE INDEX "lesson_restore_identity_date_idx" ON "lesson_restore_identity" USING btree ("learning_date");--> statement-breakpoint
ALTER TABLE "article_revision" ADD CONSTRAINT "article_revision_published_has_content" CHECK ("article_revision"."status" not in ('approved', 'published') or ("article_revision"."english_title" is not null and "article_revision"."english_excerpt" is not null and "article_revision"."korean_title" is not null and "article_revision"."korean_excerpt" is not null));