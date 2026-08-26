import "server-only";

import {
  adminAuditLogs,
  articleRevisions,
  articles,
  contentSources,
  dailyLessons,
  ingestionItems,
  ingestionRuns,
  lessonTokens,
  translationReports,
  users,
} from "@newsorder/db/schema";
import { and, asc, count, eq, max, sql } from "drizzle-orm";

import type { RssCandidate, TranslationPair } from "@/features/ingestion/types";
import {
  passesVerification,
  validateTranslationPair,
} from "@/features/ingestion/verification";
import { tokenizeKorean } from "@/features/lessons/tokenize";
import { GeminiVerificationAdapter } from "@/server/adapters/gemini";
import { getDatabase } from "@/server/db";
import { normalizeWhitespace } from "@/server/domain/text";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

import { auditHash, writeAdminAudit } from "./admin-audit";

export class AdminOperationError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 404 | 409 | 503 = 400,
  ) {
    super(code);
    this.name = "AdminOperationError";
  }
}

function assertMutableRuntime() {
  if (isFixtureRuntime()) {
    throw new AdminOperationError("FIXTURE_READ_ONLY", 503);
  }
}

function auditValues(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  succeeded: boolean;
  before?: unknown;
  after?: unknown;
}) {
  return {
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    succeeded: input.succeeded,
    beforeHash: input.before === undefined ? null : auditHash(input.before),
    afterHash: input.after === undefined ? null : auditHash(input.after),
  };
}

export async function recordFailedAdminOperation(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
}) {
  if (isFixtureRuntime()) return;
  await writeAdminAudit({ ...input, succeeded: false });
}

export async function setContentSourceEnabled(
  actorId: string,
  enabled: boolean,
) {
  assertMutableRuntime();

  return getDatabase().transaction(async (transaction) => {
    const before = await transaction
      .select({ enabled: contentSources.enabled })
      .from(contentSources)
      .where(eq(contentSources.providerKey, "bbc"))
      .limit(1);
    if (!before[0]) throw new AdminOperationError("SOURCE_NOT_FOUND", 404);

    const after = { enabled };
    await transaction
      .update(contentSources)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(contentSources.providerKey, "bbc"));
    await transaction.insert(adminAuditLogs).values(
      auditValues({
        actorId,
        action: enabled ? "source.enable" : "source.disable",
        targetType: "content_source",
        targetId: "bbc",
        succeeded: true,
        before: before[0],
        after,
      }),
    );
    return after;
  });
}

export async function handleTranslationReport(
  actorId: string,
  reportId: string,
  status: "resolved" | "dismissed",
) {
  assertMutableRuntime();

  return getDatabase().transaction(async (transaction) => {
    const before = await transaction
      .select({
        id: translationReports.id,
        status: translationReports.status,
        revisionId: translationReports.revisionId,
      })
      .from(translationReports)
      .where(eq(translationReports.id, reportId))
      .limit(1);
    if (!before[0]) throw new AdminOperationError("REPORT_NOT_FOUND", 404);
    if (before[0].status !== "open") {
      throw new AdminOperationError("REPORT_ALREADY_HANDLED", 409);
    }

    const after = { status, handledBy: actorId };
    await transaction
      .update(translationReports)
      .set({ status, handledBy: actorId, handledAt: new Date() })
      .where(eq(translationReports.id, reportId));
    await transaction.insert(adminAuditLogs).values(
      auditValues({
        actorId,
        action: `report.${status}`,
        targetType: "translation_report",
        targetId: reportId,
        succeeded: true,
        before: before[0],
        after,
      }),
    );
    return { ...after, revisionId: before[0].revisionId };
  });
}

export async function withdrawArticleRevision(
  actorId: string,
  revisionId: string,
) {
  assertMutableRuntime();

  return getDatabase().transaction(async (transaction) => {
    const revisions = await transaction
      .select({
        id: articleRevisions.id,
        articleId: articleRevisions.articleId,
        status: articleRevisions.status,
        sourceHash: articleRevisions.sourceHash,
      })
      .from(articleRevisions)
      .where(eq(articleRevisions.id, revisionId))
      .limit(1);
    const revision = revisions[0];
    if (!revision) throw new AdminOperationError("REVISION_NOT_FOUND", 404);

    const lessons = await transaction
      .select({ id: dailyLessons.id, learningDate: dailyLessons.learningDate })
      .from(dailyLessons)
      .where(eq(dailyLessons.articleRevisionId, revisionId));

    if (revision.status === "withdrawn") {
      return {
        lessonIds: lessons.map((lesson) => lesson.id),
        learningDates: [],
      };
    }

    const now = new Date();
    await transaction
      .update(dailyLessons)
      .set({ status: "withdrawn" })
      .where(eq(dailyLessons.articleRevisionId, revisionId));
    await transaction
      .delete(lessonTokens)
      .where(eq(lessonTokens.revisionId, revisionId));
    await transaction
      .update(articleRevisions)
      .set({
        englishTitle: null,
        englishExcerpt: null,
        koreanTitle: null,
        koreanExcerpt: null,
        verificationResult: null,
        status: "withdrawn",
        withdrawnAt: now,
      })
      .where(eq(articleRevisions.id, revisionId));
    await transaction
      .update(articles)
      .set({ withdrawnAt: now })
      .where(eq(articles.id, revision.articleId));
    await transaction
      .update(ingestionItems)
      .set({ status: "withdrawn", updatedAt: now })
      .where(eq(ingestionItems.revisionId, revisionId));
    await transaction.insert(adminAuditLogs).values(
      auditValues({
        actorId,
        action: "revision.withdraw",
        targetType: "article_revision",
        targetId: revisionId,
        succeeded: true,
        before: revision,
        after: { status: "withdrawn", withdrawnAt: now.toISOString() },
      }),
    );

    return {
      lessonIds: lessons.map((lesson) => lesson.id),
      learningDates: [...new Set(lessons.map((lesson) => lesson.learningDate))],
    };
  });
}

export async function reverifyQuarantinedTranslation(input: {
  actorId: string;
  itemId: string;
  koreanTitle: string;
  koreanExcerpt: string;
}) {
  assertMutableRuntime();
  const koreanTitle = normalizeWhitespace(input.koreanTitle);
  const koreanExcerpt = normalizeWhitespace(input.koreanExcerpt);
  const rows = await getDatabase()
    .select({
      itemId: ingestionItems.id,
      itemStatus: ingestionItems.status,
      runId: ingestionItems.runId,
      learningDate: ingestionRuns.learningDate,
      revisionId: articleRevisions.id,
      revisionNumber: articleRevisions.revisionNumber,
      articleId: articleRevisions.articleId,
      externalId: articles.externalId,
      canonicalUrl: articles.canonicalUrl,
      sourcePublishedAt: articles.publishedAt,
      englishTitle: articleRevisions.englishTitle,
      englishExcerpt: articleRevisions.englishExcerpt,
      sourceHash: articleRevisions.sourceHash,
      previousKoreanTitle: articleRevisions.koreanTitle,
      previousKoreanExcerpt: articleRevisions.koreanExcerpt,
    })
    .from(ingestionItems)
    .innerJoin(ingestionRuns, eq(ingestionItems.runId, ingestionRuns.id))
    .innerJoin(
      articleRevisions,
      eq(ingestionItems.revisionId, articleRevisions.id),
    )
    .innerJoin(articles, eq(articleRevisions.articleId, articles.id))
    .where(eq(ingestionItems.id, input.itemId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AdminOperationError("QUARANTINE_ITEM_NOT_FOUND", 404);
  if (row.itemStatus !== "quarantined") {
    throw new AdminOperationError("QUARANTINE_ITEM_ALREADY_HANDLED", 409);
  }
  if (!row.englishTitle || !row.englishExcerpt) {
    throw new AdminOperationError("QUARANTINE_SOURCE_MISSING", 409);
  }

  const candidate: RssCandidate = {
    externalId: row.externalId,
    canonicalUrl: row.canonicalUrl,
    publishedAt: row.sourcePublishedAt,
    englishTitle: row.englishTitle,
    englishExcerpt: row.englishExcerpt,
    sourceHash: row.sourceHash,
  };
  const translation: TranslationPair = {
    koreanTitle,
    koreanExcerpt,
    provider: "manual",
    model: "admin-manual-v1",
    characterCount: 0,
  };
  const validationErrors = validateTranslationPair(
    candidate,
    translation,
    candidate,
  );
  if (validationErrors.length > 0) {
    throw new AdminOperationError(validationErrors[0]!, 400);
  }

  const env = getServerEnv();
  if (!env.GEMINI_API_KEY)
    throw new AdminOperationError("GEMINI_NOT_CONFIGURED", 503);
  const verifier = new GeminiVerificationAdapter(
    env.GEMINI_API_KEY,
    env.GEMINI_MODEL,
  );
  const verification = await verifier.verify(candidate, translation);
  if (!passesVerification(verification)) {
    await recordFailedAdminOperation({
      actorId: input.actorId,
      action: "quarantine.reverify",
      targetType: "ingestion_item",
      targetId: input.itemId,
      before: {
        koreanTitle: row.previousKoreanTitle,
        koreanExcerpt: row.previousKoreanExcerpt,
      },
    });
    throw new AdminOperationError("VERIFICATION_REJECTED", 409);
  }

  return getDatabase().transaction(async (transaction) => {
    const existingLessons = await transaction
      .select({ ordinal: dailyLessons.ordinal })
      .from(dailyLessons)
      .where(
        and(
          eq(dailyLessons.learningDate, row.learningDate),
          eq(dailyLessons.status, "published"),
        ),
      )
      .orderBy(asc(dailyLessons.ordinal));
    const usedOrdinals = new Set(
      existingLessons.map((lesson) => lesson.ordinal),
    );
    const ordinal = Array.from({ length: 10 }, (_, index) => index + 1).find(
      (candidateOrdinal) => !usedOrdinals.has(candidateOrdinal),
    );
    if (!ordinal) throw new AdminOperationError("DAILY_LESSON_FULL", 409);

    const latest = await transaction
      .select({ value: max(articleRevisions.revisionNumber) })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, row.articleId));
    const revision = await transaction
      .insert(articleRevisions)
      .values({
        articleId: row.articleId,
        revisionNumber: (latest[0]?.value ?? row.revisionNumber) + 1,
        englishTitle: candidate.englishTitle,
        englishExcerpt: candidate.englishExcerpt,
        koreanTitle,
        koreanExcerpt,
        sourceHash: candidate.sourceHash,
        translationProvider: translation.provider,
        translationModel: translation.model,
        verificationModel: verifier.model,
        verificationResult: verification,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: articleRevisions.id });
    const revisionId = revision[0]!.id;
    const tokenValues = [
      ...tokenizeKorean(koreanTitle).map((token) => ({
        revisionId,
        stage: "title" as const,
        canonicalPosition: token.position,
        tokenText: token.text,
      })),
      ...tokenizeKorean(koreanExcerpt).map((token) => ({
        revisionId,
        stage: "excerpt" as const,
        canonicalPosition: token.position,
        tokenText: token.text,
      })),
    ];
    if (tokenValues.length === 0)
      throw new AdminOperationError("TRANSLATION_EMPTY", 400);
    await transaction.insert(lessonTokens).values(tokenValues);
    const lesson = await transaction
      .insert(dailyLessons)
      .values({
        learningDate: row.learningDate,
        ordinal,
        articleRevisionId: revisionId,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: dailyLessons.id });

    await transaction
      .update(articleRevisions)
      .set({ status: "withdrawn", withdrawnAt: new Date() })
      .where(eq(articleRevisions.id, row.revisionId));
    await transaction
      .update(ingestionItems)
      .set({
        revisionId,
        status: "published",
        errorCode: null,
        nextAttemptAt: null,
        updatedAt: new Date(),
      })
      .where(eq(ingestionItems.id, row.itemId));
    await transaction
      .update(ingestionRuns)
      .set({
        approvedCount: sql`${ingestionRuns.approvedCount} + 1`,
        publishedCount: sql`${ingestionRuns.publishedCount} + 1`,
        quarantinedCount: sql`greatest(${ingestionRuns.quarantinedCount} - 1, 0)`,
        status: sql`case when ${ingestionRuns.publishedCount} + 1 >= 10 then 'succeeded'::ingestion_run_status else 'partial'::ingestion_run_status end`,
      })
      .where(eq(ingestionRuns.id, row.runId));
    await transaction.insert(adminAuditLogs).values(
      auditValues({
        actorId: input.actorId,
        action: "quarantine.reverify_publish",
        targetType: "ingestion_item",
        targetId: input.itemId,
        succeeded: true,
        before: {
          revisionId: row.revisionId,
          koreanTitle: row.previousKoreanTitle,
          koreanExcerpt: row.previousKoreanExcerpt,
        },
        after: { revisionId, koreanTitle, koreanExcerpt, verification },
      }),
    );

    return {
      revisionId,
      lessonId: lesson[0]!.id,
      learningDate: row.learningDate,
    };
  });
}

export async function setUserRole(input: {
  actorId: string;
  userId: string;
  role: "user" | "admin";
}) {
  assertMutableRuntime();
  if (input.actorId === input.userId && input.role !== "admin") {
    throw new AdminOperationError("CANNOT_DEMOTE_SELF", 409);
  }

  return getDatabase().transaction(async (transaction) => {
    const before = await transaction
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (!before[0]) throw new AdminOperationError("USER_NOT_FOUND", 404);

    if (before[0].role.split(",").includes("admin") && input.role === "user") {
      const adminCount = await transaction
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, "admin"));
      if ((adminCount[0]?.value ?? 0) <= 1) {
        throw new AdminOperationError("LAST_ADMIN_REQUIRED", 409);
      }
    }

    await transaction
      .update(users)
      .set({ role: input.role, updatedAt: new Date() })
      .where(eq(users.id, input.userId));
    await transaction.insert(adminAuditLogs).values(
      auditValues({
        actorId: input.actorId,
        action: "user.role_change",
        targetType: "user",
        targetId: input.userId,
        succeeded: true,
        before: before[0],
        after: { role: input.role },
      }),
    );
    return { role: input.role };
  });
}
