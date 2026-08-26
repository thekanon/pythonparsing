import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TodayLessonList } from "@/components/progress/today-lesson-list";
import { formatKoreanDate, isIsoDate } from "@/server/domain/date";
import {
  getCachedArchiveDates,
  getLessonsForDate,
} from "@/server/queries/content";

type ArchivePageProps = { params: Promise<{ date: string }> };

export async function generateMetadata({
  params,
}: ArchivePageProps): Promise<Metadata> {
  const { date } = await params;
  return {
    title: isIsoDate(date) ? `${formatKoreanDate(date)} 학습` : "지난 학습",
    description: "날짜별 뉴스 문장 배열 학습 목록입니다.",
  };
}

async function ArchiveDateContent({ params }: ArchivePageProps) {
  const { date } = await params;
  if (!isIsoDate(date)) notFound();

  const [lessons, dates] = await Promise.all([
    getLessonsForDate(date),
    getCachedArchiveDates(),
  ]);
  const fixture = lessons.some((lesson) => lesson.source.fixture);

  return (
    <div className="page-shell">
      <h1 className="page-title">지난 학습</h1>
      <p className="lede mt-5">
        날짜를 골라 공개된 뉴스 문장을 다시 학습할 수 있습니다.
      </p>

      <nav aria-label="학습 날짜" className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {dates.map((archiveDate) => (
            <Link
              key={archiveDate}
              href={`/archive/${archiveDate}`}
              aria-current={archiveDate === date ? "date" : undefined}
              className={`button text-sm ${
                archiveDate === date ? "button-primary" : "button-secondary"
              }`}
            >
              {formatKoreanDate(archiveDate)}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-10 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-sm font-bold text-[var(--accent)]">선택한 날짜</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">
            {formatKoreanDate(date)}
          </h2>
        </div>
        <p className="text-sm font-semibold text-[var(--ink-soft)]">
          {lessons.length}개 기사
        </p>
      </div>

      {fixture && (
        <p className="fixture-banner mt-7" role="note">
          로컬 fixture 모드에서는 날짜별로 동일한 합성 문장을 제공합니다. BBC
          기사 콘텐츠가 아닙니다.
        </p>
      )}

      <div className="mt-8">
        <TodayLessonList lessons={lessons} />
      </div>
    </div>
  );
}

export default function ArchiveDatePage(props: ArchivePageProps) {
  return (
    <Suspense
      fallback={
        <div
          className="page-shell"
          aria-busy="true"
          aria-label="지난 학습을 불러오는 중"
        >
          <div className="skeleton h-12 w-72" />
          <div className="skeleton mt-5 h-6 w-full max-w-xl" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-52" />
            <div className="skeleton h-52" />
          </div>
        </div>
      }
    >
      <ArchiveDateContent {...props} />
    </Suspense>
  );
}
