"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";

export function SiteAccountLink({ mobile = false }: { mobile?: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const roles = session?.user.role
    ?.split(",")
    .map((role) => role.trim());
  const isAdmin = roles?.includes("admin") ?? false;
  const href = isAdmin ? "/admin/reddit-topics" : "/settings";
  const label = isPending
    ? mobile
      ? "로그인과 설정"
      : "로그인"
    : !session
      ? mobile
        ? "로그인과 설정"
        : "로그인"
      : isAdmin
        ? mobile
          ? "관리자 메뉴"
          : "관리자"
        : "내 계정";

  return (
    <Link
      href={href}
      className={
        mobile
          ? "mt-1 flex min-h-11 items-center rounded-xl bg-[var(--accent)] px-3.5 font-semibold text-[var(--accent-ink)] no-underline"
          : "button button-secondary ml-2 text-sm"
      }
    >
      {label}
    </Link>
  );
}
