import type { Metadata } from "next";

import { ExamCoachReadinessReport } from "@/features/exam-coach/components/exam-coach-readiness-report";

export const metadata: Metadata = {
  title: "정보처리기사 실기 준비도 리포트",
  description: "SQL·C 학습 근거와 진단 결과를 사실 기반으로 확인합니다.",
  robots: { index: false, follow: false },
};

export default function ExamCoachReportPage() {
  return <ExamCoachReadinessReport />;
}
