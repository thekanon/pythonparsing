import { getAppSession } from "@/server/auth";
import { findLesson } from "@/server/repositories/content";
import { incrementLearningEvent } from "@/server/services/learning-events";

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  if (!(await findLesson(lessonId))) {
    return Response.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });
  }

  const session = await getAppSession(request.headers);
  await incrementLearningEvent("lesson_started", Boolean(session));
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
