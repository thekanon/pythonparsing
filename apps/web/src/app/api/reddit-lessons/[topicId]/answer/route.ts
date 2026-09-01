import { z } from "zod";

import { getAppSession } from "@/server/auth";
import { createRedditCanonicalLesson } from "@/server/reddit-learning-lesson";
import { getRedditLearningLesson } from "@/server/queries/reddit-learning";
import { verifyAttemptProof } from "@/server/services/attempt-proof";
import { incrementLearningEvent } from "@/server/services/learning-events";

const requestSchema = z.object({
  stage: z.enum(["title", "excerpt"]),
  attemptProof: z.string().min(1).max(1_000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await context.params;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const redditLesson = await getRedditLearningLesson(topicId);
  if (!redditLesson) {
    return Response.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });
  }
  const lesson = createRedditCanonicalLesson(redditLesson);
  if (
    verifyAttemptProof(parsed.data.attemptProof, lesson.id, parsed.data.stage) <
    3
  ) {
    return Response.json({ error: "ANSWER_LOCKED" }, { status: 403 });
  }

  const session = await getAppSession(request.headers);
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
