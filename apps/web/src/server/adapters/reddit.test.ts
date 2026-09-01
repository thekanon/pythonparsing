import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditCommunity } from "./reddit";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRedditCommunity", () => {
  it("calls the allowlisted scraper with the internal bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          source: "Frontend",
          canonicalUrl: "https://www.reddit.com/r/Frontend/",
          title: "r/Frontend 오늘의 주요 게시물",
          availableItemCount: 3,
          items: [
            {
              id: "abcde1",
              body: "First useful post body",
              score: 3,
              createdUtc: 1,
            },
            {
              id: "abcde2",
              body: "Second useful post body",
              score: 2,
              createdUtc: 2,
            },
            {
              id: "abcde3",
              body: "Third useful post body",
              score: 1,
              createdUtc: 3,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditCommunity("Frontend", {
      scraperUrl: "https://newsorder.vercel.app/api/reddit-scrape",
      secret: "cron-secret",
    });

    expect(result.comments).toHaveLength(3);
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe(
      "https://newsorder.vercel.app/api/reddit-scrape?subreddit=Frontend",
    );
    expect(options.headers).toEqual({ Authorization: "Bearer cron-secret" });
  });

  it("rejects a mismatched source returned by the scraper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          source: "ChatGPT",
          canonicalUrl: "https://www.reddit.com/r/ChatGPT/",
          title: "r/ChatGPT 오늘의 주요 게시물",
          availableItemCount: 0,
          items: [],
        }),
      ),
    );

    await expect(
      fetchRedditCommunity("Frontend", {
        scraperUrl: "https://newsorder.vercel.app/api/reddit-scrape",
        secret: "cron-secret",
      }),
    ).rejects.toThrow("REDDIT_SCRAPER_SOURCE_MISMATCH");
  });
});
