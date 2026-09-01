import "server-only";

import { redditTopicRuns, redditTopics } from "@newsorder/db/schema";
import { and, eq, lt } from "drizzle-orm";

import {
  materializeTopics,
  type RedditCommunitySlug,
  parseRedditCommunity,
  selectRedditComments,
} from "@/features/reddit/topics";
import { fetchRedditCommunity } from "@/server/adapters/reddit";
import {
  ClaudeCliRedditTopicAdapter,
  ClaudeThenCodexRedditTopicAdapter,
  CodexCliRedditTopicAdapter,
  GeminiRedditTopicAdapter,
  type RedditTopicSummarizer,
} from "@/server/adapters/reddit-topics";
import { getDatabase } from "@/server/db";
import { shiftIsoDate } from "@/server/domain/date";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

export type DailyRedditTopicResult = {
  status: "fixture" | "disabled" | "duplicate" | "succeeded" | "failed";
  topicCount: number;
  analyzedCommentCount: number;
  errorCode?: string | null;
};

function errorCode(error: unknown): string {
  if (!(error instanceof Error)) return "REDDIT_TOPIC_UNKNOWN_ERROR";
  if (error.message.startsWith("REDDIT_SCRAPER_")) return error.message;
  if (error.message.startsWith("REDDIT_")) return error.message;
  if (error.message.startsWith("GEMINI_")) return error.message;
  if (error.message.startsWith("CODEX_")) return error.message;
  if (error.message.startsWith("CLAUDE_")) return error.message;
  return "REDDIT_TOPIC_PROCESSING_FAILED";
}

function createSummarizer(): RedditTopicSummarizer {
  const env = getServerEnv();
  const codex = () =>
    new CodexCliRedditTopicAdapter(
      env.REDDIT_CODEX_CLI_PATH,
      env.REDDIT_CODEX_MODEL,
      env.REDDIT_CLI_TIMEOUT_MS,
    );
  const claude = () =>
    new ClaudeCliRedditTopicAdapter(
      env.REDDIT_CLAUDE_CLI_PATH,
      env.REDDIT_CLAUDE_MODEL,
      env.REDDIT_CLI_TIMEOUT_MS,
    );

  if (env.REDDIT_SUMMARIZER_PROVIDER === "claude-then-codex") {
    return new ClaudeThenCodexRedditTopicAdapter(claude(), codex());
  }
  if (env.REDDIT_SUMMARIZER_PROVIDER === "claude-cli") return claude();
  if (env.REDDIT_SUMMARIZER_PROVIDER === "codex-cli") return codex();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY_MISSING");
  return new GeminiRedditTopicAdapter(env.GEMINI_API_KEY, env.GEMINI_MODEL);
}

export async function runDailyRedditTopics(
  collectionDate: string,
  source: RedditCommunitySlug,
): Promise<DailyRedditTopicResult> {
  const env = getServerEnv();
  if (isFixtureRuntime() && !env.REDDIT_TOPICS_ENABLED) {
    return {
      status: "fixture",
      topicCount: 3,
      analyzedCommentCount: 24,
    };
  }

  const community = parseRedditCommunity(source);
  if (!community || !env.CRON_SECRET || !env.REDDIT_SCRAPER_URL) {
    return {
      status: "disabled",
      topicCount: 0,
      analyzedCommentCount: 0,
      errorCode: "REDDIT_TOPIC_NOT_CONFIGURED",
    };
  }

  const sourceKey = `subreddit:${community.slug.toLowerCase()}`;

  const created = await getDatabase().transaction(async (transaction) => {
    // A transient scraper or CLI failure may be retried on the same day. A
    // succeeded/running row remains protected by the daily unique constraint.
    await transaction
      .delete(redditTopicRuns)
      .where(
        and(
          eq(redditTopicRuns.collectionDate, collectionDate),
          eq(redditTopicRuns.redditPostId, sourceKey),
          eq(redditTopicRuns.status, "failed"),
        ),
      );
    return transaction
      .insert(redditTopicRuns)
      .values({
        collectionDate,
        redditPostId: sourceKey,
        threadUrl: community.url,
      })
      .onConflictDoNothing()
      .returning({ id: redditTopicRuns.id });
  });
  const runId = created[0]?.id;
  if (!runId) {
    return {
      status: "duplicate",
      topicCount: 0,
      analyzedCommentCount: 0,
    };
  }

  try {
    const thread = await fetchRedditCommunity(community.slug, {
      scraperUrl: env.REDDIT_SCRAPER_URL,
      secret: env.CRON_SECRET,
    });
    const selected = selectRedditComments(thread.comments);
    if (selected.length < 3) throw new Error("REDDIT_INSUFFICIENT_COMMENTS");

    const summarizer = createSummarizer();
    const summarized = await summarizer.summarize(thread.title, selected);
    const topics = materializeTopics(summarized);

    await getDatabase().transaction(async (transaction) => {
      await transaction.insert(redditTopics).values(
        topics.map((topic) => ({
          runId,
          ...topic,
        })),
      );
      await transaction
        .update(redditTopicRuns)
        .set({
          threadUrl: thread.canonicalUrl,
          postTitle: thread.title,
          status: "succeeded",
          availableCommentCount: thread.availableCommentCount,
          analyzedCommentCount: selected.length,
          topicCount: topics.length,
          model: summarizer.model,
          finishedAt: new Date(),
        })
        .where(eq(redditTopicRuns.id, runId));
      await transaction
        .delete(redditTopicRuns)
        .where(
          lt(redditTopicRuns.collectionDate, shiftIsoDate(collectionDate, -30)),
        );
    });

    return {
      status: "succeeded",
      topicCount: topics.length,
      analyzedCommentCount: selected.length,
    };
  } catch (error) {
    const code = errorCode(error);
    await getDatabase()
      .update(redditTopicRuns)
      .set({ status: "failed", errorCode: code, finishedAt: new Date() })
      .where(eq(redditTopicRuns.id, runId));
    return {
      status: "failed",
      topicCount: 0,
      analyzedCommentCount: 0,
      errorCode: code,
    };
  }
}
