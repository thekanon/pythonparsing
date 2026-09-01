import "server-only";

import {
  adminAuditLogs,
  articleRevisions,
  articles,
  backupRuns,
  contentSources,
  ingestionItems,
  ingestionRuns,
  redditTopicRuns,
  redditTopics,
  translationReports,
  users,
} from "@newsorder/db/schema";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/server/db";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

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

export async function getAdminRedditTopicRuns() {
  await connection();
  if (isFixtureRuntime() && !getServerEnv().REDDIT_TOPICS_ENABLED) {
    return [
      {
        id: "fixture-reddit-run",
        collectionDate: new Date().toISOString().slice(0, 10),
        threadUrl: "https://www.reddit.com/r/example/comments/fixture/daily/",
        postTitle: "Sentence Reddit topic fixture",
        status: "succeeded" as const,
        availableCommentCount: 31,
        analyzedCommentCount: 24,
        topicCount: 3,
        model: "fixture-topic-summarizer",
        errorCode: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        topics: [
          {
            id: "fixture-topic-1",
            rank: 1,
            title: "학습 흐름 개선 의견",
            summary:
              "사용자들은 짧은 학습 단위와 즉각적인 피드백을 가장 많이 논의했습니다.",
            keywords: ["학습", "피드백", "진도"],
            englishTitle: "Short lessons can make feedback more useful",
            koreanTitleTranslation:
              "짧은 수업은 피드백을 더 유용하게 만들 수 있다",
            englishPassage:
              "Learners often stay focused when a lesson has one clear goal. Short activities also make feedback easier to understand and apply. Instead of waiting until the end of a long session, students can adjust their approach after each small step.",
            koreanTranslation:
              "학습자는 수업에 하나의 분명한 목표가 있을 때 집중력을 유지하기 쉽습니다. 짧은 활동은 피드백을 이해하고 적용하기도 더 쉽게 만듭니다. 긴 학습이 끝날 때까지 기다리지 않고 작은 단계마다 접근 방식을 조정할 수 있습니다.",
            expressions: [
              { phrase: "stay focused", meaning: "집중을 유지하다" },
              { phrase: "adjust an approach", meaning: "접근 방식을 조정하다" },
            ],
            supportingCommentCount: 11,
          },
          {
            id: "fixture-topic-2",
            rank: 2,
            title: "모바일 사용성",
            summary:
              "작은 화면에서 카드와 어절 조작을 더 단순하게 만들자는 의견이 이어졌습니다.",
            keywords: ["모바일", "카드", "터치"],
            englishTitle: "Mobile learning needs simpler touch controls",
            koreanTitleTranslation:
              "모바일 학습에는 더 단순한 터치 조작이 필요하다",
            englishPassage:
              "Small screens leave little room for complicated controls. Learners need large touch targets, clear labels, and actions that are easy to undo. A simpler interface helps people focus on the language instead of learning how the interface works.",
            koreanTranslation:
              "작은 화면에는 복잡한 조작을 위한 공간이 거의 없습니다. 학습자는 큰 터치 영역, 명확한 라벨, 쉽게 되돌릴 수 있는 동작이 필요합니다. 단순한 인터페이스는 사용법 대신 언어에 집중하도록 돕습니다.",
            expressions: [
              {
                phrase: "leave little room for",
                meaning: "~할 여지를 거의 남기지 않다",
              },
              { phrase: "focus on", meaning: "~에 집중하다" },
            ],
            supportingCommentCount: 8,
          },
          {
            id: "fixture-topic-3",
            rank: 3,
            title: "뉴스 출처 다양화",
            summary:
              "현재 형식을 유지하면서 여러 공개 뉴스 출처를 검토하자는 논의가 있었습니다.",
            keywords: ["뉴스", "출처", "콘텐츠"],
            englishTitle: "More news sources can broaden daily study",
            koreanTitleTranslation:
              "더 다양한 뉴스 출처는 매일의 학습 범위를 넓힐 수 있다",
            englishPassage:
              "Using several public news sources can expose learners to different subjects and writing styles. The format should remain consistent so that the learning process still feels familiar. Source rules and attribution also need careful review before new material is added.",
            koreanTranslation:
              "여러 공개 뉴스 출처를 사용하면 학습자가 다양한 주제와 문체를 접할 수 있습니다. 학습 과정이 계속 익숙하게 느껴지도록 형식은 일관되게 유지해야 합니다. 새 자료를 추가하기 전에는 출처 규정과 출처 표시도 신중히 검토해야 합니다.",
            expressions: [
              { phrase: "expose A to B", meaning: "A가 B를 접하게 하다" },
              { phrase: "remain consistent", meaning: "일관되게 유지되다" },
            ],
            supportingCommentCount: 5,
          },
        ],
      },
    ];
  }

  const runs = await getDatabase()
    .select()
    .from(redditTopicRuns)
    .orderBy(desc(redditTopicRuns.startedAt))
    .limit(14);
  if (runs.length === 0) return [];

  const topics = await getDatabase()
    .select()
    .from(redditTopics)
    .where(
      inArray(
        redditTopics.runId,
        runs.map((run) => run.id),
      ),
    )
    .orderBy(asc(redditTopics.rank));

  return runs.map((run) => ({
    ...run,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    topics: topics.filter((topic) => topic.runId === run.id),
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
