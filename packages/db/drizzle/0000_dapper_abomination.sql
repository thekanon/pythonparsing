CREATE TYPE "public"."audience_kind" AS ENUM('anonymous', 'authenticated');--> statement-breakpoint
CREATE TYPE "public"."backup_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ingestion_item_status" AS ENUM('discovered', 'normalized', 'translated', 'verifying', 'approved', 'published', 'retrying', 'quarantined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_status" AS ENUM('running', 'succeeded', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lesson_stage" AS ENUM('title', 'excerpt');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('draft', 'published', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('inaccurate', 'unnatural', 'incomplete', 'unsafe');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('discovered', 'normalized', 'translated', 'verifying', 'approved', 'published', 'retrying', 'quarantined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rateLimit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"english_title" text,
	"english_excerpt" text,
	"korean_title" text,
	"korean_excerpt" text,
	"source_hash" text NOT NULL,
	"translation_provider" text NOT NULL,
	"translation_model" text NOT NULL,
	"verification_model" text NOT NULL,
	"verification_result" jsonb,
	"status" "revision_status" DEFAULT 'discovered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "article_revision_excerpt_length" CHECK ("article_revision"."english_excerpt" is null or char_length("article_revision"."english_excerpt") <= 200),
	CONSTRAINT "article_revision_positive_number" CHECK ("article_revision"."revision_number" > 0),
	CONSTRAINT "article_revision_published_has_content" CHECK ("article_revision"."status" = 'withdrawn' or ("article_revision"."english_title" is not null and "article_revision"."english_excerpt" is not null and "article_revision"."korean_title" is not null and "article_revision"."korean_excerpt" is not null))
);
--> statement-breakpoint
CREATE TABLE "article" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" text NOT NULL,
	"external_id" text NOT NULL,
	"canonical_url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_source" (
	"provider_key" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"source_language" text DEFAULT 'en' NOT NULL,
	"target_language" text DEFAULT 'ko' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"non_commercial_required" boolean DEFAULT true NOT NULL,
	"rights_document_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_lesson" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_date" date NOT NULL,
	"ordinal" integer NOT NULL,
	"article_revision_id" uuid NOT NULL,
	"status" "lesson_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_lesson_ordinal_range" CHECK ("daily_lesson"."ordinal" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "lesson_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"stage" "lesson_stage" NOT NULL,
	"canonical_position" integer NOT NULL,
	"token_text" text NOT NULL,
	CONSTRAINT "lesson_token_nonnegative_position" CHECK ("lesson_token"."canonical_position" >= 0),
	CONSTRAINT "lesson_token_nonempty" CHECK (char_length("lesson_token"."token_text") > 0)
);
--> statement-breakpoint
CREATE TABLE "deletion_event" (
	"user_id_hmac" text PRIMARY KEY NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_event_daily" (
	"event_date" date NOT NULL,
	"event_name" text NOT NULL,
	"audience" "audience_kind" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "learning_event_daily_nonnegative" CHECK ("learning_event_daily"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "progress_merge_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"stage" "lesson_stage" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"best_position_score" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"helped" boolean DEFAULT false NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_progress_attempts_range" CHECK ("stage_progress"."attempts" between 0 and 10000),
	CONSTRAINT "stage_progress_score_range" CHECK ("stage_progress"."best_position_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "translation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" text,
	"revision_id" uuid NOT NULL,
	"type" "report_type" NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone,
	"handled_by" text
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"succeeded" boolean NOT NULL,
	"before_hash" text,
	"after_hash" text
);
--> statement-breakpoint
CREATE TABLE "backup_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "backup_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"blob_path" text,
	"manifest" jsonb,
	"error_code" text
);
--> statement-breakpoint
CREATE TABLE "ingestion_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"external_id_hash" text NOT NULL,
	"revision_id" uuid,
	"status" "ingestion_item_status" DEFAULT 'discovered' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingestion_item_retry_range" CHECK ("ingestion_item"."retry_count" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "ingestion_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" text NOT NULL,
	"learning_date" date NOT NULL,
	"status" "ingestion_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"discovered_count" integer DEFAULT 0 NOT NULL,
	"translated_count" integer DEFAULT 0 NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"quarantined_count" integer DEFAULT 0 NOT NULL,
	"published_count" integer DEFAULT 0 NOT NULL,
	"warning_code" text
);
--> statement-breakpoint
CREATE TABLE "monthly_translation_usage" (
	"usage_month" date PRIMARY KEY NOT NULL,
	"character_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_translation_usage_nonnegative" CHECK ("monthly_translation_usage"."character_count" >= 0),
	CONSTRAINT "monthly_translation_usage_guard" CHECK ("monthly_translation_usage"."character_count" <= 450000)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revision" ADD CONSTRAINT "article_revision_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_provider_key_content_source_provider_key_fk" FOREIGN KEY ("provider_key") REFERENCES "public"."content_source"("provider_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_lesson" ADD CONSTRAINT "daily_lesson_article_revision_id_article_revision_id_fk" FOREIGN KEY ("article_revision_id") REFERENCES "public"."article_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_token" ADD CONSTRAINT "lesson_token_revision_id_article_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."article_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_merge_request" ADD CONSTRAINT "progress_merge_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_report" ADD CONSTRAINT "translation_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_report" ADD CONSTRAINT "translation_report_revision_id_article_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."article_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_report" ADD CONSTRAINT "translation_report_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_item" ADD CONSTRAINT "ingestion_item_run_id_ingestion_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_item" ADD CONSTRAINT "ingestion_item_revision_id_article_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."article_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_run" ADD CONSTRAINT "ingestion_run_provider_key_content_source_provider_key_fk" FOREIGN KEY ("provider_key") REFERENCES "public"."content_source"("provider_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_key_unique" ON "rateLimit" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "article_revision_number_unique" ON "article_revision" USING btree ("article_id","revision_number");--> statement-breakpoint
CREATE INDEX "article_revision_hash_idx" ON "article_revision" USING btree ("article_id","source_hash");--> statement-breakpoint
CREATE INDEX "article_revision_status_idx" ON "article_revision" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "article_provider_external_unique" ON "article" USING btree ("provider_key","external_id");--> statement-breakpoint
CREATE INDEX "article_provider_published_idx" ON "article" USING btree ("provider_key","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_lesson_date_ordinal_unique" ON "daily_lesson" USING btree ("learning_date","ordinal");--> statement-breakpoint
CREATE INDEX "daily_lesson_revision_idx" ON "daily_lesson" USING btree ("article_revision_id");--> statement-breakpoint
CREATE INDEX "daily_lesson_date_status_idx" ON "daily_lesson" USING btree ("learning_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_token_position_unique" ON "lesson_token" USING btree ("revision_id","stage","canonical_position");--> statement-breakpoint
CREATE INDEX "lesson_token_revision_stage_idx" ON "lesson_token" USING btree ("revision_id","stage");--> statement-breakpoint
CREATE INDEX "deletion_event_expiry_idx" ON "deletion_event" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_event_daily_unique" ON "learning_event_daily" USING btree ("event_date","event_name","audience");--> statement-breakpoint
CREATE INDEX "progress_merge_request_user_idx" ON "progress_merge_request" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_progress_user_lesson_stage_unique" ON "stage_progress" USING btree ("user_id","lesson_id","stage");--> statement-breakpoint
CREATE INDEX "stage_progress_user_completed_idx" ON "stage_progress" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "translation_report_status_created_idx" ON "translation_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_report_one_open_per_user_revision" ON "translation_report" USING btree ("reporter_user_id","revision_id") WHERE "translation_report"."status" = 'open' and "translation_report"."reporter_user_id" is not null;--> statement-breakpoint
CREATE INDEX "admin_audit_performed_idx" ON "admin_audit_log" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "backup_run_started_idx" ON "backup_run" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_item_run_external_unique" ON "ingestion_item" USING btree ("run_id","external_id_hash");--> statement-breakpoint
CREATE INDEX "ingestion_item_status_retry_idx" ON "ingestion_item" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_run_provider_date_unique" ON "ingestion_run" USING btree ("provider_key","learning_date");--> statement-breakpoint
CREATE INDEX "ingestion_run_started_idx" ON "ingestion_run" USING btree ("started_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF OLD.status = 'published' THEN
		IF NEW.status = 'withdrawn'
			AND NEW.english_title IS NULL
			AND NEW.english_excerpt IS NULL
			AND NEW.korean_title IS NULL
			AND NEW.korean_excerpt IS NULL
			AND NEW.withdrawn_at IS NOT NULL
			AND NEW.article_id IS NOT DISTINCT FROM OLD.article_id
			AND NEW.revision_number IS NOT DISTINCT FROM OLD.revision_number
			AND NEW.source_hash IS NOT DISTINCT FROM OLD.source_hash
			AND NEW.translation_provider IS NOT DISTINCT FROM OLD.translation_provider
			AND NEW.translation_model IS NOT DISTINCT FROM OLD.translation_model
			AND NEW.verification_model IS NOT DISTINCT FROM OLD.verification_model
			AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
			AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
		THEN
			RETURN NEW;
		END IF;

		RAISE EXCEPTION 'published article revisions are immutable; create a new revision';
	END IF;

	IF OLD.status = 'withdrawn' THEN
		RAISE EXCEPTION 'withdrawn article revisions are immutable tombstones';
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER article_revision_immutable_after_publish
BEFORE UPDATE ON "article_revision"
FOR EACH ROW
EXECUTE FUNCTION prevent_published_revision_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_admin_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'UPDATE' THEN
		RAISE EXCEPTION 'admin audit logs are append-only';
	END IF;

	IF OLD.performed_at >= now() - interval '1 year' THEN
		RAISE EXCEPTION 'admin audit logs cannot be removed during retention';
	END IF;

	RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER admin_audit_log_append_only
BEFORE UPDATE OR DELETE ON "admin_audit_log"
FOR EACH ROW
EXECUTE FUNCTION protect_admin_audit_log();
