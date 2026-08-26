import type { Metadata } from "next";
import Link from "next/link";

import {
  AccountPanel,
  FixtureAccountPanel,
} from "@/components/auth/account-panel";
import { getServerEnv } from "@/server/env";

export const metadata: Metadata = {
  title: "설정",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  const env = getServerEnv();
  const authConfigured = Boolean(
    env.DATABASE_URL &&
    env.BETTER_AUTH_SECRET &&
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="page-shell">
      <h1 className="page-title">로그인과 데이터 설정</h1>
      <p className="lede mt-5">
        익명 학습은 그대로 유지하고, 원할 때만 계정을 연결하거나 저장된 데이터를
        삭제할 수 있습니다.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {authConfigured ? <AccountPanel /> : <FixtureAccountPanel />}
        <section
          className="surface-card p-6 sm:p-8"
          aria-labelledby="data-heading"
        >
          <h2 id="data-heading" className="text-xl font-bold">
            저장하는 데이터
          </h2>
          <dl className="mt-5 space-y-5 text-sm leading-6">
            <div>
              <dt className="font-bold">익명 학습</dt>
              <dd className="mt-1 text-[var(--ink-soft)]">
                레슨 ID, 완료, 시도 수, 최고점, 도움 사용 여부만 브라우저에
                저장합니다.
              </dd>
            </div>
            <div>
              <dt className="font-bold">로그인 학습</dt>
              <dd className="mt-1 text-[var(--ink-soft)]">
                같은 진도 항목과 Google OAuth 연결을 서버에 저장합니다.
              </dd>
            </div>
            <div>
              <dt className="font-bold">저장하지 않음</dt>
              <dd className="mt-1 text-[var(--ink-soft)]">
                사용자가 배열한 전체 어절 순서, 기사 본문, 자유 입력 신고 내용은
                저장하지 않습니다.
              </dd>
            </div>
          </dl>
          <Link
            href="/privacy"
            className="button button-secondary mt-6 text-sm"
          >
            개인정보 정책 보기
          </Link>
        </section>
      </div>
    </div>
  );
}
