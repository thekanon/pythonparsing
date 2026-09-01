import { z } from "zod";

import {
  createTokenOrderHint,
  gradeTokenOrder,
} from "@/features/lessons/tokenize";
import { getAppSession } from "@/server/auth";
import { isFixtureRuntime } from "@/server/env";
import { findLesson } from "@/server/repositories/content";
import { createAttemptProof } from "@/server/services/attempt-proof";
import { incrementLearningEvent } from "@/server/services/learning-events";
import { recordAuthenticatedAttempt } from "@/server/services/progress";

const requestSchema = z.object({
  stage: z.enum(["title", "excerpt"]),
  tokenIds: z.array(z.string().min(1).max(160)).max(100),
  attemptProof: z.string().min(1).max(1_000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "INVALID_SUBMISSION" }, { status: 400 });
  }

  const lesson = await findLesson(lessonId);
  if (!lesson)
    return Response.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });

  try {
    const canonicalStage =
      parsed.data.stage === "title" ? lesson.title : lesson.excerpt;
    const result = gradeTokenOrder(canonicalStage.tokens, parsed.data.tokenIds);
    const session = await getAppSession(request.headers);

    if (session && !isFixtureRuntime()) {
      await recordAuthenticatedAttempt(
        session.user.id,
        lesson.id,
        parsed.data.stage,
        result,
      );
    }

    await incrementLearningEvent("stage_submitted", Boolean(session));
    if (result.complete)
      await incrementLearningEvent("stage_completed", Boolean(session));
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
                canonicalStage.tokens,
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
