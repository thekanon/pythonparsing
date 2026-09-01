import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { AuthenticationError, requireAdmin } from "@/server/auth";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export const instant = false;

const navigation = [
  { href: "/admin", label: "현황" },
  { href: "/admin/ingestion", label: "수집" },
  { href: "/admin/reddit-topics", label: "Reddit 토픽" },
  { href: "/admin/quarantine", label: "격리" },
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/users", label: "역할" },
  { href: "/admin/audit", label: "감사 로그" },
];

async function getVerifiedAdminSession() {
  try {
    return await requireAdmin(await headers());
  } catch (error) {
    if (error instanceof AuthenticationError) return null;
    throw error;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getVerifiedAdminSession();
  if (!session) {
    return (
      <div className="page-shell">
        <div className="surface-card max-w-2xl p-7 sm:p-10">
          <p className="eyebrow">ACCESS DENIED</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
            관리자 권한이 필요합니다
          </h1>
          <p className="mt-4 leading-7 text-[var(--ink-soft)]">
            Google 로그인 후 DB에 저장된 관리자 역할을 확인합니다. 쿠키
            존재만으로는 접근을 허용하지 않습니다.
          </p>
          <Link href="/settings" className="button button-primary mt-7">
            로그인과 설정으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
            운영 관리자
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {session.user.name} · 실제 DB 역할 확인됨
          </p>
        </div>
        <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="button button-secondary text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
