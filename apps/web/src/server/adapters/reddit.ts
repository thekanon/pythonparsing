import "server-only";

import { z } from "zod";

import type { RedditCommunitySlug } from "@/features/reddit/topics";

const scrapedCommunitySchema = z
  .object({
    source: z.string().trim().min(1),
    canonicalUrl: z.url(),
    title: z.string().trim().min(1).max(120),
    availableItemCount: z.number().int().nonnegative().max(100),
    items: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(80),
            body: z.string().trim().min(1).max(1_600),
            score: z.number().finite(),
            createdUtc: z.number().finite().nonnegative(),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

type ScraperCredentials = {
  scraperUrl: string;
  secret: string;
};

export async function fetchRedditCommunity(
  source: RedditCommunitySlug,
  credentials: ScraperCredentials,
) {
  const url = new URL(credentials.scraperUrl);
  url.searchParams.set("subreddit", source);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`REDDIT_SCRAPER_${response.status}`);

  const payload = scrapedCommunitySchema.parse(await response.json());
  if (payload.source.toLowerCase() !== source.toLowerCase()) {
    throw new Error("REDDIT_SCRAPER_SOURCE_MISMATCH");
  }

  return {
    title: payload.title,
    canonicalUrl: payload.canonicalUrl,
    availableCommentCount: payload.availableItemCount,
    comments: payload.items,
  };
}
