import { z } from "zod";

import {
  createTokenOrderHint,
  gradeTokenOrder,
} from "@/features/lessons/tokenize";
import { getAppSession } from "@/server/auth";
import { createRedditCanonicalLesson } from "@/server/reddit-learning-lesson";
import { getRedditLearningLesson } from "@/server/queries/reddit-learning";
import { createAttemptProof } from "@/server/services/attempt-proof";
import { incrementLearningEvent } from "@/server/services/learning-events";

const requestSchema = z.object({
  stage: z.enum(["title", "excerpt"]),
  tokenIds: z.array(z.string().min(1).max(160)).max(100),
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
    return Response.json({ error: "INVALID_SUBMISSION" }, { status: 400 });
  }

  const redditLesson = await getRedditLearningLesson(topicId);
  if (!redditLesson) {
    return Response.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });
  }

  try {
    const lesson = createRedditCanonicalLesson(redditLesson);
    const stage = parsed.data.stage === "title" ? lesson.title : lesson.excerpt;
    const result = gradeTokenOrder(stage.tokens, parsed.data.tokenIds);
    const session = await getAppSession(request.headers);

    await incrementLearningEvent("stage_submitted", Boolean(session));
    if (result.complete) {
      await incrementLearningEvent("stage_completed", Boolean(session));
    }

    return Response.json(
      {
        ...result,
        ...(!result.complete
          ? {
              attemptProof: createAttemptProof(
                parsed.data.attemptProof,
                lesson.id,
                parsed.data.stage,
              ),
              hint: createTokenOrderHint(
                stage.tokens,
                parsed.data.tokenIds,
                result.incorrectPositions,
              ),
            }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "INVALID_TOKEN_SET" }, { status: 400 });
  }
}
