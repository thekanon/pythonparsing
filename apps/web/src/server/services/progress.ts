import "server-only";

import {
  dailyLessons,
  progressMergeRequests,
  stageProgress,
} from "@newsorder/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import type { GradeResult, LessonStage } from "@/features/lessons/types";
import type { AnonymousProgress } from "@/features/progress/types";
import { getDatabase } from "@/server/db";

export async function recordAuthenticatedAttempt(
  userId: string,
  lessonId: string,
  stage: LessonStage,
  result: GradeResult,
  helped = false,
) {
  const completedAt = result.complete ? new Date() : null;

  await getDatabase()
    .insert(stageProgress)
    .values({
      userId,
      lessonId,
      stage,
      attempts: 1,
      bestPositionScore: result.score,
      completedAt,
      helped,
      lastAttemptAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        stageProgress.userId,
        stageProgress.lessonId,
        stageProgress.stage,
      ],
      set: {
        attempts: sql`least(10000, ${stageProgress.attempts} + 1)`,
        bestPositionScore: sql`greatest(${stageProgress.bestPositionScore}, ${result.score})`,
        completedAt: result.complete
          ? sql`coalesce(${stageProgress.completedAt}, now())`
          : stageProgress.completedAt,
        helped: helped ? true : stageProgress.helped,
        lastAttemptAt: new Date(),
      },
    });
}

export async function markAuthenticatedHelped(
  userId: string,
  lessonId: string,
  stage: LessonStage,
) {
  await getDatabase()
    .insert(stageProgress)
    .values({
      userId,
      lessonId,
      stage,
      attempts: 0,
      bestPositionScore: 100,
      completedAt: new Date(),
      helped: true,
      lastAttemptAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        stageProgress.userId,
        stageProgress.lessonId,
        stageProgress.stage,
      ],
      set: {
        completedAt: sql`coalesce(${stageProgress.completedAt}, now())`,
        helped: true,
        lastAttemptAt: new Date(),
      },
    });
}

export async function getAuthenticatedProgress(
  userId: string,
): Promise<AnonymousProgress> {
  const rows = await getDatabase()
    .select({
      lessonId: stageProgress.lessonId,
      stage: stageProgress.stage,
      attempts: stageProgress.attempts,
      bestScore: stageProgress.bestPositionScore,
      completedAt: stageProgress.completedAt,
      helped: stageProgress.helped,
      lastAttemptAt: stageProgress.lastAttemptAt,
    })
    .from(stageProgress)
    .where(eq(stageProgress.userId, userId));

  return {
    version: 1,
    stages: Object.fromEntries(
      rows.map((row) => [
        `${row.lessonId}:${row.stage}`,
        {
          attempts: row.attempts,
          bestScore: row.bestScore,
          completedAt: row.completedAt?.toISOString() ?? null,
          helped: row.helped,
          lastAttemptAt: row.lastAttemptAt.toISOString(),
        },
      ]),
    ),
  };
}

export async function mergeProgressForUser(
  userId: string,
  idempotencyId: string,
  incoming: AnonymousProgress,
): Promise<AnonymousProgress> {
  const entries = Object.entries(incoming.stages);
  const parsedEntries = entries.flatMap(([key, progress]) => {
    const separator = key.lastIndexOf(":");
    const lessonId = key.slice(0, separator);
    const stage = key.slice(separator + 1);
    return separator > 0 &&
      z.uuid().safeParse(lessonId).success &&
      (stage === "title" || stage === "excerpt")
      ? [{ lessonId, stage, progress } as const]
      : [];
  });
  const lessonIds = [...new Set(parsedEntries.map((entry) => entry.lessonId))];
  const validLessons =
    lessonIds.length === 0
      ? []
      : await getDatabase()
          .select({ id: dailyLessons.id })
          .from(dailyLessons)
          .where(inArray(dailyLessons.id, lessonIds));
  const validLessonIds = new Set(validLessons.map((lesson) => lesson.id));

  await getDatabase().transaction(async (transaction) => {
    const inserted = await transaction
      .insert(progressMergeRequests)
      .values({ id: idempotencyId, userId })
      .onConflictDoNothing()
      .returning({ id: progressMergeRequests.id });

    if (inserted.length === 0) return;

    for (const entry of parsedEntries) {
      if (!validLessonIds.has(entry.lessonId)) continue;
      const completedAt = entry.progress.completedAt
        ? new Date(entry.progress.completedAt)
        : null;
      const lastAttemptAt = new Date(entry.progress.lastAttemptAt);

      await transaction
        .insert(stageProgress)
        .values({
          userId,
          lessonId: entry.lessonId,
          stage: entry.stage,
          attempts: entry.progress.attempts,
          bestPositionScore: entry.progress.bestScore,
          completedAt,
          helped: entry.progress.helped,
          lastAttemptAt,
        })
        .onConflictDoUpdate({
          target: [
            stageProgress.userId,
            stageProgress.lessonId,
            stageProgress.stage,
          ],
          set: {
            attempts: sql`greatest(${stageProgress.attempts}, ${entry.progress.attempts})`,
            bestPositionScore: sql`greatest(${stageProgress.bestPositionScore}, ${entry.progress.bestScore})`,
            completedAt: sql`coalesce(least(${stageProgress.completedAt}, ${completedAt}), ${stageProgress.completedAt}, ${completedAt})`,
            helped: sql`${stageProgress.helped} or ${entry.progress.helped}`,
            lastAttemptAt: sql`greatest(${stageProgress.lastAttemptAt}, ${lastAttemptAt})`,
          },
        });
    }
  });

  return getAuthenticatedProgress(userId);
}

export async function stageHasThreeAttempts(
  userId: string,
  lessonId: string,
  stage: LessonStage,
) {
  const row = await getDatabase()
    .select({ attempts: stageProgress.attempts })
    .from(stageProgress)
    .where(
      and(
        eq(stageProgress.userId, userId),
        eq(stageProgress.lessonId, lessonId),
        eq(stageProgress.stage, stage),
      ),
    )
    .limit(1);
  return (row[0]?.attempts ?? 0) >= 3;
}
