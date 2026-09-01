import * as Sentry from "@sentry/nextjs";

import { parseRedditCommunity } from "@/features/reddit/topics";
import { isAuthorizedCronRequest } from "@/server/cron";
import { toKstDateString } from "@/server/domain/date";
import { runDailyRedditTopics } from "@/server/services/reddit-topics";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ subreddit: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { subreddit } = await context.params;
  const community = parseRedditCommunity(subreddit);
  if (!community) {
    return Response.json(
      { error: "REDDIT_SOURCE_NOT_ALLOWED" },
      { status: 404 },
    );
  }

  const collectionDate = toKstDateString();
  const result = await runDailyRedditTopics(collectionDate, community.slug);
  if (result.status === "failed") {
    Sentry.captureMessage("REDDIT_TOPIC_COLLECTION_FAILED", {
      level: "error",
      tags: {
        job: "reddit-topics",
        source: community.slug,
        status: result.status,
      },
      extra: { collectionDate, errorCode: result.errorCode ?? null },
    });
  }

  return Response.json(
    { collectionDate, source: community.slug, ...result },
    { status: result.status === "failed" ? 500 : 200 },
  );
}
