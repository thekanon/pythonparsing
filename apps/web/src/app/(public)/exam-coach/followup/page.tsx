import type { Metadata } from "next";

import { ExamCoachFollowupDiagnostic } from "@/features/exam-coach/components/exam-coach-followup-diagnostic";

export const metadata: Metadata = {
  title: "정보처리기사 실기 종료 동형 진단",
  description: "SQL·C 기준선과 종료 동형 진단 결과를 비교합니다.",
  robots: { index: false, follow: false },
};

export default function ExamCoachFollowupPage() {
  return <ExamCoachFollowupDiagnostic />;
}
