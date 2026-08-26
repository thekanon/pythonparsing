import { articleRevisions, translationReports } from "@newsorder/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { AuthenticationError, requireUser } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { isFixtureRuntime } from "@/server/env";
import { incrementLearningEvent } from "@/server/services/learning-events";

const reportSchema = z.object({
  revisionId: z.uuid(),
  type: z.enum(["inaccurate", "unnatural", "incomplete", "unsafe"]),
});

export async function POST(request: Request) {
  try {
    const session = await requireUser(request.headers);
    if (isFixtureRuntime()) {
      return Response.json(
        { error: "FIXTURE_REPORT_DISABLED" },
        { status: 503 },
      );
    }
    const body = reportSchema.safeParse(await request.json().catch(() => null));
    if (!body.success)
      return Response.json({ error: "INVALID_REPORT" }, { status: 400 });

    const revision = await getDatabase()
      .select({ id: articleRevisions.id })
      .from(articleRevisions)
      .where(eq(articleRevisions.id, body.data.revisionId))
      .limit(1);
    if (revision.length === 0) {
      return Response.json({ error: "REVISION_NOT_FOUND" }, { status: 404 });
    }

    const created = await getDatabase()
      .insert(translationReports)
      .values({
        reporterUserId: session.user.id,
        revisionId: body.data.revisionId,
        type: body.data.type,
      })
      .onConflictDoNothing()
      .returning({ id: translationReports.id });
    if (created.length === 0) {
      return Response.json({ error: "OPEN_REPORT_EXISTS" }, { status: 409 });
    }

    await incrementLearningEvent("report_created", true);
    return Response.json({ id: created[0]!.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
