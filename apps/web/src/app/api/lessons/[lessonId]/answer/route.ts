import { z } from "zod";

import { getAppSession } from "@/server/auth";
import { isFixtureRuntime } from "@/server/env";
import { findLesson } from "@/server/repositories/content";
import { incrementLearningEvent } from "@/server/services/learning-events";
import {
  markAuthenticatedHelped,
  stageHasThreeAttempts,
} from "@/server/services/progress";

const requestSchema = z.object({
  stage: z.enum(["title", "excerpt"]),
  anonymousAttempts: z.number().int().min(0).max(10_000).default(0),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const lesson = await findLesson(lessonId);
  if (!lesson)
    return Response.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });
  const session = await getAppSession(request.headers);
  const eligible =
    parsed.data.anonymousAttempts >= 3 ||
    (session &&
      !isFixtureRuntime() &&
      (await stageHasThreeAttempts(
        session.user.id,
        lesson.id,
        parsed.data.stage,
      )));

  if (!eligible)
    return Response.json({ error: "ANSWER_LOCKED" }, { status: 403 });

  if (session && !isFixtureRuntime()) {
    await markAuthenticatedHelped(
      session.user.id,
      lesson.id,
      parsed.data.stage,
    );
  }
  await incrementLearningEvent("answer_viewed", Boolean(session));

  const stage = parsed.data.stage === "title" ? lesson.title : lesson.excerpt;
  return Response.json(
    {
      tokens: stage.tokens
        .toSorted((left, right) => left.position - right.position)
        .map(({ id, text }) => ({ id, text })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
