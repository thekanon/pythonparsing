import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hairline border-t">
      <div className="site-shell grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-xl">
          <p className="font-semibold">NewsOrder</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            비상업 영어 학습 서비스입니다. BBC의 공식 서비스나 제휴 서비스가
            아닙니다.
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
