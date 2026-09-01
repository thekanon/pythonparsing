import Link from "next/link";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="hairline border-t">
      <div className="site-shell grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-xl">
          <p className="font-semibold">{SITE_NAME}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
            {SITE_TAGLINE}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            뉴스, 공개 토픽, 퍼블릭 도메인 고전을 활용하는 비상업 영어 학습
            서비스입니다. BBC의 공식 서비스나 제휴 서비스가 아닙니다.
          </p>
        </div>
        <nav
          aria-label="하단 메뉴"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold"
        >
          <Link href="/about">서비스 안내</Link>
          <Link href="/privacy">개인정보 처리</Link>
          <Link href="/settings">설정</Link>
        </nav>
      </div>
    </footer>
  );
}
