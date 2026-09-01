import "server-only";

import { createHash } from "node:crypto";

import {
  articleRevisions,
  articles,
  contentSources,
  dailyLessons,
  ingestionItems,
  ingestionRuns,
  lessonRestoreIdentities,
  lessonTokens,
  monthlyTranslationUsage,
} from "@newsorder/db/schema";
import { and, eq, inArray, max, sql } from "drizzle-orm";

import type {
  ApprovedCandidate,
  PreparedBatch,
  QuarantinedCandidate,
  RssCandidate,
} from "@/features/ingestion/types";
import { filterEligibleCandidates } from "@/features/ingestion/history";
import { prepareIngestionBatch } from "@/features/ingestion/workflow";
import { tokenizeKorean } from "@/features/lessons/tokenize";
import { fetchBbcRss } from "@/server/adapters/bbc-rss";
import { GeminiVerificationAdapter } from "@/server/adapters/gemini";
import { GoogleTranslationAdapter } from "@/server/adapters/translation";
import { getDatabase } from "@/server/db";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

const PROVIDER_KEY = "bbc";
const RIGHTS_VERSION = "bbc-permission-summary-2026-08-26";
const TRANSLATION_MONTHLY_GUARD = 450_000;

function externalIdHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function ensureContentSource() {
  const rows = await getDatabase()
    .insert(contentSources)
    .values({
      providerKey: PROVIDER_KEY,
      displayName: "BBC News",
      sourceLanguage: "en",
      targetLanguage: "ko",
      enabled: true,
      nonCommercialRequired: true,
      rightsDocumentVersion: RIGHTS_VERSION,
    })
    .onConflictDoNothing()
    .returning({ enabled: contentSources.enabled });

  if (rows[0]) return rows[0].enabled;
  const existing = await getDatabase()
    .select({ enabled: contentSources.enabled })
    .from(contentSources)
    .where(eq(contentSources.providerKey, PROVIDER_KEY))
    .limit(1);
  return existing[0]?.enabled ?? false;
}

async function currentMonthUsage(learningDate: string) {
  const usageMonth = `${learningDate.slice(0, 7)}-01`;
  const row = await getDatabase()
    .select({ characterCount: monthlyTranslationUsage.characterCount })
    .from(monthlyTranslationUsage)
    .where(eq(monthlyTranslationUsage.usageMonth, usageMonth))
    .limit(1);
  return row[0]?.characterCount ?? 0;
}

export async function reserveTranslationUsage(
  learningDate: string,
  characterCount: number,
) {
  const usageMonth = `${learningDate.slice(0, 7)}-01`;
  try {
    await getDatabase().transaction(async (transaction) => {
      const current = await transaction
        .select({ characterCount: monthlyTranslationUsage.characterCount })
        .from(monthlyTranslationUsage)
        .where(eq(monthlyTranslationUsage.usageMonth, usageMonth))
        .limit(1);
      if (
        (current[0]?.characterCount ?? 0) + characterCount >
        TRANSLATION_MONTHLY_GUARD
      ) {
        throw new Error("TRANSLATION_QUOTA_GUARD");
      }

      await transaction
        .insert(monthlyTranslationUsage)
        .values({ usageMonth, characterCount })
        .onConflictDoUpdate({
          target: monthlyTranslationUsage.usageMonth,
          set: {
            characterCount: sql`${monthlyTranslationUsage.characterCount} + ${characterCount}`,
            updatedAt: new Date(),
          },
        });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TRANSLATION_QUOTA_GUARD") {
      throw error;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "constraint_name" in error &&
      error.constraint_name === "monthly_translation_usage_guard"
    ) {
      throw new Error("TRANSLATION_QUOTA_GUARD");
    }
    throw error;
  }
}

class MeteredTranslationAdapter extends GoogleTranslationAdapter {
  constructor(
    projectId: string,
    location: string,
    private readonly learningDate: string,
  ) {
    super(projectId, location);
  }

  override async translate(candidate: RssCandidate) {
    const characterCount = Array.from(
      candidate.englishTitle + candidate.englishExcerpt,
    ).length;
    await reserveTranslationUsage(this.learningDate, characterCount);
    return super.translate(candidate);
  }
}

async function filterPreviouslyPublished(candidates: RssCandidate[]) {
  if (candidates.length === 0) return candidates;
  const rows = await getDatabase()
    .select({
      externalId: articles.externalId,
      withdrawnAt: articles.withdrawnAt,
      sourceHash: articleRevisions.sourceHash,
      revisionStatus: articleRevisions.status,
    })
    .from(articles)
    .innerJoin(articleRevisions, eq(articleRevisions.articleId, articles.id))
    .where(
      and(
        eq(articles.providerKey, PROVIDER_KEY),
        inArray(
          articles.externalId,
          candidates.map((candidate) => candidate.externalId),
        ),
      ),
    );
  return filterEligibleCandidates(candidates, rows);
}

async function upsertArticle(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  candidate: RssCandidate,
) {
  const rows = await transaction
    .insert(articles)
    .values({
      providerKey: PROVIDER_KEY,
      externalId: candidate.externalId,
      canonicalUrl: candidate.canonicalUrl,
      publishedAt: candidate.publishedAt,
    })
    .onConflictDoUpdate({
      target: [articles.providerKey, articles.externalId],
      set: {
        canonicalUrl: candidate.canonicalUrl,
        publishedAt: candidate.publishedAt,
      },
    })
    .returning({ id: articles.id });
  return rows[0]!.id;
}

async function nextRevisionNumber(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  articleId: string,
) {
  const rows = await transaction
    .select({ value: max(articleRevisions.revisionNumber) })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, articleId));
  return (rows[0]?.value ?? 0) + 1;
}

async function persistApproved(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  runId: string,
  learningDate: string,
  ordinal: number,
  candidate: ApprovedCandidate,
  restoredLessonId?: string,
) {
  const articleId = await upsertArticle(transaction, candidate);
  const revisionNumber = await nextRevisionNumber(transaction, articleId);
  const revision = await transaction
    .insert(articleRevisions)
    .values({
      articleId,
      revisionNumber,
      englishTitle: candidate.englishTitle,
      englishExcerpt: candidate.englishExcerpt,
      koreanTitle: candidate.koreanTitle,
      koreanExcerpt: candidate.koreanExcerpt,
      sourceHash: candidate.sourceHash,
      translationProvider: candidate.provider,
      translationModel: candidate.model,
      verificationModel: candidate.verificationModel,
      verificationResult: candidate.verification,
      status: "published",
      publishedAt: new Date(),
    })
    .returning({ id: articleRevisions.id });
  const revisionId = revision[0]!.id;

  const tokenValues = [
    ...tokenizeKorean(candidate.koreanTitle).map((token) => ({
      revisionId,
      stage: "title" as const,
      canonicalPosition: token.position,
      tokenText: token.text,
    })),
    ...tokenizeKorean(candidate.koreanExcerpt).map((token) => ({
      revisionId,
      stage: "excerpt" as const,
      canonicalPosition: token.position,
      tokenText: token.text,
    })),
  ];
  await transaction.insert(lessonTokens).values(tokenValues);
  await transaction.insert(dailyLessons).values({
    ...(restoredLessonId ? { id: restoredLessonId } : {}),
    learningDate,
    ordinal,
    articleRevisionId: revisionId,
    status: "published",
    publishedAt: new Date(),
  });
  await transaction
    .insert(ingestionItems)
    .values({
      runId,
      externalIdHash: externalIdHash(candidate.externalId),
      revisionId,
      status: "published",
    })
    .onConflictDoUpdate({
      target: [ingestionItems.runId, ingestionItems.externalIdHash],
      set: {
        revisionId,
        status: "published",
        retryCount: 0,
        nextAttemptAt: null,
        errorCode: null,
        updatedAt: new Date(),
      },
    });
}

async function persistQuarantined(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  runId: string,
  item: QuarantinedCandidate,
) {
  let revisionId: string | undefined;

  if (item.candidate) {
    const articleId = await upsertArticle(transaction, item.candidate);
    const revisionNumber = await nextRevisionNumber(transaction, articleId);
    const revision = await transaction
      .insert(articleRevisions)
      .values({
        articleId,
        revisionNumber,
        englishTitle: item.candidate.englishTitle,
        englishExcerpt: item.candidate.englishExcerpt,
        koreanTitle: item.translation?.koreanTitle ?? null,
        koreanExcerpt: item.translation?.koreanExcerpt ?? null,
        sourceHash: item.candidate.sourceHash,
        translationProvider: item.translation?.provider ?? "unavailable",
        translationModel: item.translation?.model ?? "unavailable",
        verificationModel: getServerEnv().GEMINI_MODEL,
        verificationResult: item.verification ?? null,
        status: "quarantined",
      })
      .returning({ id: articleRevisions.id });
    revisionId = revision[0]!.id;
  }

  await transaction
    .insert(ingestionItems)
    .values({
      runId,
      externalIdHash: item.externalIdHash,
      ...(revisionId ? { revisionId } : {}),
      status: "quarantined",
      retryCount: item.retries,
      errorCode: item.errorCode,
    })
    .onConflictDoUpdate({
      target: [ingestionItems.runId, ingestionItems.externalIdHash],
      set: {
        ...(revisionId ? { revisionId } : {}),
        status: "quarantined",
        retryCount: item.retries,
        errorCode: item.errorCode,
        updatedAt: new Date(),
      },
    });
}

async function persistBatch(
  runId: string,
  learningDate: string,
  batch: PreparedBatch,
  ordinals: readonly number[],
  existingPublishedCount: number,
) {
  await getDatabase().transaction(async (transaction) => {
    const availableOrdinals = new Set(ordinals);
    for (const candidate of batch.approved) {
      const restored = await transaction
        .select({
          lessonId: lessonRestoreIdentities.lessonId,
          ordinal: lessonRestoreIdentities.ordinal,
        })
        .from(lessonRestoreIdentities)
        .where(
          and(
            eq(lessonRestoreIdentities.providerKey, PROVIDER_KEY),
            eq(
              lessonRestoreIdentities.externalIdHash,
              externalIdHash(candidate.externalId),
            ),
            eq(lessonRestoreIdentities.sourceHash, candidate.sourceHash),
          ),
        )
        .limit(1);
      const restoredIdentity = restored[0];
      const ordinal =
        restoredIdentity && availableOrdinals.has(restoredIdentity.ordinal)
          ? restoredIdentity.ordinal
          : availableOrdinals.values().next().value;
      if (ordinal === undefined) throw new Error("DAILY_LESSON_FULL");
      availableOrdinals.delete(ordinal);

      await persistApproved(
        transaction,
        runId,
        learningDate,
        ordinal,
        candidate,
        restoredIdentity?.lessonId,
      );
    }
    for (const item of batch.quarantined) {
      await persistQuarantined(transaction, runId, item);
    }

    const publishedCount = existingPublishedCount + batch.approved.length;
    const warningCode =
      publishedCount < 10 && batch.approved.length >= ordinals.length
        ? "DAILY_LESSON_SLOTS_EXHAUSTED"
        : batch.warningCode;
    await transaction
      .update(ingestionRuns)
      .set({
        status: publishedCount >= 10 ? "succeeded" : "partial",
        finishedAt: new Date(),
        discoveredCount: batch.discoveredCount,
        translatedCount: batch.translatedCount,
        approvedCount: publishedCount,
        quarantinedCount: batch.quarantined.length,
        publishedCount,
        warningCode,
      })
      .where(eq(ingestionRuns.id, runId));
  });
}

async function acquireIngestionRun(learningDate: string) {
  const inserted = await getDatabase()
    .insert(ingestionRuns)
    .values({ providerKey: PROVIDER_KEY, learningDate })
    .onConflictDoNothing()
    .returning({ id: ingestionRuns.id });
  if (inserted[0]) return inserted[0].id;

  const resumed = await getDatabase()
    .update(ingestionRuns)
    .set({
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      warningCode: null,
    })
    .where(
      and(
        eq(ingestionRuns.providerKey, PROVIDER_KEY),
        eq(ingestionRuns.learningDate, learningDate),
        inArray(ingestionRuns.status, ["partial", "failed"]),
      ),
    )
    .returning({ id: ingestionRuns.id });
  return resumed[0]?.id;
}

async function lessonAvailability(learningDate: string) {
  const rows = await getDatabase()
    .select({ ordinal: dailyLessons.ordinal, status: dailyLessons.status })
    .from(dailyLessons)
    .where(eq(dailyLessons.learningDate, learningDate));
  const used = new Set(rows.map((row) => row.ordinal));
  return {
    existingPublishedCount: rows.filter((row) => row.status === "published")
      .length,
    availableOrdinals: Array.from(
      { length: 10 },
      (_, index) => index + 1,
    ).filter((ordinal) => !used.has(ordinal)),
  };
}

export type DailyIngestionResult = {
  runId?: string;
  status:
    "fixture" | "disabled" | "duplicate" | "succeeded" | "partial" | "failed";
  publishedCount: number;
  warningCode?: string | null;
};

export async function runDailyIngestion(
  learningDate: string,
): Promise<DailyIngestionResult> {
  if (isFixtureRuntime()) return { status: "fixture", publishedCount: 10 };
  const env = getServerEnv();
  if (!(await ensureContentSource()))
    return { status: "disabled", publishedCount: 0 };

  const runId = await acquireIngestionRun(learningDate);
  if (!runId) return { status: "duplicate", publishedCount: 0 };

  const { existingPublishedCount, availableOrdinals } =
    await lessonAvailability(learningDate);
  const targetCount = Math.min(
    10 - existingPublishedCount,
    availableOrdinals.length,
  );
  if (targetCount <= 0) {
    const status = existingPublishedCount >= 10 ? "succeeded" : "partial";
    const warningCode =
      existingPublishedCount >= 10 ? null : "DAILY_LESSON_SLOTS_EXHAUSTED";
    await getDatabase()
      .update(ingestionRuns)
      .set({ status, finishedAt: new Date(), warningCode })
      .where(eq(ingestionRuns.id, runId));
    return {
      runId,
      status,
      publishedCount: existingPublishedCount,
      warningCode,
    };
  }

  try {
    const usage = await currentMonthUsage(learningDate);
    if (usage >= TRANSLATION_MONTHLY_GUARD) {
      throw new Error("TRANSLATION_QUOTA_GUARD");
    }
    const candidates = await filterPreviouslyPublished(await fetchBbcRss());
    const translator = new MeteredTranslationAdapter(
      env.GOOGLE_CLOUD_PROJECT!,
      env.GOOGLE_CLOUD_LOCATION,
      learningDate,
    );
    const verifier = new GeminiVerificationAdapter(
      env.GEMINI_API_KEY!,
      env.GEMINI_MODEL,
    );
    const batch = await prepareIngestionBatch(
      candidates,
      translator,
      verifier,
      {
        targetCount,
        maximumCharacters: TRANSLATION_MONTHLY_GUARD - usage,
      },
    );
    await persistBatch(
      runId,
      learningDate,
      batch,
      availableOrdinals,
      existingPublishedCount,
    );

    const publishedCount = existingPublishedCount + batch.approved.length;
    const warningCode =
      publishedCount < 10 && batch.approved.length >= availableOrdinals.length
        ? "DAILY_LESSON_SLOTS_EXHAUSTED"
        : batch.warningCode;

    return {
      runId,
      status: publishedCount >= 10 ? "succeeded" : "partial",
      publishedCount,
      warningCode,
    };
  } catch (error) {
    const warningCode =
      error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message)
        ? error.message
        : "INGESTION_FAILED";
    await getDatabase()
      .update(ingestionRuns)
      .set({
        status: existingPublishedCount > 0 ? "partial" : "failed",
        finishedAt: new Date(),
        publishedCount: existingPublishedCount,
        warningCode,
      })
      .where(eq(ingestionRuns.id, runId));
    return {
      runId,
      status: existingPublishedCount > 0 ? "partial" : "failed",
      publishedCount: existingPublishedCount,
      warningCode,
    };
  }
}
