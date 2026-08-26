import "server-only";

import { createHash } from "node:crypto";

import {
  articleRevisions,
  articles,
  contentSources,
  dailyLessons,
  ingestionItems,
  ingestionRuns,
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

async function filterPreviouslyPublished(candidates: RssCandidate[]) {
  if (candidates.length === 0) return candidates;
  const rows = await getDatabase()
    .select({
      externalId: articles.externalId,
      sourceHash: articleRevisions.sourceHash,
    })
    .from(articles)
    .innerJoin(articleRevisions, eq(articleRevisions.articleId, articles.id))
    .where(
      and(
        eq(articles.providerKey, PROVIDER_KEY),
        eq(articleRevisions.status, "published"),
        inArray(
          articles.externalId,
          candidates.map((candidate) => candidate.externalId),
        ),
      ),
    );
  const published = new Set(
    rows.map((row) => `${row.externalId}:${row.sourceHash}`),
  );
  return candidates.filter(
    (candidate) =>
      !published.has(`${candidate.externalId}:${candidate.sourceHash}`),
  );
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
    learningDate,
    ordinal,
    articleRevisionId: revisionId,
    status: "published",
    publishedAt: new Date(),
  });
  await transaction.insert(ingestionItems).values({
    runId,
    externalIdHash: externalIdHash(candidate.externalId),
    revisionId,
    status: "published",
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

  if (item.candidate && item.translation) {
    const articleId = await upsertArticle(transaction, item.candidate);
    const revisionNumber = await nextRevisionNumber(transaction, articleId);
    const revision = await transaction
      .insert(articleRevisions)
      .values({
        articleId,
        revisionNumber,
        englishTitle: item.candidate.englishTitle,
        englishExcerpt: item.candidate.englishExcerpt,
        koreanTitle: item.translation.koreanTitle,
        koreanExcerpt: item.translation.koreanExcerpt,
        sourceHash: item.candidate.sourceHash,
        translationProvider: item.translation.provider,
        translationModel: item.translation.model,
        verificationModel: getServerEnv().GEMINI_MODEL,
        verificationResult: item.verification ?? null,
        status: "quarantined",
      })
      .returning({ id: articleRevisions.id });
    revisionId = revision[0]!.id;
  }

  await transaction.insert(ingestionItems).values({
    runId,
    externalIdHash: item.externalIdHash,
    ...(revisionId ? { revisionId } : {}),
    status: "quarantined",
    retryCount: item.retries,
    errorCode: item.errorCode,
  });
}

async function persistBatch(
  runId: string,
  learningDate: string,
  batch: PreparedBatch,
) {
  await getDatabase().transaction(async (transaction) => {
    for (const [index, candidate] of batch.approved.entries()) {
      await persistApproved(
        transaction,
        runId,
        learningDate,
        index + 1,
        candidate,
      );
    }
    for (const item of batch.quarantined) {
      await persistQuarantined(transaction, runId, item);
    }

    if (batch.characterCount > 0) {
      const usageMonth = `${learningDate.slice(0, 7)}-01`;
      await transaction
        .insert(monthlyTranslationUsage)
        .values({ usageMonth, characterCount: batch.characterCount })
        .onConflictDoUpdate({
          target: monthlyTranslationUsage.usageMonth,
          set: {
            characterCount: sql`${monthlyTranslationUsage.characterCount} + ${batch.characterCount}`,
            updatedAt: new Date(),
          },
        });
    }

    await transaction
      .update(ingestionRuns)
      .set({
        status: batch.approved.length >= 10 ? "succeeded" : "partial",
        finishedAt: new Date(),
        discoveredCount: batch.discoveredCount,
        translatedCount: batch.translatedCount,
        approvedCount: batch.approved.length,
        quarantinedCount: batch.quarantined.length,
        publishedCount: batch.approved.length,
        warningCode: batch.warningCode,
      })
      .where(eq(ingestionRuns.id, runId));
  });
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

  const inserted = await getDatabase()
    .insert(ingestionRuns)
    .values({ providerKey: PROVIDER_KEY, learningDate })
    .onConflictDoNothing()
    .returning({ id: ingestionRuns.id });
  const runId = inserted[0]?.id;
  if (!runId) return { status: "duplicate", publishedCount: 0 };

  try {
    const usage = await currentMonthUsage(learningDate);
    if (usage >= TRANSLATION_MONTHLY_GUARD) {
      throw new Error("TRANSLATION_QUOTA_GUARD");
    }
    const candidates = await filterPreviouslyPublished(await fetchBbcRss());
    const translator = new GoogleTranslationAdapter(
      env.GOOGLE_CLOUD_PROJECT!,
      env.GOOGLE_CLOUD_LOCATION,
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
        maximumCharacters: TRANSLATION_MONTHLY_GUARD - usage,
      },
    );
    await persistBatch(runId, learningDate, batch);

    return {
      runId,
      status: batch.approved.length >= 10 ? "succeeded" : "partial",
      publishedCount: batch.approved.length,
      warningCode: batch.warningCode,
    };
  } catch (error) {
    const warningCode =
      error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message)
        ? error.message
        : "INGESTION_FAILED";
    await getDatabase()
      .update(ingestionRuns)
      .set({ status: "failed", finishedAt: new Date(), warningCode })
      .where(eq(ingestionRuns.id, runId));
    return { runId, status: "failed", publishedCount: 0, warningCode };
  }
}
