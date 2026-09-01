import { getAppSession } from "@/server/auth";
import { findBookPracticeSentence } from "@/server/book-practice";
import { incrementLearningEvent } from "@/server/services/learning-events";

export async function POST(
  request: Request,
  context: { params: Promise<{ sentenceId: string }> },
) {
  const { sentenceId } = await context.params;
  if (!findBookPracticeSentence(sentenceId)) {
    return Response.json({ error: "SENTENCE_NOT_FOUND" }, { status: 404 });
  }
  const session = await getAppSession(request.headers);
  await incrementLearningEvent("lesson_started", Boolean(session));
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
