import {
  ArrowUpRight,
  BookOpenText,
  Translate,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LessonPlayer } from "@/components/lesson/lesson-player";
import { WordLookupText } from "@/components/lesson/word-lookup-text";
import { formatKoreanDate } from "@/server/domain/date";
import { getRedditLearningLesson } from "@/server/queries/reddit-learning";
import {
  createRedditCanonicalLesson,
  toPublicRedditLesson,
} from "@/server/reddit-learning-lesson";

export const metadata: Metadata = {
  title: "Reddit 영어 토픽 학습",
  description: "Reddit 주요 토픽으로 만든 영문 지문과 핵심 표현을 공부합니다.",
  robots: { index: false, follow: true },
};

type RedditLessonPageProps = { params: Promise<{ topicId: string }> };

async function RedditLessonContent({ params }: RedditLessonPageProps) {
  const { topicId } = await params;
  const lesson = await getRedditLearningLesson(topicId);
  if (!lesson) notFound();
  const publicLesson = toPublicRedditLesson(
    createRedditCanonicalLesson(lesson),
  );

  return (
    <div className="page-shell max-w-[72rem]">
      <nav
        aria-label="현재 위치"
        className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]"
      >
        <Link href="/reddit">Reddit 영어</Link>
        <span aria-hidden="true">/</span>
        <span>r/{lesson.community}</span>
      </nav>

      <div className="mt-7 flex flex-col gap-5 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            {formatKoreanDate(lesson.collectionDate)} r/{lesson.community}
          </p>
          <h1 className="mt-3 max-w-[28ch] text-[clamp(1.75rem,4.25vw,3.4rem)] leading-[1.08] font-bold tracking-[-0.045em] text-balance">
            {lesson.position}번 문장 배열
          </h1>
          <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">
            제목과 핵심 문장을 한국어 어절로 완성해 보세요. 토픽{" "}
            {lesson.position}/{lesson.total}
          </p>
        </div>
        <a
          href={lesson.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary self-start text-sm sm:self-auto"
        >
          Reddit 커뮤니티
          <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
        </a>
      </div>

      <main className="mt-8">
        <LessonPlayer
          lesson={publicLesson}
          contentKind="reddit"
          {...(lesson.nextTopicId
            ? { nextLessonHref: `/reddit/${lesson.nextTopicId}` }
            : {})}
        />

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
          <article className="surface-card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
              <BookOpenText aria-hidden="true" size={20} weight="duotone" />
              전체 지문과 번역
            </h2>
            <p className="mt-6 text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.8] font-medium tracking-[-0.01em]">
              <WordLookupText
                text={lesson.topic.englishPassage}
                lessonId={lesson.topic.id}
                stage="excerpt"
                source="reddit"
              />
            </p>
            <p className="mt-5 text-xs leading-5 font-semibold text-[var(--ink-soft)]">
              PC에서는 영단어를 더블클릭하고 모바일에서는 한 번 눌러 뜻을 확인할
              수 있습니다.
            </p>

            <details className="mt-7 rounded-[0.875rem] border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold [&::-webkit-details-marker]:hidden">
                <Translate aria-hidden="true" size={19} weight="bold" />
                한국어 번역 보기
              </summary>
              <p className="mt-3 border-t border-[var(--line)] pt-4 leading-7 text-[var(--ink-soft)]">
                {lesson.topic.koreanTranslation}
              </p>
            </details>
          </article>

          <aside className="grid gap-5">
            <section className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
              <h2 className="text-lg font-bold">토픽 이해</h2>
              <p className="mt-3 font-bold">{lesson.topic.koreanTitle}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                {lesson.topic.koreanSummary}
              </p>
            </section>

            <section className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
              <h2 className="text-lg font-bold">핵심 표현</h2>
              <dl className="mt-4 grid gap-4">
                {lesson.topic.expressions.map((expression) => (
                  <div key={expression.phrase}>
                    <dt className="font-mono text-sm font-bold text-[var(--accent)]">
                      {expression.phrase}
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                      {expression.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="rounded-[1rem] border border-[var(--line)] p-5 text-xs leading-5 text-[var(--ink-soft)]">
              원문 댓글과 사용자명은 저장하거나 표시하지 않습니다. 이 지문은
              반복 토픽을 바탕으로 AI가 만든 학습용 재구성문입니다.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function RedditLessonPage(props: RedditLessonPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-shell" aria-label="Reddit 영어 학습을 불러오는 중">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton mt-6 h-20 w-full max-w-3xl" />
          <div className="skeleton mt-8 h-[30rem] w-full" />
        </div>
      }
    >
      <RedditLessonContent {...props} />
    </Suspense>
  );
}
