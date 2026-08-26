import { isAuthorizedCronRequest } from "@/server/cron";
import { runUserDataBackup } from "@/server/services/backup";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await runUserDataBackup();
  if (result.status === "failed") {
    Sentry.captureMessage("USER_DATA_BACKUP_FAILED", {
      level: "error",
      tags: { job: "user-data-backup", status: result.status },
      extra: { errorCode: result.errorCode },
    });
  }
  return Response.json(result, {
    status: result.status === "failed" ? 500 : 200,
  });
}
import * as Sentry from "@sentry/nextjs";
