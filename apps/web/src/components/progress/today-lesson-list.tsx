"use client";

import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import Link from "next/link";

import type { LessonSummary } from "@/features/lessons/types";
import { progressKey } from "@/features/progress/types";
import { useAnonymousProgress } from "@/features/progress/use-anonymous-progress";

export function TodayLessonList({ lessons }: { lessons: LessonSummary[] }) {
  const progress = useAnonymousProgress();

  if (lessons.length === 0) {
    return (
      <div className="surface-card p-8 sm:p-12">
        <h2 className="text-xl font-bold">오늘 공개된 학습이 없습니다.</h2>
        <p className="mt-3 max-w-xl leading-7 text-[var(--ink-soft)]">
          번역 검수를 통과한 항목이 준비되는 동안 지난 학습을 이용해 주세요.
        </p>
        <Link href="/archive" className="button button-secondary mt-6">
          지난 학습 보기
        </Link>
      </div>
    );
  }

  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {lessons.map((lesson) => {
        const titleDone = Boolean(
          progress.stages[progressKey(lesson.id, "title")]?.completedAt,
        );
        const excerptDone = Boolean(
          progress.stages[progressKey(lesson.id, "excerpt")]?.completedAt,
        );
        const completed = Number(titleDone) + Number(excerptDone);

        return (
          <li key={lesson.id}>
            <Link
              href={`/lessons/${lesson.id}`}
              className="surface-card group flex min-h-64 flex-col p-5 no-underline transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-raised)] hover:shadow-[0_1.25rem_3.5rem_rgb(var(--shadow)/0.13)] sm:p-6"
              aria-label={`${lesson.ordinal}번 학습 시작: ${lesson.englishTitle}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-sm font-bold text-[var(--accent)]">
                  {String(lesson.ordinal).padStart(2, "0")}
                </span>
                <span className="inline-flex min-h-7 items-center gap-1.5 text-xs font-bold text-[var(--ink-soft)]">
                  {completed === 2 && (
                    <CheckCircle aria-hidden="true" size={17} weight="fill" />
                  )}
                  {completed}/2 완료
                </span>
              </div>
              <h2 className="mt-6 text-xl leading-snug font-bold tracking-[-0.025em]">
                {lesson.englishTitle}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--ink-soft)]">
                {lesson.englishExcerpt}
              </p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                <span className="text-xs font-semibold text-[var(--ink-soft)]">
                  {lesson.source.label}
                </span>
                <span className="button button-quiet -mr-2 text-sm group-hover:text-[var(--accent)]">
                  {completed > 0 ? "이어하기" : "시작"}
                  <ArrowRight aria-hidden="true" size={17} weight="bold" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
