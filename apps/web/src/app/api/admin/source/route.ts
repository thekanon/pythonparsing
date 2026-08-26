import { revalidateTag } from "next/cache";
import { z } from "zod";

import { AuthenticationError, requireAdmin } from "@/server/auth";
import {
  AdminOperationError,
  recordFailedAdminOperation,
  setContentSourceEnabled,
} from "@/server/services/admin-operations";

const sourceSchema = z.object({ enabled: z.boolean() }).strict();

export async function PATCH(request: Request) {
  let actorId: string | undefined;
  try {
    const session = await requireAdmin(request.headers);
    actorId = session.user.id;
    const body = sourceSchema.safeParse(await request.json().catch(() => null));
    if (!body.success)
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const result = await setContentSourceEnabled(actorId, body.data.enabled);
    revalidateTag("content:public", "max");
    revalidateTag("archive", "max");
    return Response.json(result);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminOperationError) {
      if (actorId) {
        await recordFailedAdminOperation({
          actorId,
          action: "source.toggle",
          targetType: "content_source",
          targetId: "bbc",
        });
      }
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
