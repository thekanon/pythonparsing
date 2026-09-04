import type { Metadata } from "next";
import Link from "next/link";

import { ExamCoachGuestToday } from "@/features/exam-coach/components/exam-coach-guest-today";

export const metadata: Metadata = {
  title: "정보처리기사 실기 코치",
  description: "SQL·C 개인 검증용 정보처리기사 실기 학습 코치입니다.",
  robots: { index: false, follow: false },
};

// prettier-ignore
export default function ExamCoachPage() {
  return (
    <>
      <ExamCoachGuestToday />
      <nav
        className="page-shell flex flex-wrap gap-3 pt-0"
        aria-label="정보처리기사 코치 메뉴"
      >
        <Link href="/exam-coach/learn" className="button button-primary">
          정규 학습 시작
        </Link>
        <Link href="/exam-coach/curriculum" className="button button-secondary">
          커리큘럼 보기
        </Link>
        <Link href="/exam-coach/report" className="button button-secondary">
          준비도 리포트
        </Link>
        <Link href="/exam-coach/followup" className="button button-secondary">
          종료 동형 진단과 비교 보기
        </Link>
      </nav>
    </>
  );
}
