import { sql } from "drizzle-orm";
import {
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

import { lessonStageEnum, lessonStatusEnum, revisionStatusEnum } from "./enums";

export type VerificationResult = {
  meaningPreserved: boolean;
  complete: boolean;
  noHallucination: boolean;
  naturalKorean: boolean;
  safeForLearning: boolean;
  notes?: string;
};

export const contentSources = pgTable("content_source", {
  providerKey: text("provider_key").primaryKey(),
  displayName: text("display_name").notNull(),
  sourceLanguage: text("source_language").default("en").notNull(),
  targetLanguage: text("target_language").default("ko").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  nonCommercialRequired: boolean("non_commercial_required")
    .default(true)
    .notNull(),
  rightsDocumentVersion: text("rights_document_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const articles = pgTable(
  "article",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerKey: text("provider_key")
      .notNull()
      .references(() => contentSources.providerKey),
    externalId: text("external_id").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("article_provider_external_unique").on(
      table.providerKey,
      table.externalId,
    ),
    index("article_provider_published_idx").on(
      table.providerKey,
      table.publishedAt,
    ),
  ],
);

export const articleRevisions = pgTable(
  "article_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    englishTitle: text("english_title"),
    englishExcerpt: text("english_excerpt"),
    koreanTitle: text("korean_title"),
    koreanExcerpt: text("korean_excerpt"),
    sourceHash: text("source_hash").notNull(),
    translationProvider: text("translation_provider").notNull(),
    translationModel: text("translation_model").notNull(),
    verificationModel: text("verification_model").notNull(),
    verificationResult: jsonb(
      "verification_result",
    ).$type<VerificationResult>(),
    status: revisionStatusEnum("status").default("discovered").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("article_revision_number_unique").on(
      table.articleId,
      table.revisionNumber,
    ),
    index("article_revision_hash_idx").on(table.articleId, table.sourceHash),
    index("article_revision_status_idx").on(table.status, table.createdAt),
    check(
      "article_revision_excerpt_length",
      sql`${table.englishExcerpt} is null or char_length(${table.englishExcerpt}) <= 200`,
    ),
    check("article_revision_positive_number", sql`${table.revisionNumber} > 0`),
    check(
      "article_revision_published_has_content",
      sql`${table.status} = 'withdrawn' or (${table.englishTitle} is not null and ${table.englishExcerpt} is not null and ${table.koreanTitle} is not null and ${table.koreanExcerpt} is not null)`,
    ),
  ],
);

export const dailyLessons = pgTable(
  "daily_lesson",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    learningDate: date("learning_date", { mode: "string" }).notNull(),
    ordinal: integer("ordinal").notNull(),
    articleRevisionId: uuid("article_revision_id")
      .notNull()
      .references(() => articleRevisions.id),
    status: lessonStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("daily_lesson_date_ordinal_unique").on(
      table.learningDate,
      table.ordinal,
    ),
    index("daily_lesson_revision_idx").on(table.articleRevisionId),
    index("daily_lesson_date_status_idx").on(table.learningDate, table.status),
    check("daily_lesson_ordinal_range", sql`${table.ordinal} between 1 and 10`),
  ],
);

export const lessonTokens = pgTable(
  "lesson_token",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevisions.id, { onDelete: "cascade" }),
    stage: lessonStageEnum("stage").notNull(),
    canonicalPosition: integer("canonical_position").notNull(),
    tokenText: text("token_text").notNull(),
  },
  (table) => [
    uniqueIndex("lesson_token_position_unique").on(
      table.revisionId,
      table.stage,
      table.canonicalPosition,
    ),
    index("lesson_token_revision_stage_idx").on(table.revisionId, table.stage),
    check(
      "lesson_token_nonnegative_position",
      sql`${table.canonicalPosition} >= 0`,
    ),
    check("lesson_token_nonempty", sql`char_length(${table.tokenText}) > 0`),
  ],
);
