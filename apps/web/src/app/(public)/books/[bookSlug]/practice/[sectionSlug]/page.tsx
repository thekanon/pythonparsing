import { ArrowUpRight, BookOpenText } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookPracticeSequence } from "@/components/books/book-practice-sequence";
import {
  getBookPracticeSection,
  getBookPracticeSectionParams,
  toPublicBookPracticeSentence,
} from "@/server/book-practice";

type BookPracticePageProps = {
  params: Promise<{ bookSlug: string; sectionSlug: string }>;
};

export function generateStaticParams() {
  return getBookPracticeSectionParams();
}

export async function generateMetadata({
  params,
}: BookPracticePageProps): Promise<Metadata> {
  const { bookSlug, sectionSlug } = await params;
  const view = getBookPracticeSection(bookSlug, sectionSlug);
  if (!view) return {};
  return {
    title: `${view.bookSection.englishTitle} 문장 배열 · ${view.book.koreanTitle}`,
    description: `${view.book.englishTitle} 원문을 첫 문장부터 한국어 어절 배열로 공부합니다.`,
    robots: { index: false, follow: true },
  };
}

export default async function BookPracticePage({
  params,
}: BookPracticePageProps) {
  const { bookSlug, sectionSlug } = await params;
  const view = getBookPracticeSection(bookSlug, sectionSlug);
  if (!view || view.section.sentences.length === 0) notFound();
  const sentences = view.section.sentences.map(toPublicBookPracticeSentence);
  const nextSectionHref = view.nextSectionSlug
    ? `/books/${view.book.slug}/practice/${view.nextSectionSlug}`
    : undefined;

  return (
    <div className="practice-page-shell">
      <header className="mb-3 grid gap-2.5 border-b border-[var(--line)] pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-soft)]">
            <nav aria-label="현재 위치" className="flex items-center gap-1.5">
              <Link href="/books">고전 소설</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/books/${view.book.slug}`}>
                {view.book.koreanTitle}
              </Link>
            </nav>
            <span aria-hidden="true">·</span>
            <p className="font-mono text-xs font-bold tracking-[0.06em] text-[var(--accent)]">
              {view.bookSection.label}
            </p>
            <p className="text-xs font-semibold text-[var(--ink-soft)]">
              부분 {view.sectionPosition}/{view.sectionTotal}
            </p>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h1 className="min-w-0 truncate text-xl leading-tight font-bold tracking-[-0.035em] sm:text-2xl">
              {view.bookSection.englishTitle}
            </h1>
            <p className="shrink-0 text-xs font-semibold text-[var(--ink-soft)]">
              {view.bookSection.koreanTitle} · {view.section.sentenceCount}문장
            </p>
          </div>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex sm:justify-end">
          <Link
            href={`/books/${view.book.slug}/read/${view.bookSection.slug}`}
            className="button button-secondary text-sm"
          >
            <BookOpenText aria-hidden="true" size={17} weight="duotone" />
            원문 읽기
          </Link>
          <a
            href={view.book.gutenbergUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary text-sm"
          >
            Gutenberg
            <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
          </a>
        </div>
      </header>

      <section aria-label="문장 학습">
        <BookPracticeSequence
          bookSlug={view.book.slug}
          bookTitle={view.book.englishTitle}
          sourceUrl={view.book.gutenbergUrl}
          sectionSlug={view.section.sectionSlug}
          sectionPosition={view.sectionPosition}
          sectionTotal={view.sectionTotal}
          sentences={sentences}
          {...(nextSectionHref ? { nextSectionHref } : {})}
        />
      </section>

      <p className="mt-8 rounded-[1rem] border border-[var(--line)] p-5 text-xs leading-5 text-[var(--ink-soft)]">
        {view.book.author}의 저작권이 만료된 영어 원문을 사용합니다. 한국어
        번역은 학습용으로 새로 생성했으며, 문맥에 따라 여러 번역이 가능합니다.
        원문: Project Gutenberg eBook #{view.book.gutenbergEbookNumber}
      </p>
    </div>
  );
}
