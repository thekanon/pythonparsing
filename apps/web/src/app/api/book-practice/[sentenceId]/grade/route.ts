import { z } from "zod";

import {
  createTokenOrderHint,
  gradeTokenOrder,
} from "@/features/lessons/tokenize";
import { getAppSession } from "@/server/auth";
import {
  createBookPracticeTokens,
  findBookPracticeSentence,
} from "@/server/book-practice";
import { createAttemptProof } from "@/server/services/attempt-proof";
import { incrementLearningEvent } from "@/server/services/learning-events";

const requestSchema = z.object({
  stage: z.literal("excerpt"),
  tokenIds: z.array(z.string().min(1).max(200)).max(120),
  attemptProof: z.string().min(1).max(1_000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sentenceId: string }> },
) {
  const { sentenceId } = await context.params;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "INVALID_SUBMISSION" }, { status: 400 });
  }
  if (!findBookPracticeSentence(sentenceId)) {
    return Response.json({ error: "SENTENCE_NOT_FOUND" }, { status: 404 });
  }
  const tokens = createBookPracticeTokens(sentenceId);
  if (!tokens) {
    return Response.json({ error: "SENTENCE_NOT_FOUND" }, { status: 404 });
  }

  try {
    const result = gradeTokenOrder(tokens, parsed.data.tokenIds);
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
                sentenceId,
                "excerpt",
              ),
              hint: createTokenOrderHint(
                tokens,
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
