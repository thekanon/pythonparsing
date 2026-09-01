import { List, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { SiteAccountLink } from "@/components/auth/site-account-link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const navigation = [
  { href: "/today", label: "오늘 학습" },
  { href: "/reddit", label: "Reddit 영어" },
  { href: "/books", label: "고전 소설" },
  { href: "/archive", label: "지난 학습" },
  { href: "/progress", label: "진도" },
  { href: "/about", label: "서비스 안내" },
];

export function SiteHeader() {
  return (
    <header className="hairline sticky top-0 z-30 border-b bg-[color:color-mix(in_srgb,var(--canvas)_92%,transparent)] backdrop-blur-xl">
      <div className="site-shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 rounded-xl font-semibold tracking-[-0.03em] no-underline"
          aria-label={`${SITE_NAME} 홈`}
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-[0.65rem] bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]"
          >
            S
          </span>
          <span className="grid leading-tight">
            <span className="text-[1.05rem]">{SITE_NAME}</span>
            <span className="hidden text-[0.68rem] font-medium tracking-[-0.01em] text-[var(--ink-soft)] lg:block">
              {SITE_TAGLINE}
            </span>
          </span>
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="hidden items-center gap-1 md:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center rounded-xl px-3.5 text-sm font-semibold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            >
              {item.label}
            </Link>
          ))}
          <SiteAccountLink />
        </nav>

        <details className="group relative md:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] [&::-webkit-details-marker]:hidden">
            <List
              aria-hidden="true"
              className="group-open:hidden"
              size={22}
              weight="bold"
            />
            <X
              aria-hidden="true"
              className="hidden group-open:block"
              size={22}
              weight="bold"
            />
            <span className="sr-only">메뉴 열기</span>
          </summary>
          <nav
            aria-label="모바일 메뉴"
            className="absolute right-0 mt-2 w-56 rounded-[1.125rem] border border-[var(--line)] bg-[var(--surface-raised)] p-2 shadow-[0_20px_60px_rgb(var(--shadow)/0.2)]"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center rounded-xl px-3.5 font-semibold no-underline hover:bg-[var(--surface-muted)]"
              >
                {item.label}
              </Link>
            ))}
            <SiteAccountLink mobile />
          </nav>
        </details>
      </div>
    </header>
  );
}
