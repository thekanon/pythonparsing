import "server-only";

import { learningEventDaily } from "@newsorder/db/schema";
import { sql } from "drizzle-orm";

import { getDatabase } from "@/server/db";
import { toKstDateString } from "@/server/domain/date";
import { isFixtureRuntime } from "@/server/env";

export type LearningEventName =
  | "lesson_started"
  | "stage_submitted"
  | "stage_completed"
  | "answer_viewed"
  | "report_created";

export async function incrementLearningEvent(
  eventName: LearningEventName,
  authenticated: boolean,
) {
  if (isFixtureRuntime()) return;

  await getDatabase()
    .insert(learningEventDaily)
    .values({
      eventDate: toKstDateString(),
      eventName,
      audience: authenticated ? "authenticated" : "anonymous",
      count: 1,
    })
    .onConflictDoUpdate({
      target: [
        learningEventDaily.eventDate,
        learningEventDaily.eventName,
        learningEventDaily.audience,
      ],
      set: { count: sql`${learningEventDaily.count} + 1` },
    });
}
