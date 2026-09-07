import type { Metadata } from "next";

import { ExamCoachWeeklyAssessment } from "@/features/exam-coach/components/exam-coach-weekly-assessment";

export const metadata: Metadata = {
  title: "정보처리기사 실기 주간 미니 테스트",
  description: "SQL·C 개념별 주간 평가 결과와 응답시간을 기록합니다.",
  robots: { index: false, follow: false },
};

export default function ExamCoachWeeklyPage() {
  return <ExamCoachWeeklyAssessment />;
}
