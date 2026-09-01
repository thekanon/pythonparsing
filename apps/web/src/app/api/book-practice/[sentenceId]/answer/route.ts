import { z } from "zod";

import { getAppSession } from "@/server/auth";
import {
  createBookPracticeTokens,
  findBookPracticeSentence,
} from "@/server/book-practice";
import { verifyAttemptProof } from "@/server/services/attempt-proof";
import { incrementLearningEvent } from "@/server/services/learning-events";

const requestSchema = z.object({
  stage: z.literal("excerpt"),
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
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  if (!findBookPracticeSentence(sentenceId)) {
    return Response.json({ error: "SENTENCE_NOT_FOUND" }, { status: 404 });
  }
  if (verifyAttemptProof(parsed.data.attemptProof, sentenceId, "excerpt") < 3) {
    return Response.json({ error: "ANSWER_LOCKED" }, { status: 403 });
  }
  const tokens = createBookPracticeTokens(sentenceId);
  if (!tokens) {
    return Response.json({ error: "SENTENCE_NOT_FOUND" }, { status: 404 });
  }

  const session = await getAppSession(request.headers);
  await incrementLearningEvent("answer_viewed", Boolean(session));
  return Response.json(
    {
      tokens: tokens
        .toSorted((left, right) => left.position - right.position)
        .map(({ id, text }) => ({ id, text })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
