import { z } from "zod";

import { extractEnglishWords } from "@/features/lessons/english-words";

export type RedditComment = {
  id: string;
  body: string;
  score: number;
  createdUtc: number;
};

export type SelectedRedditComment = RedditComment & { index: number };

export const REDDIT_COMMUNITIES = [
  { slug: "Frontend", url: "https://www.reddit.com/r/Frontend/" },
  { slug: "SideProject", url: "https://www.reddit.com/r/SideProject/" },
  { slug: "ChatGPT", url: "https://www.reddit.com/r/ChatGPT/" },
  { slug: "ObsidianMD", url: "https://www.reddit.com/r/ObsidianMD/" },
] as const;

export type RedditCommunitySlug = (typeof REDDIT_COMMUNITIES)[number]["slug"];

export function parseRedditCommunity(
  value: string,
): (typeof REDDIT_COMMUNITIES)[number] | null {
  const normalized = value.trim().toLowerCase();
  return (
    REDDIT_COMMUNITIES.find(
      (community) => community.slug.toLowerCase() === normalized,
    ) ?? null
  );
}

export const redditTopicSummarySchema = z
  .object({
    topics: z
      .array(
        z
          .object({
            title: z.string().trim().min(2).max(80),
            summary: z.string().trim().min(10).max(320),
            keywords: z.array(z.string().trim().min(1).max(30)).min(2).max(6),
            englishTitle: z.string().trim().min(8).max(120),
            koreanTitleTranslation: z.string().trim().min(4).max(180),
            englishPassage: z.string().trim().min(80).max(720),
            koreanTranslation: z.string().trim().min(30).max(900),
            expressions: z
              .array(
                z
                  .object({
                    phrase: z.string().trim().min(2).max(80),
                    meaning: z.string().trim().min(2).max(100),
                  })
                  .strict(),
              )
              .min(2)
              .max(5),
            vocabulary: z
              .array(
                z
                  .object({
                    word: z.string().trim().min(1).max(48),
                    meaning: z.string().trim().min(1).max(100),
                  })
                  .strict(),
              )
              .min(10)
              .max(100),
            supportingCommentIndexes: z
              .array(z.number().int().min(0).max(119))
              .min(1)
              .max(120),
          })
          .strict(),
      )
      .min(1)
      .max(7),
  })
  .strict();

export type RedditTopicSummary = z.infer<typeof redditTopicSummarySchema>;

export const redditTopicJsonSchema = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          keywords: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string" },
          },
          englishTitle: { type: "string" },
          koreanTitleTranslation: { type: "string" },
          englishPassage: { type: "string" },
          koreanTranslation: { type: "string" },
          expressions: {
            type: "array",
            minItems: 2,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                phrase: { type: "string" },
                meaning: { type: "string" },
              },
              required: ["phrase", "meaning"],
              additionalProperties: false,
            },
          },
          vocabulary: {
            type: "array",
            minItems: 10,
            maxItems: 100,
            items: {
              type: "object",
              properties: {
                word: { type: "string" },
                meaning: { type: "string" },
              },
              required: ["word", "meaning"],
              additionalProperties: false,
            },
          },
          supportingCommentIndexes: {
            type: "array",
            minItems: 1,
            maxItems: 120,
            items: { type: "integer" },
          },
        },
        required: [
          "title",
          "summary",
          "keywords",
          "englishTitle",
          "koreanTitleTranslation",
          "englishPassage",
          "koreanTranslation",
          "expressions",
          "vocabulary",
          "supportingCommentIndexes",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["topics"],
  additionalProperties: false,
} as const;

export function parseRedditThreadId(input: string): string | null {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    let candidate: string | undefined;

    if (host === "redd.it") {
      candidate = parts[0];
    } else if (
      host === "reddit.com" ||
      host === "www.reddit.com" ||
      host === "old.reddit.com"
    ) {
      const commentsIndex = parts.indexOf("comments");
      candidate = commentsIndex >= 0 ? parts[commentsIndex + 1] : undefined;
    }

    return candidate && /^[a-z0-9]{5,16}$/i.test(candidate)
      ? candidate.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function normalizeCommentBody(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim().slice(0, 600);
}

export function selectRedditComments(
  comments: RedditComment[],
  maximumComments = 120,
  maximumCharacters = 18_000,
): SelectedRedditComment[] {
  const selected: SelectedRedditComment[] = [];
  let characterCount = 0;

  const eligible = comments
    .map((comment) => ({
      ...comment,
      body: normalizeCommentBody(comment.body),
    }))
    .filter(
      (comment) =>
        comment.body.length >= 12 &&
        comment.body !== "[deleted]" &&
        comment.body !== "[removed]",
    )
    .sort((left, right) => right.score - left.score);

  for (const comment of eligible) {
    if (selected.length >= maximumComments) break;
    if (characterCount + comment.body.length > maximumCharacters) continue;
    selected.push({ ...comment, index: selected.length });
    characterCount += comment.body.length;
  }

  return selected;
}

export function materializeTopics(summary: RedditTopicSummary) {
  return summary.topics.map((topic, index) => {
    const wordMeanings = Object.fromEntries(
      topic.vocabulary.map((entry) => [
        entry.word.toLowerCase(),
        entry.meaning,
      ]),
    );
    const missingWords = new Set(
      extractEnglishWords(
        `${topic.englishTitle} ${topic.englishPassage}`,
      ).filter((word) => !wordMeanings[word]),
    );
    if (missingWords.size > 0) {
      throw new Error("REDDIT_TOPIC_VOCABULARY_INCOMPLETE");
    }
    return {
      rank: index + 1,
      title: topic.title,
      summary: topic.summary,
      keywords: [...new Set(topic.keywords)],
      englishTitle: topic.englishTitle,
      koreanTitleTranslation: topic.koreanTitleTranslation,
      englishPassage: topic.englishPassage,
      koreanTranslation: topic.koreanTranslation,
      expressions: topic.expressions,
      wordMeanings,
      supportingCommentCount: new Set(topic.supportingCommentIndexes).size,
    };
  });
}
