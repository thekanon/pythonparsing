import * as Sentry from "@sentry/nextjs";
import { revalidateTag } from "next/cache";

import { isAuthorizedCronRequest } from "@/server/cron";
import { toKstDateString } from "@/server/domain/date";
import { runDailyIngestion } from "@/server/services/ingestion";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const learningDate = toKstDateString();
  const result = await runDailyIngestion(learningDate);
  if (result.status === "succeeded" || result.status === "partial") {
    revalidateTag("content:public", "max");
    revalidateTag("lessons:today", "max");
    revalidateTag(`lessons:date:${learningDate}`, "max");
    revalidateTag("archive", "max");
  }

  if (result.status === "partial" || result.status === "failed") {
    Sentry.captureMessage(
      result.status === "partial"
        ? "INGESTION_UNDER_DAILY_TARGET"
        : "INGESTION_FAILED",
      {
        level: result.status === "failed" ? "error" : "warning",
        tags: { job: "daily-ingestion", status: result.status },
        extra: {
          learningDate,
          publishedCount: result.publishedCount,
          warningCode: result.warningCode ?? null,
        },
      },
    );
  }

  return Response.json(
    { learningDate, ...result },
    { status: result.status === "failed" ? 500 : 200 },
  );
}
