import { redirect } from "next/navigation";

import { getCachedKstToday } from "@/server/queries/current-date";

export default async function ArchiveIndexPage() {
  redirect(`/archive/${await getCachedKstToday()}`);
}
