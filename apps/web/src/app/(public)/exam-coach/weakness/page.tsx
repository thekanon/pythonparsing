import type { Metadata } from "next";

import { ExamCoachWeaknessBoard } from "@/features/exam-coach/components/exam-coach-weakness-board";

export const metadata: Metadata = {
  title: "정보처리기사 실기 취약점 보드",
  description: "SQL·C 학습 근거의 취약 신호와 다음 학습 행동을 확인합니다.",
  robots: { index: false, follow: false },
};

export default function ExamCoachWeaknessPage() {
  return <ExamCoachWeaknessBoard />;
}
