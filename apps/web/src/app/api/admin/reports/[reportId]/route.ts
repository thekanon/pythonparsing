import { z } from "zod";

import { AuthenticationError, requireAdmin } from "@/server/auth";
import {
  AdminOperationError,
  handleTranslationReport,
  recordFailedAdminOperation,
} from "@/server/services/admin-operations";

const handleSchema = z
  .object({ status: z.enum(["resolved", "dismissed"]) })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  let actorId: string | undefined;
  const { reportId } = await context.params;
  try {
    const session = await requireAdmin(request.headers);
    actorId = session.user.id;
    const body = handleSchema.safeParse(await request.json().catch(() => null));
    if (!body.success)
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    return Response.json(
      await handleTranslationReport(actorId, reportId, body.data.status),
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminOperationError) {
      if (actorId) {
        await recordFailedAdminOperation({
          actorId,
          action: "report.handle",
          targetType: "translation_report",
          targetId: reportId,
        });
      }
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
