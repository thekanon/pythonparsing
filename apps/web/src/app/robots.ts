import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/today", "/archive", "/about", "/privacy"],
      disallow: ["/admin/", "/api/", "/lessons/", "/progress", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
