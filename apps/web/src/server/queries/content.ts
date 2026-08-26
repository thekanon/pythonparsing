import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type {
  LessonContent,
  LessonSummary,
  PublicLesson,
} from "@/features/lessons/types";
import { fisherYates, seededRandom } from "@/features/lessons/tokenize";
import {
  findLesson,
  listArchiveDates,
  listLessonsByDate,
} from "@/server/repositories/content";

export async function getLessonsForDate(
  date: string,
): Promise<LessonSummary[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });
  cacheTag(`lessons:date:${date}`, "archive", "content:public");
  return listLessonsByDate(date);
}

export async function getCachedLesson(
  lessonId: string,
): Promise<LessonContent | null> {
  "use cache";
  cacheLife({ stale: 900, revalidate: 3_600, expire: 604_800 });
  cacheTag(`lesson:${lessonId}`, "content:public");
  return findLesson(lessonId);
}

export async function getCachedArchiveDates(): Promise<string[]> {
  "use cache";
  cacheLife({ stale: 3_600, revalidate: 21_600, expire: 604_800 });
  cacheTag("archive", "content:public");
  return listArchiveDates();
}

export function toPublicLesson(lesson: LessonContent): PublicLesson {
  const publicStage = (
    stage: LessonContent["title"] | LessonContent["excerpt"],
  ) => ({
    stage: stage.stage,
    english: stage.english,
    tokens: fisherYates(
      stage.tokens,
      seededRandom(`${lesson.id}:${stage.stage}`),
    ).map((token) => ({
      id: token.id,
      text: token.text,
    })),
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
