import { z } from "zod";

import { AuthenticationError, requireAdmin } from "@/server/auth";
import {
  AdminOperationError,
  recordFailedAdminOperation,
  setUserRole,
} from "@/server/services/admin-operations";

const roleSchema = z.object({ role: z.enum(["user", "admin"]) }).strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  let actorId: string | undefined;
  const { userId } = await context.params;
  try {
    const session = await requireAdmin(request.headers);
    actorId = session.user.id;
    const body = roleSchema.safeParse(await request.json().catch(() => null));
    if (!body.success)
      return Response.json({ error: "INVALID_ROLE" }, { status: 400 });
    return Response.json(
      await setUserRole({ actorId, userId, role: body.data.role }),
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminOperationError) {
      if (actorId) {
        await recordFailedAdminOperation({
          actorId,
          action: "user.role_change",
          targetType: "user",
          targetId: userId,
        });
      }
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
