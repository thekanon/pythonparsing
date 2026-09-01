import type { MetadataRoute } from "next";

import { PUBLIC_DOMAIN_BOOKS } from "@/features/books/catalog";
import { getBookPracticeSectionParams } from "@/server/book-practice";
import { getPublicDomainBookSectionParams } from "@/server/book-reader";
import { getCachedArchiveDates } from "@/server/queries/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dates = await getCachedArchiveDates();
  const staticRoutes = [
    "",
    "/today",
    "/archive",
    "/books",
    "/about",
    "/privacy",
  ];
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
    ...PUBLIC_DOMAIN_BOOKS.map((book) => ({
      url: `${baseUrl}/books/${book.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...getPublicDomainBookSectionParams().map(({ bookSlug, sectionSlug }) => ({
      url: `${baseUrl}/books/${bookSlug}/read/${sectionSlug}`,
      changeFrequency: "never" as const,
      priority: 0.4,
    })),
    ...getBookPracticeSectionParams().map(({ bookSlug, sectionSlug }) => ({
      url: `${baseUrl}/books/${bookSlug}/practice/${sectionSlug}`,
      changeFrequency: "never" as const,
      priority: 0.3,
    })),
  ];
}
