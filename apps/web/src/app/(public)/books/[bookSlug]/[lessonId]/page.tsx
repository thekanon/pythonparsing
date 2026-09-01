import {
  ArrowUpRight,
  BookOpenText,
  Translate,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonPlayer } from "@/components/lesson/lesson-player";
import { WordLookupText } from "@/components/lesson/word-lookup-text";
import {
  getPublicDomainBookLesson,
  PUBLIC_DOMAIN_BOOKS,
} from "@/features/books/catalog";
import {
  createBookCanonicalLesson,
  toPublicBookLesson,
} from "@/server/book-learning-lesson";

type BookLessonPageProps = {
  params: Promise<{ bookSlug: string; lessonId: string }>;
};

export function generateStaticParams() {
  return PUBLIC_DOMAIN_BOOKS.flatMap((book) =>
    book.lessons.map((lesson) => ({
      bookSlug: book.slug,
      lessonId: lesson.id,
    })),
  );
}

export async function generateMetadata({
  params,
}: BookLessonPageProps): Promise<Metadata> {
  const { bookSlug, lessonId } = await params;
  const view = getPublicDomainBookLesson(bookSlug, lessonId);
  if (!view) return {};
  return {
    title: `${view.lesson.englishTitle} · ${view.book.koreanTitle}`,
    description: `${view.book.englishTitle}의 짧은 원문을 한국어 어절 배열로 공부합니다.`,
    robots: { index: false, follow: true },
  };
}

export default async function BookLessonPage({ params }: BookLessonPageProps) {
  const { bookSlug, lessonId } = await params;
  const view = getPublicDomainBookLesson(bookSlug, lessonId);
  if (!view) notFound();
  const lesson = toPublicBookLesson(createBookCanonicalLesson(view));

  return (
    <div className="page-shell max-w-[72rem]">
      <nav
        aria-label="현재 위치"
        className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]"
      >
        <Link href="/books">고전 소설 영어</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/books/${view.book.slug}`}>{view.book.koreanTitle}</Link>
        <span aria-hidden="true">/</span>
        <span>{view.position}번 구절</span>
      </nav>

      <div className="mt-7 flex flex-col gap-5 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{view.lesson.chapterLabel}</p>
          <h1 className="mt-3 max-w-[28ch] text-[clamp(1.75rem,4.25vw,3.4rem)] leading-[1.08] font-bold tracking-[-0.045em] text-balance">
            {view.lesson.englishTitle}
          </h1>
          <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">
            {view.book.koreanTitle} · 구절 {view.position}/{view.total}
          </p>
        </div>
        <a
          href={view.book.gutenbergUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary self-start text-sm sm:self-auto"
        >
          영어 원문
          <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
        </a>
      </div>

      <main className="mt-8">
        <LessonPlayer
          lesson={lesson}
          contentKind="book"
          {...(view.nextLessonId
            ? {
                nextLessonHref: `/books/${view.book.slug}/${view.nextLessonId}`,
              }
            : {})}
        />

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
          <article className="surface-card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
              <BookOpenText aria-hidden="true" size={20} weight="duotone" />
              이번 구절 다시 읽기
            </h2>
            <p className="mt-6 text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.8] font-medium tracking-[-0.01em]">
              <WordLookupText
                text={view.lesson.englishPassage}
                lessonId={view.lesson.id}
                stage="excerpt"
                source="book"
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
                {view.lesson.koreanTranslation}
              </p>
            </details>
          </article>

          <aside className="grid gap-5">
            <section className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
              <h2 className="text-lg font-bold">핵심 표현</h2>
              <dl className="mt-4 grid gap-4">
                {view.lesson.expressions.map((expression) => (
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
              {view.book.author}의 {view.book.publicationYear}년 영어 원문에서
              가져온 구절입니다. 한국어 번역은 Sentence가 학습용으로 새로
              작성했습니다. 원문: Project Gutenberg eBook #
              {view.book.gutenbergEbookNumber}
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
