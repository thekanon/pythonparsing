import type { Metadata } from "next";

import { ExamCoachCurriculum } from "@/features/exam-coach/components/exam-coach-curriculum";

export const metadata: Metadata = {
  title: "정보처리기사 실기 커리큘럼",
  description: "2026 공식 범위와 SQL·C 선수지식 학습 경로를 확인합니다.",
  robots: { index: false, follow: false },
};

export default function ExamCoachCurriculumPage() {
  return <ExamCoachCurriculum />;
}
