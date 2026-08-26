import "server-only";

import { cacheLife } from "next/cache";

import { toKstDateString } from "@/server/domain/date";

export async function getCachedKstToday(): Promise<string> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 600 });
  return toKstDateString();
}
