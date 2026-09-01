import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LessonPlayer } from "@/components/lesson/lesson-player";
import { ReportTranslation } from "@/components/lesson/report-translation";
import { formatKoreanDate } from "@/server/domain/date";
import {
  getCachedLesson,
  getLessonsForDate,
  toPublicLesson,
} from "@/server/queries/content";

type LessonPageProps = { params: Promise<{ lessonId: string }> };

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await getCachedLesson(lessonId);
  return {
    title: lesson ? `${lesson.ordinal}번 학습` : "학습을 찾을 수 없음",
    robots: { index: false, follow: true },
  };
}

async function LessonContent({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const lesson = await getCachedLesson(lessonId);
  if (!lesson) notFound();

  const dayLessons = await getLessonsForDate(lesson.learningDate);
  const nextLesson = dayLessons.find(
    (item) => item.ordinal === lesson.ordinal + 1,
  );
  const publicLesson = toPublicLesson(lesson);

  return (
    <div className="page-shell max-w-[74rem]">
      <nav
        aria-label="현재 위치"
        className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]"
      >
        <Link href="/today">오늘 학습</Link>
        <span aria-hidden="true">/</span>
        <span>{lesson.ordinal}번 기사</span>
      </nav>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{formatKoreanDate(lesson.learningDate)}</p>
          <h1 className="page-title mt-3">{lesson.ordinal}번 문장 배열</h1>
        </div>
        <a
          href={lesson.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary text-sm"
        >
          {lesson.source.fixture
            ? "BBC 뉴스 홈"
            : `${lesson.source.label} 원문`}
          <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
        </a>
      </div>

      {lesson.source.fixture && (
        <p className="fixture-banner mt-7" role="note">
          이 문장은 로컬 기능 검증을 위한 합성 예시이며 BBC 기사 콘텐츠가
          아닙니다.
        </p>
      )}

      <div className="mt-8">
        <LessonPlayer
          key={lesson.id}
          lesson={publicLesson}
          {...(nextLesson
            ? { nextLessonHref: `/lessons/${nextLesson.id}` }
            : {})}
        />
      </div>

      <aside className="mt-7 grid gap-4 md:grid-cols-[1fr_0.9fr] md:items-start">
        <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
          <p className="font-bold text-[var(--ink)]">출처와 학습 범위</p>
          <p className="mt-2">
            Sentence는 BBC의 공식 또는 제휴 서비스가 아닙니다. 실제 운영에서는
            헤드라인과 기사당 최대 200자 발췌만 사용하며 원문 전체를 저장하지
            않습니다.
          </p>
        </div>
        <ReportTranslation
          revisionId={lesson.revisionId}
          fixture={lesson.source.fixture}
        />
      </aside>
    </div>
  );
}

export default function LessonPage(props: LessonPageProps) {
  return (
    <Suspense
      fallback={
        <div
          className="page-shell"
          aria-busy="true"
          aria-label="학습을 불러오는 중"
        >
          <div className="skeleton h-5 w-32" />
          <div className="skeleton mt-5 h-14 w-full max-w-2xl" />
          <div className="skeleton mt-8 h-96 w-full" />
        </div>
      }
    >
      <LessonContent {...props} />
    </Suspense>
  );
}
