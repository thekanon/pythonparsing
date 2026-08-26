import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const lessonStageEnum = pgEnum("lesson_stage", ["title", "excerpt"]);
export const revisionStatusEnum = pgEnum("revision_status", [
  "discovered",
  "normalized",
  "translated",
  "verifying",
  "approved",
  "published",
  "retrying",
  "quarantined",
  "withdrawn",
]);
export const lessonStatusEnum = pgEnum("lesson_status", [
  "draft",
  "published",
  "withdrawn",
]);
export const reportTypeEnum = pgEnum("report_type", [
  "inaccurate",
  "unnatural",
  "incomplete",
  "unsafe",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "resolved",
  "dismissed",
]);
export const ingestionRunStatusEnum = pgEnum("ingestion_run_status", [
  "running",
  "succeeded",
  "partial",
  "failed",
]);
export const ingestionItemStatusEnum = pgEnum("ingestion_item_status", [
  "discovered",
  "normalized",
  "translated",
  "verifying",
  "approved",
  "published",
  "retrying",
  "quarantined",
  "withdrawn",
]);
export const audienceKindEnum = pgEnum("audience_kind", [
  "anonymous",
  "authenticated",
]);
export const backupStatusEnum = pgEnum("backup_status", [
  "running",
  "succeeded",
  "failed",
]);
