import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { articleRevisions } from "./content";
import {
  audienceKindEnum,
  lessonStageEnum,
  reportStatusEnum,
  reportTypeEnum,
} from "./enums";

export const stageProgress = pgTable(
  "stage_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Deliberately not a foreign key: user-data backups exclude licensed content,
    // so progress must be restorable before lessons are reconstituted.
    lessonId: uuid("lesson_id").notNull(),
    stage: lessonStageEnum("stage").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    bestPositionScore: integer("best_position_score").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    helped: boolean("helped").default(false).notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stage_progress_user_lesson_stage_unique").on(
      table.userId,
      table.lessonId,
      table.stage,
    ),
    index("stage_progress_user_completed_idx").on(
      table.userId,
      table.completedAt,
    ),
    check(
      "stage_progress_attempts_range",
      sql`${table.attempts} between 0 and 10000`,
    ),
    check(
      "stage_progress_score_range",
      sql`${table.bestPositionScore} between 0 and 100`,
    ),
  ],
);

export const lessonRestoreIdentities = pgTable(
  "lesson_restore_identity",
  {
    lessonId: uuid("lesson_id").primaryKey(),
    learningDate: date("learning_date", { mode: "string" }).notNull(),
    ordinal: integer("ordinal").notNull(),
    providerKey: text("provider_key").notNull(),
    externalIdHash: text("external_id_hash").notNull(),
    sourceHash: text("source_hash").notNull(),
    restoredAt: timestamp("restored_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("lesson_restore_identity_source_unique").on(
      table.providerKey,
      table.externalIdHash,
      table.sourceHash,
    ),
    index("lesson_restore_identity_date_idx").on(table.learningDate),
    check(
      "lesson_restore_identity_ordinal_range",
      sql`${table.ordinal} between 1 and 10`,
    ),
  ],
);

export const translationReports = pgTable(
  "translation_report",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterUserId: text("reporter_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevisions.id),
    type: reportTypeEnum("type").notNull(),
    status: reportStatusEnum("status").default("open").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    handledBy: text("handled_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("translation_report_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    uniqueIndex("translation_report_one_open_per_user_revision")
      .on(table.reporterUserId, table.revisionId)
      .where(
        sql`${table.status} = 'open' and ${table.reporterUserId} is not null`,
      ),
  ],
);

export const learningEventDaily = pgTable(
  "learning_event_daily",
  {
    eventDate: date("event_date", { mode: "string" }).notNull(),
    eventName: text("event_name").notNull(),
    audience: audienceKindEnum("audience").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("learning_event_daily_unique").on(
      table.eventDate,
      table.eventName,
      table.audience,
    ),
    check("learning_event_daily_nonnegative", sql`${table.count} >= 0`),
  ],
);

export const progressMergeRequests = pgTable(
  "progress_merge_request",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mergedAt: timestamp("merged_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("progress_merge_request_user_idx").on(table.userId)],
);

export const deletionEvents = pgTable(
  "deletion_event",
  {
    userIdHmac: text("user_id_hmac").primaryKey(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("deletion_event_expiry_idx").on(table.expiresAt)],
);
