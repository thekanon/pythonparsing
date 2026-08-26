import { revalidateTag } from "next/cache";
import { z } from "zod";

import { AuthenticationError, requireAdmin } from "@/server/auth";
import {
  AdminOperationError,
  recordFailedAdminOperation,
  withdrawArticleRevision,
} from "@/server/services/admin-operations";

const withdrawalSchema = z.object({ confirm: z.literal(true) }).strict();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ revisionId: string }> },
) {
  let actorId: string | undefined;
  const { revisionId } = await context.params;
  try {
    const session = await requireAdmin(request.headers);
    actorId = session.user.id;
    const body = withdrawalSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!body.success) {
      return Response.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
    }

    const result = await withdrawArticleRevision(actorId, revisionId);
    revalidateTag("content:public", "max");
    revalidateTag("archive", "max");
    for (const lessonId of result.lessonIds)
      revalidateTag(`lesson:${lessonId}`, "max");
    for (const date of result.learningDates) {
      revalidateTag(`lessons:date:${date}`, "max");
    }
    return Response.json({ withdrawn: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminOperationError) {
      if (actorId) {
        await recordFailedAdminOperation({
          actorId,
          action: "revision.withdraw",
          targetType: "article_revision",
          targetId: revisionId,
        });
      }
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
