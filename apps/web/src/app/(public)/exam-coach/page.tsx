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
      <div className="page-shell pt-0">
        <Link
          href="/exam-coach/followup"
          className="button button-secondary"
        >
          종료 동형 진단과 비교 보기
        </Link>
      </div>
    </>
  );
}
