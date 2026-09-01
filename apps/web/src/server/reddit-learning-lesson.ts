import "server-only";

import type {
  LessonContent,
  LessonStage,
  PublicLesson,
} from "@/features/lessons/types";
import {
  fisherYates,
  seededRandom,
  tokenizeKorean,
} from "@/features/lessons/tokenize";
import type { PublicRedditLearningLesson } from "@/server/queries/reddit-learning";

export function firstSentence(value: string) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  const match = normalized.match(/^.*?[.!?](?=\s|$)/u);
  return match?.[0] ?? normalized;
}

export function createRedditCanonicalLesson(
  lesson: PublicRedditLearningLesson,
): LessonContent {
  const createStage = (
    stage: LessonStage,
    english: string,
    korean: string,
  ) => ({
    stage,
    english,
    korean,
    tokens: tokenizeKorean(
      korean,
      (position) => `reddit-${lesson.topic.id}-${stage}-${position}`,
    ),
  });

  return {
    id: lesson.topic.id,
    revisionId: lesson.topic.id,
    learningDate: lesson.collectionDate,
    ordinal: lesson.position,
    source: {
      provider: "Reddit",
      label: `r/${lesson.community}`,
      url: lesson.sourceUrl,
      publishedAt: `${lesson.collectionDate}T00:00:00+09:00`,
      fixture: false,
    },
    title: createStage(
      "title",
      lesson.topic.englishTitle,
      lesson.topic.koreanTitleTranslation,
    ),
    excerpt: createStage(
      "excerpt",
      firstSentence(lesson.topic.englishPassage),
      firstSentence(lesson.topic.koreanTranslation),
    ),
  };
}

export function toPublicRedditLesson(lesson: LessonContent): PublicLesson {
  const publicStage = (
    stage: LessonContent["title"] | LessonContent["excerpt"],
  ) => ({
    stage: stage.stage,
    english: stage.english,
    tokens: fisherYates(
      stage.tokens,
      seededRandom(`${lesson.id}:${stage.stage}`),
    ).map(({ id, text }) => ({ id, text })),
  });

  return {
    id: lesson.id,
    revisionId: lesson.revisionId,
    learningDate: lesson.learningDate,
    ordinal: lesson.ordinal,
    source: lesson.source,
    stages: [publicStage(lesson.title), publicStage(lesson.excerpt)],
  };
}
