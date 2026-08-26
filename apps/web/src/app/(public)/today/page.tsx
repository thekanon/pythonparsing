import type { Metadata } from "next";
import Link from "next/link";

import { TodayLessonList } from "@/components/progress/today-lesson-list";
import { formatKoreanDate } from "@/server/domain/date";
import { getLessonsForDate } from "@/server/queries/content";
import { getCachedKstToday } from "@/server/queries/current-date";

export const metadata: Metadata = {
  title: "오늘 학습",
  description: "오늘 공개된 BBC 뉴스 제목과 발췌 20개 단계를 학습합니다.",
};

export default async function TodayPage() {
  const today = await getCachedKstToday();
  const lessons = await getLessonsForDate(today);
  const fixture = lessons.some((lesson) => lesson.source.fixture);

  return (
    <div className="page-shell">
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="eyebrow">{formatKoreanDate(today)}</p>
          <h1 className="page-title mt-3">오늘의 뉴스 문장</h1>
          <p className="lede mt-5">
            기사 10개의 제목과 발췌를 차례로 완성해 보세요.
          </p>
        </div>
        <Link href="/progress" className="button button-secondary md:mb-1">
          내 진도 보기
        </Link>
      </div>

      {fixture && (
        <p className="fixture-banner mt-8" role="note">
          현재 로컬 fixture 모드입니다. 아래 문장은 인터랙션 검증을 위한 합성
          예시이며 BBC 기사 콘텐츠가 아닙니다.
        </p>
      )}

      <div className="mt-10">
        <TodayLessonList lessons={lessons} />
      </div>
    </div>
  );
}
