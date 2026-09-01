import "server-only";

import { redditTopicRuns, redditTopics } from "@newsorder/db/schema";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { connection } from "next/server";

import {
  REDDIT_COMMUNITIES,
  type RedditCommunitySlug,
} from "@/features/reddit/topics";
import { getDatabase, hasDatabase } from "@/server/db";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

export type RedditLearningExpression = {
  phrase: string;
  meaning: string;
};

export type PublicRedditLearningTopic = {
  id: string;
  rank: number;
  koreanTitle: string;
  koreanSummary: string;
  keywords: string[];
  englishTitle: string;
  koreanTitleTranslation: string;
  englishPassage: string;
  koreanTranslation: string;
  expressions: RedditLearningExpression[];
  wordMeanings: Record<string, string>;
  supportingPostCount: number;
};

export type PublicRedditLearningCommunity = {
  slug: RedditCommunitySlug;
  sourceUrl: string;
  analyzedPostCount: number;
  topics: PublicRedditLearningTopic[];
};

export type PublicRedditLearningDigest = {
  collectionDate: string;
  communities: PublicRedditLearningCommunity[];
};

export type PublicRedditLearningLesson = {
  collectionDate: string;
  community: RedditCommunitySlug;
  sourceUrl: string;
  topic: PublicRedditLearningTopic;
  position: number;
  total: number;
  previousTopicId: string | null;
  nextTopicId: string | null;
};

const fixtureTopic: PublicRedditLearningTopic = {
  id: "fixture-reddit-topic-1",
  rank: 1,
  koreanTitle: "짧은 학습과 빠른 피드백",
  koreanSummary:
    "짧은 학습 단위와 즉각적인 피드백이 집중력을 높인다는 의견이 이어졌습니다.",
  keywords: ["learning", "feedback", "focus"],
  englishTitle: "Short lessons can make feedback more useful",
  koreanTitleTranslation: "짧은 수업은 피드백을 더 유용하게 만들 수 있다",
  englishPassage:
    "Learners often stay focused when a lesson has one clear goal. Short activities also make feedback easier to understand and apply. Instead of waiting until the end of a long session, students can adjust their approach after each small step.",
  koreanTranslation:
    "학습자는 수업에 하나의 분명한 목표가 있을 때 집중력을 유지하기 쉽습니다. 짧은 활동은 피드백을 이해하고 적용하기도 더 쉽게 만듭니다. 긴 학습이 끝날 때까지 기다리지 않고 작은 단계마다 접근 방식을 조정할 수 있습니다.",
  expressions: [
    { phrase: "stay focused", meaning: "집중을 유지하다" },
    { phrase: "adjust an approach", meaning: "접근 방식을 조정하다" },
  ],
  wordMeanings: {
    learners: "학습자들",
    often: "자주",
    stay: "유지하다",
    focused: "집중한",
    when: "~할 때",
    a: "하나의, 어떤",
    lesson: "수업, 학습",
    has: "가지고 있다",
    one: "하나",
    clear: "분명한",
    goal: "목표",
    short: "짧은",
    activities: "활동들",
    also: "또한",
    make: "만들다",
    feedback: "피드백",
    easier: "더 쉬운",
    to: "~하기 위해",
    understand: "이해하다",
    and: "그리고",
    apply: "적용하다",
  },
  supportingPostCount: 11,
};

function fixtureDigest(): PublicRedditLearningDigest {
  return {
    collectionDate: new Date().toISOString().slice(0, 10),
    communities: [
      {
        slug: "Frontend",
        sourceUrl: "https://www.reddit.com/r/Frontend/",
        analyzedPostCount: 24,
        topics: [fixtureTopic],
      },
    ],
  };
}

function shouldUseFixtureDigest() {
  return (
    isFixtureRuntime() &&
    (!hasDatabase() || !getServerEnv().REDDIT_TOPICS_ENABLED)
  );
}

function communityForRun(redditPostId: string, threadUrl: string) {
  const key = redditPostId.startsWith("subreddit:")
    ? redditPostId.slice("subreddit:".length)
    : "";
  return REDDIT_COMMUNITIES.find(
    (community) =>
      community.slug.toLowerCase() === key.toLowerCase() ||
      threadUrl.toLowerCase().includes(`/r/${community.slug.toLowerCase()}/`),
  );
}

function toPublicTopic(row: typeof redditTopics.$inferSelect) {
  if (
    !row.englishTitle ||
    !row.englishPassage ||
    !row.koreanTranslation ||
    !row.expressions
  ) {
    return null;
  }
  return {
    id: row.id,
    rank: row.rank,
    koreanTitle: row.title,
    koreanSummary: row.summary,
    keywords: row.keywords,
    englishTitle: row.englishTitle,
    koreanTitleTranslation: row.koreanTitleTranslation ?? row.title,
    englishPassage: row.englishPassage,
    koreanTranslation: row.koreanTranslation,
    expressions: row.expressions,
    wordMeanings: row.wordMeanings ?? {},
    supportingPostCount: row.supportingCommentCount,
  } satisfies PublicRedditLearningTopic;
}

export async function getLatestRedditLearningDigest(): Promise<PublicRedditLearningDigest | null> {
  await connection();
  if (shouldUseFixtureDigest()) return fixtureDigest();

  const runs = await getDatabase()
    .select()
    .from(redditTopicRuns)
    .where(eq(redditTopicRuns.status, "succeeded"))
    .orderBy(
      desc(redditTopicRuns.collectionDate),
      desc(redditTopicRuns.startedAt),
    )
    .limit(32);
  const collectionDate = runs[0]?.collectionDate;
  if (!collectionDate) return null;

  const dailyRuns = runs.filter((run) => run.collectionDate === collectionDate);
  const topics = await getDatabase()
    .select()
    .from(redditTopics)
    .where(
      and(
        inArray(
          redditTopics.runId,
          dailyRuns.map((run) => run.id),
        ),
        isNotNull(redditTopics.englishPassage),
      ),
    )
    .orderBy(asc(redditTopics.rank));

  const communities: PublicRedditLearningCommunity[] = dailyRuns
    .flatMap((run) => {
      const community = communityForRun(run.redditPostId, run.threadUrl);
      if (!community) return [];
      const publicTopics = topics
        .filter((topic) => topic.runId === run.id)
        .map(toPublicTopic)
        .filter((topic): topic is PublicRedditLearningTopic => Boolean(topic));
      if (publicTopics.length === 0) return [];
      return [
        {
          slug: community.slug,
          sourceUrl: community.url,
          analyzedPostCount: run.analyzedCommentCount,
          topics: publicTopics,
        } satisfies PublicRedditLearningCommunity,
      ];
    })
    .sort(
      (left, right) =>
        REDDIT_COMMUNITIES.findIndex((item) => item.slug === left.slug) -
        REDDIT_COMMUNITIES.findIndex((item) => item.slug === right.slug),
    );

  return communities.length > 0 ? { collectionDate, communities } : null;
}

export async function getRedditLearningLesson(
  topicId: string,
): Promise<PublicRedditLearningLesson | null> {
  await connection();
  if (shouldUseFixtureDigest()) {
    if (topicId !== fixtureTopic.id) return null;
    return {
      collectionDate: fixtureDigest().collectionDate,
      community: "Frontend",
      sourceUrl: "https://www.reddit.com/r/Frontend/",
      topic: fixtureTopic,
      position: 1,
      total: 1,
      previousTopicId: null,
      nextTopicId: null,
    };
  }

  const rows = await getDatabase()
    .select({ topic: redditTopics, run: redditTopicRuns })
    .from(redditTopics)
    .innerJoin(redditTopicRuns, eq(redditTopics.runId, redditTopicRuns.id))
    .where(
      and(
        eq(redditTopics.id, topicId),
        eq(redditTopicRuns.status, "succeeded"),
        isNotNull(redditTopics.englishPassage),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const community = communityForRun(row.run.redditPostId, row.run.threadUrl);
  const topic = toPublicTopic(row.topic);
  if (!community || !topic) return null;

  const siblings = await getDatabase()
    .select({ id: redditTopics.id })
    .from(redditTopics)
    .where(
      and(
        eq(redditTopics.runId, row.run.id),
        isNotNull(redditTopics.englishPassage),
      ),
    )
    .orderBy(asc(redditTopics.rank));
  const position = siblings.findIndex((item) => item.id === topicId);

  return {
    collectionDate: row.run.collectionDate,
    community: community.slug,
    sourceUrl: community.url,
    topic,
    position: position + 1,
    total: siblings.length,
    previousTopicId: position > 0 ? (siblings[position - 1]?.id ?? null) : null,
    nextTopicId:
      position >= 0 && position < siblings.length - 1
        ? (siblings[position + 1]?.id ?? null)
        : null,
  };
}
