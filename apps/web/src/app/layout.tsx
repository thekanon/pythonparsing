import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LegacyOriginMigration } from "@/components/progress/legacy-origin-migration";
import { ProgressSync } from "@/components/progress/progress-sync";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { getServerEnv } from "@/server/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "영어 뉴스, Reddit 주요 토픽, 퍼블릭 도메인 고전을 한국어 어절 배열로 학습합니다.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      "뉴스와 공개 토픽, 고전 소설로 영어 문장의 의미와 자연스러운 한국어 어순을 익혀보세요.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#111722" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const env = getServerEnv();
  const authConfigured = Boolean(
    env.DATABASE_URL &&
    env.BETTER_AUTH_SECRET &&
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <LegacyOriginMigration />
        {authConfigured && <ProgressSync />}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
