import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { articleRevisions, contentSources } from "./content";
import {
  backupStatusEnum,
  ingestionItemStatusEnum,
  ingestionRunStatusEnum,
} from "./enums";

export const ingestionRuns = pgTable(
  "ingestion_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerKey: text("provider_key")
      .notNull()
      .references(() => contentSources.providerKey),
    learningDate: date("learning_date", { mode: "string" }).notNull(),
    status: ingestionRunStatusEnum("status").default("running").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    discoveredCount: integer("discovered_count").default(0).notNull(),
    translatedCount: integer("translated_count").default(0).notNull(),
    approvedCount: integer("approved_count").default(0).notNull(),
    quarantinedCount: integer("quarantined_count").default(0).notNull(),
    publishedCount: integer("published_count").default(0).notNull(),
    warningCode: text("warning_code"),
  },
  (table) => [
    uniqueIndex("ingestion_run_provider_date_unique").on(
      table.providerKey,
      table.learningDate,
    ),
    index("ingestion_run_started_idx").on(table.startedAt),
  ],
);

export const ingestionItems = pgTable(
  "ingestion_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "cascade" }),
    externalIdHash: text("external_id_hash").notNull(),
    revisionId: uuid("revision_id").references(() => articleRevisions.id),
    status: ingestionItemStatusEnum("status").default("discovered").notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ingestion_item_run_external_unique").on(
      table.runId,
      table.externalIdHash,
    ),
    index("ingestion_item_status_retry_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
    check(
      "ingestion_item_retry_range",
      sql`${table.retryCount} between 0 and 3`,
    ),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_log",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    performedAt: timestamp("performed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    succeeded: boolean("succeeded").notNull(),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
  },
  (table) => [index("admin_audit_performed_idx").on(table.performedAt)],
);

export type BackupManifestRecord = {
  schemaVersion: string;
  migrationVersion: string;
  rowCounts: Record<string, number>;
  checksum: string;
};

export const backupRuns = pgTable(
  "backup_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: backupStatusEnum("status").default("running").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    blobPath: text("blob_path"),
    manifest: jsonb("manifest").$type<BackupManifestRecord>(),
    errorCode: text("error_code"),
  },
  (table) => [index("backup_run_started_idx").on(table.startedAt)],
);

export const monthlyTranslationUsage = pgTable(
  "monthly_translation_usage",
  {
    usageMonth: date("usage_month", { mode: "string" }).primaryKey(),
    characterCount: integer("character_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "monthly_translation_usage_nonnegative",
      sql`${table.characterCount} >= 0`,
    ),
    check(
      "monthly_translation_usage_guard",
      sql`${table.characterCount} <= 450000`,
    ),
  ],
);
