import "server-only";

import {
  adminAuditLogs,
  articleRevisions,
  articles,
  backupRuns,
  contentSources,
  ingestionItems,
  ingestionRuns,
  translationReports,
  users,
} from "@newsorder/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/server/db";
import { isFixtureRuntime } from "@/server/env";

export async function getAdminOverview() {
  await connection();
  if (isFixtureRuntime()) {
    return {
      sourceEnabled: true,
      quarantineCount: 0,
      openReportCount: 0,
      lastRun: {
        status: "succeeded",
        learningDate: new Date().toISOString().slice(0, 10),
        publishedCount: 10,
        finishedAt: new Date().toISOString(),
      },
      lastBackup: null,
      fixture: true,
    };
  }

  const [source, quarantine, reports, runs, backups] = await Promise.all([
    getDatabase()
      .select({ enabled: contentSources.enabled })
      .from(contentSources)
      .where(eq(contentSources.providerKey, "bbc"))
      .limit(1),
    getDatabase()
      .select({ count: count() })
      .from(ingestionItems)
      .where(eq(ingestionItems.status, "quarantined")),
    getDatabase()
      .select({ count: count() })
      .from(translationReports)
      .where(eq(translationReports.status, "open")),
    getDatabase()
      .select({
        status: ingestionRuns.status,
        learningDate: ingestionRuns.learningDate,
        publishedCount: ingestionRuns.publishedCount,
        finishedAt: ingestionRuns.finishedAt,
      })
      .from(ingestionRuns)
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(1),
    getDatabase()
      .select({
        status: backupRuns.status,
        finishedAt: backupRuns.finishedAt,
        errorCode: backupRuns.errorCode,
      })
      .from(backupRuns)
      .orderBy(desc(backupRuns.startedAt))
      .limit(1),
  ]);

  return {
    sourceEnabled: source[0]?.enabled ?? false,
    quarantineCount: quarantine[0]?.count ?? 0,
    openReportCount: reports[0]?.count ?? 0,
    lastRun: runs[0]
      ? {
          ...runs[0],
          finishedAt: runs[0].finishedAt?.toISOString() ?? null,
        }
      : null,
    lastBackup: backups[0]
      ? {
          ...backups[0],
          finishedAt: backups[0].finishedAt?.toISOString() ?? null,
        }
      : null,
    fixture: false,
  };
}

export async function getAdminIngestionRuns() {
  await connection();
  if (isFixtureRuntime()) {
    return [
      {
        id: "fixture-run",
        learningDate: new Date().toISOString().slice(0, 10),
        status: "succeeded",
        discoveredCount: 10,
        translatedCount: 10,
        approvedCount: 10,
        quarantinedCount: 0,
        publishedCount: 10,
        warningCode: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      },
    ];
  }

  const rows = await getDatabase()
    .select()
    .from(ingestionRuns)
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(30);
  return rows.map((row) => ({
    ...row,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  }));
}

export async function getAdminQuarantine() {
  await connection();
  if (isFixtureRuntime()) return [];

  const rows = await getDatabase()
    .select({
      itemId: ingestionItems.id,
      revisionId: articleRevisions.id,
      englishTitle: articleRevisions.englishTitle,
      englishExcerpt: articleRevisions.englishExcerpt,
      koreanTitle: articleRevisions.koreanTitle,
      koreanExcerpt: articleRevisions.koreanExcerpt,
      errorCode: ingestionItems.errorCode,
      retryCount: ingestionItems.retryCount,
      createdAt: ingestionItems.createdAt,
    })
    .from(ingestionItems)
    .leftJoin(
      articleRevisions,
      eq(ingestionItems.revisionId, articleRevisions.id),
    )
    .where(eq(ingestionItems.status, "quarantined"))
    .orderBy(desc(ingestionItems.createdAt))
    .limit(50);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminUsers() {
  await connection();
  if (isFixtureRuntime()) {
    return [
      {
        id: "fixture-admin",
        name: "로컬 관리자",
        email: "admin@fixture.invalid",
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const rows = await getDatabase()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminReports() {
  await connection();
  if (isFixtureRuntime()) return [];

  const rows = await getDatabase()
    .select({
      id: translationReports.id,
      type: translationReports.type,
      status: translationReports.status,
      createdAt: translationReports.createdAt,
      revisionId: translationReports.revisionId,
      englishTitle: articleRevisions.englishTitle,
      sourceUrl: articles.canonicalUrl,
    })
    .from(translationReports)
    .innerJoin(
      articleRevisions,
      eq(translationReports.revisionId, articleRevisions.id),
    )
    .innerJoin(articles, eq(articleRevisions.articleId, articles.id))
    .orderBy(desc(translationReports.createdAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminAuditLogs() {
  await connection();
  if (isFixtureRuntime()) return [];
  const rows = await getDatabase()
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.performedAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    performedAt: row.performedAt.toISOString(),
  }));
}
