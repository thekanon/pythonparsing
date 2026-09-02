import type { Metadata } from "next";

import { ExamCoachGuestToday } from "@/features/exam-coach/components/exam-coach-guest-today";

export const metadata: Metadata = {
  title: "정보처리기사 실기 코치",
  description: "SQL·C 개인 검증용 정보처리기사 실기 학습 코치입니다.",
  robots: { index: false, follow: false },
};

export default function ExamCoachPage() {
  return <ExamCoachGuestToday />;
}
