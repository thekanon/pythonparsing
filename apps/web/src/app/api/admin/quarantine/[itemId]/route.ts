import { revalidateTag } from "next/cache";
import { z } from "zod";

import { AuthenticationError, requireAdmin } from "@/server/auth";
import {
  AdminOperationError,
  recordFailedAdminOperation,
  reverifyQuarantinedTranslation,
} from "@/server/services/admin-operations";

const reverifySchema = z
  .object({
    koreanTitle: z.string().trim().min(1).max(500),
    koreanExcerpt: z.string().trim().min(1).max(1_000),
  })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  let actorId: string | undefined;
  const { itemId } = await context.params;
  try {
    const session = await requireAdmin(request.headers);
    actorId = session.user.id;
    const body = reverifySchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!body.success)
      return Response.json({ error: "INVALID_TRANSLATION" }, { status: 400 });

    const result = await reverifyQuarantinedTranslation({
      actorId,
      itemId,
      ...body.data,
    });
    revalidateTag("content:public", "max");
    revalidateTag("archive", "max");
    revalidateTag(`lessons:date:${result.learningDate}`, "max");
    revalidateTag(`lesson:${result.lessonId}`, "max");
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminOperationError) {
      if (actorId && error.code !== "VERIFICATION_REJECTED") {
        await recordFailedAdminOperation({
          actorId,
          action: "quarantine.reverify",
          targetType: "ingestion_item",
          targetId: itemId,
        });
      }
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
