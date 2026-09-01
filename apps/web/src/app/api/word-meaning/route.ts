import { z } from "zod";

import { findPublicDomainBookLesson } from "@/features/books/catalog";
import { extractEnglishWords } from "@/features/lessons/english-words";
import { GoogleTranslationAdapter } from "@/server/adapters/translation";
import { toKstDateString } from "@/server/domain/date";
import { getServerEnv, isFixtureRuntime } from "@/server/env";
import { findBookPracticeSentence } from "@/server/book-practice";
import { getCachedLesson } from "@/server/queries/content";
import { getRedditLearningLesson } from "@/server/queries/reddit-learning";
import { findPublicDomainBookSection } from "@/server/book-reader";
import { getBookWordMeaning } from "@/server/repositories/book-word-meanings";
import { getFixtureWordMeaning } from "@/server/repositories/fixture-word-meanings";
import { reserveTranslationUsage } from "@/server/services/ingestion";

const querySchema = z.object({
  lessonId: z.string().trim().min(1).max(100),
  source: z.enum(["lesson", "reddit", "book", "book-reader", "book-practice"]),
  stage: z.enum(["title", "excerpt"]),
  word: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[A-Za-z]+(?:['-][A-Za-z]+)*$/)
    .transform((word) => word.toLowerCase()),
});

const meaningCache = new Map<string, string>();

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control":
        status === 200
          ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000"
          : "no-store",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    lessonId: url.searchParams.get("lessonId"),
    source: url.searchParams.get("source") ?? "lesson",
    stage: url.searchParams.get("stage"),
    word: url.searchParams.get("word"),
  });
  if (!parsed.success) return json({ error: "INVALID_WORD" }, 400);

  const { lessonId, source, stage, word } = parsed.data;
  const redditLesson =
    source === "reddit" ? await getRedditLearningLesson(lessonId) : null;
  const bookLesson =
    source === "book" ? findPublicDomainBookLesson(lessonId) : null;
  const bookReaderSection =
    source === "book-reader" ? findPublicDomainBookSection(lessonId) : null;
  const bookPracticeSentence =
    source === "book-practice" ? findBookPracticeSentence(lessonId) : null;
  const learningText = redditLesson
    ? stage === "title"
      ? redditLesson.topic.englishTitle
      : redditLesson.topic.englishPassage
    : bookLesson
      ? stage === "title"
        ? bookLesson.lesson.englishTitle
        : bookLesson.lesson.englishPassage
      : bookReaderSection
        ? stage === "title"
          ? bookReaderSection.section.englishTitle
          : bookReaderSection.section.paragraphs.join(" ")
        : bookPracticeSentence
          ? bookPracticeSentence.sentence.english
          : source === "lesson"
            ? await getCachedLesson(lessonId).then(
                (lesson) => lesson?.[stage].english ?? null,
              )
            : null;
  if (!learningText) return json({ error: "LESSON_NOT_FOUND" }, 404);

  const stageWords = new Set(extractEnglishWords(learningText));
  if (!stageWords.has(word)) {
    return json({ error: "WORD_NOT_IN_LESSON" }, 400);
  }

  const cacheKey = `${source}:${lessonId}:${stage}:${word}`;
  const cached = meaningCache.get(cacheKey);
  if (cached) return json({ word, meaning: cached });
  const storedMeaning =
    redditLesson?.topic.wordMeanings[word] ??
    (bookLesson || bookReaderSection || bookPracticeSentence
      ? getBookWordMeaning(word)
      : null);
  if (storedMeaning) {
    meaningCache.set(cacheKey, storedMeaning);
    return json({ word, meaning: storedMeaning });
  }

  try {
    let meaning: string | null;
    const env = getServerEnv();
    if (
      isFixtureRuntime() &&
      (source === "lesson" || !env.GOOGLE_CLOUD_PROJECT)
    ) {
      meaning = getFixtureWordMeaning(word);
    } else {
      await reserveTranslationUsage(toKstDateString(), Array.from(word).length);
      meaning = await new GoogleTranslationAdapter(
        env.GOOGLE_CLOUD_PROJECT!,
        env.GOOGLE_CLOUD_LOCATION,
      ).translateWord(word);
    }

    if (!meaning) return json({ error: "MEANING_NOT_FOUND" }, 404);
    if (meaningCache.size >= 2_000) meaningCache.clear();
    meaningCache.set(cacheKey, meaning);
    return json({ word, meaning });
  } catch (error) {
    if (error instanceof Error && error.message === "TRANSLATION_QUOTA_GUARD") {
      return json({ error: "LOOKUP_LIMIT_REACHED" }, 503);
    }
    return json({ error: "LOOKUP_FAILED" }, 502);
  }
}
