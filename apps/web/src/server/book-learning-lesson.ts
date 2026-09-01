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
import type { PublicDomainBookLessonView } from "@/features/books/catalog";

export function createBookCanonicalLesson(
  view: PublicDomainBookLessonView,
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
      (position) => `book-${view.lesson.id}-${stage}-${position}`,
    ),
  });

  return {
    id: view.lesson.id,
    revisionId: `${view.lesson.id}-v1`,
    learningDate: `${view.book.publicationYear}-01-01`,
    ordinal: view.position,
    source: {
      provider: "Project Gutenberg",
      label: view.book.englishTitle,
      url: view.book.gutenbergUrl,
      publishedAt: `${view.book.publicationYear}-01-01T00:00:00Z`,
      fixture: false,
    },
    title: createStage(
      "title",
      view.lesson.englishTitle,
      view.lesson.koreanTitle,
    ),
    excerpt: createStage(
      "excerpt",
      view.lesson.englishPassage,
      view.lesson.koreanTranslation,
    ),
  };
}

export function toPublicBookLesson(lesson: LessonContent): PublicLesson {
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
