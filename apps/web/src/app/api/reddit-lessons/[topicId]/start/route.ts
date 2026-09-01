import { getAppSession } from "@/server/auth";
import { getRedditLearningLesson } from "@/server/queries/reddit-learning";
import { incrementLearningEvent } from "@/server/services/learning-events";

export async function POST(
  request: Request,
  context: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await context.params;
  if (!(await getRedditLearningLesson(topicId))) {
    return Response.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });
  }

  const session = await getAppSession(request.headers);
  await incrementLearningEvent("lesson_started", Boolean(session));
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
