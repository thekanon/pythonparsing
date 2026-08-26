import type { MetadataRoute } from "next";

import { getCachedArchiveDates } from "@/server/queries/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dates = await getCachedArchiveDates();
  const staticRoutes = ["", "/today", "/archive", "/about", "/privacy"];
  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency:
        route === "/today" ? ("daily" as const) : ("weekly" as const),
      priority: route === "" ? 1 : 0.7,
    })),
    ...dates.map((date) => ({
      url: `${baseUrl}/archive/${date}`,
      lastModified: new Date(`${date}T00:00:00+09:00`),
      changeFrequency: "never" as const,
      priority: 0.5,
    })),
  ];
}
