import { AuthenticationError, requireUser } from "@/server/auth";
import { isFixtureRuntime } from "@/server/env";
import { getAuthenticatedProgress } from "@/server/services/progress";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request.headers);
    if (isFixtureRuntime()) return Response.json({ version: 1, stages: {} });
    return Response.json(await getAuthenticatedProgress(session.user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
