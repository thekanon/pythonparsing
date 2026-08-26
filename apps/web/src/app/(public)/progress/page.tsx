import type { Metadata } from "next";
import Link from "next/link";

import { ProgressDashboard } from "@/components/progress/progress-dashboard";

export const metadata: Metadata = {
  title: "내 진도",
  robots: { index: false, follow: false },
};

export default function ProgressPage() {
  return (
    <div className="page-shell">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="page-title">내 학습 진도</h1>
          <p className="lede mt-5">
            로그인하지 않은 기록은 현재 브라우저에만 저장됩니다. 문장 내용과
            어절 순서는 저장하지 않습니다.
          </p>
        </div>
        <Link href="/settings" className="button button-secondary md:mb-1">
          기기 간 동기화
        </Link>
      </div>
      <div className="mt-10">
        <ProgressDashboard />
      </div>
    </div>
  );
}
