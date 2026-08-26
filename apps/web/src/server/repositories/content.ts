import "server-only";

import {
  articleRevisions,
  articles,
  contentSources,
  dailyLessons,
  lessonTokens,
} from "@newsorder/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import type {
  LessonContent,
  LessonStage,
  LessonSummary,
} from "@/features/lessons/types";
import { getDatabase } from "@/server/db";
import { isFixtureRuntime } from "@/server/env";

import {
  findFixtureLesson,
  listFixtureArchiveDates,
  listFixtureLessons,
} from "./fixture-content";

function assertPublishedText(value: string | null, field: string): string {
  if (!value) throw new Error(`Published revision is missing ${field}.`);
  return value;
}

function sourceProvider(providerKey: string): "BBC" | "fixture" {
  return providerKey.toLowerCase() === "bbc" ? "BBC" : "fixture";
}

export async function listLessonsByDate(
  date: string,
): Promise<LessonSummary[]> {
  if (isFixtureRuntime()) return listFixtureLessons(date);

  const rows = await getDatabase()
    .select({
      id: dailyLessons.id,
      revisionId: articleRevisions.id,
      learningDate: dailyLessons.learningDate,
      ordinal: dailyLessons.ordinal,
      englishTitle: articleRevisions.englishTitle,
      englishExcerpt: articleRevisions.englishExcerpt,
      providerKey: contentSources.providerKey,
      sourceLabel: contentSources.displayName,
      sourceUrl: articles.canonicalUrl,
      sourcePublishedAt: articles.publishedAt,
    })
    .from(dailyLessons)
    .innerJoin(
      articleRevisions,
      eq(dailyLessons.articleRevisionId, articleRevisions.id),
    )
    .innerJoin(articles, eq(articleRevisions.articleId, articles.id))
    .innerJoin(
      contentSources,
      eq(articles.providerKey, contentSources.providerKey),
    )
    .where(
      and(
        eq(dailyLessons.learningDate, date),
        eq(dailyLessons.status, "published"),
        eq(articleRevisions.status, "published"),
        eq(contentSources.enabled, true),
        isNull(articles.withdrawnAt),
      ),
    )
    .orderBy(asc(dailyLessons.ordinal));

  return rows.map((row) => ({
    id: row.id,
    revisionId: row.revisionId,
    learningDate: row.learningDate,
    ordinal: row.ordinal,
    englishTitle: assertPublishedText(row.englishTitle, "english title"),
    englishExcerpt: assertPublishedText(row.englishExcerpt, "english excerpt"),
    source: {
      provider: sourceProvider(row.providerKey),
      label: row.sourceLabel,
      url: row.sourceUrl,
      publishedAt: row.sourcePublishedAt.toISOString(),
      fixture: false,
    },
  }));
}

export async function findLesson(
  lessonId: string,
): Promise<LessonContent | null> {
  if (isFixtureRuntime()) return findFixtureLesson(lessonId);

  const rows = await getDatabase()
    .select({
      id: dailyLessons.id,
      revisionId: articleRevisions.id,
      learningDate: dailyLessons.learningDate,
      ordinal: dailyLessons.ordinal,
      englishTitle: articleRevisions.englishTitle,
      englishExcerpt: articleRevisions.englishExcerpt,
      koreanTitle: articleRevisions.koreanTitle,
      koreanExcerpt: articleRevisions.koreanExcerpt,
      providerKey: contentSources.providerKey,
      sourceLabel: contentSources.displayName,
      sourceUrl: articles.canonicalUrl,
      sourcePublishedAt: articles.publishedAt,
    })
    .from(dailyLessons)
    .innerJoin(
      articleRevisions,
      eq(dailyLessons.articleRevisionId, articleRevisions.id),
    )
    .innerJoin(articles, eq(articleRevisions.articleId, articles.id))
    .innerJoin(
      contentSources,
      eq(articles.providerKey, contentSources.providerKey),
    )
    .where(
      and(
        eq(dailyLessons.id, lessonId),
        eq(dailyLessons.status, "published"),
        eq(articleRevisions.status, "published"),
        eq(contentSources.enabled, true),
        isNull(articles.withdrawnAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const tokenRows = await getDatabase()
    .select({
      id: lessonTokens.id,
      stage: lessonTokens.stage,
      position: lessonTokens.canonicalPosition,
      text: lessonTokens.tokenText,
    })
    .from(lessonTokens)
    .where(eq(lessonTokens.revisionId, row.revisionId))
    .orderBy(asc(lessonTokens.canonicalPosition));

  const tokensFor = (stage: LessonStage) =>
    tokenRows
      .filter((token) => token.stage === stage)
      .map((token) => ({
        id: token.id,
        position: token.position,
        text: token.text,
      }));

  return {
    id: row.id,
    revisionId: row.revisionId,
    learningDate: row.learningDate,
    ordinal: row.ordinal,
    source: {
      provider: sourceProvider(row.providerKey),
      label: row.sourceLabel,
      url: row.sourceUrl,
      publishedAt: row.sourcePublishedAt.toISOString(),
      fixture: false,
    },
    title: {
      stage: "title",
      english: assertPublishedText(row.englishTitle, "english title"),
      korean: assertPublishedText(row.koreanTitle, "Korean title"),
      tokens: tokensFor("title"),
    },
    excerpt: {
      stage: "excerpt",
      english: assertPublishedText(row.englishExcerpt, "english excerpt"),
      korean: assertPublishedText(row.koreanExcerpt, "Korean excerpt"),
      tokens: tokensFor("excerpt"),
    },
  };
}

export async function listArchiveDates(): Promise<string[]> {
  if (isFixtureRuntime()) return listFixtureArchiveDates();

  const rows = await getDatabase()
    .selectDistinct({ learningDate: dailyLessons.learningDate })
    .from(dailyLessons)
    .where(eq(dailyLessons.status, "published"))
    .orderBy(desc(dailyLessons.learningDate))
    .limit(90);

  return rows.map((row) => row.learningDate);
}
