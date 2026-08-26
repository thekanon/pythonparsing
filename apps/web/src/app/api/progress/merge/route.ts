import { z } from "zod";

import { anonymousProgressSchema } from "@/features/progress/types";
import { AuthenticationError, requireUser } from "@/server/auth";
import { isFixtureRuntime } from "@/server/env";
import { mergeProgressForUser } from "@/server/services/progress";

const mergeSchema = z.object({
  idempotencyId: z.uuid(),
  progress: anonymousProgressSchema,
});

export async function POST(request: Request) {
  try {
    const session = await requireUser(request.headers);
    const body = mergeSchema.safeParse(await request.json().catch(() => null));
    if (!body.success)
      return Response.json({ error: "INVALID_PROGRESS" }, { status: 400 });
    if (Object.keys(body.data.progress.stages).length > 40) {
      return Response.json(
        { error: "PROGRESS_LIMIT_EXCEEDED" },
        { status: 400 },
      );
    }
    if (isFixtureRuntime()) return Response.json(body.data.progress);

    return Response.json(
      await mergeProgressForUser(
        session.user.id,
        body.data.idempotencyId,
        body.data.progress,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
