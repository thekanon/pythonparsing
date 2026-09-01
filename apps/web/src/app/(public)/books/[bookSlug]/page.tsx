import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookContinueLink } from "@/components/books/book-continue-link";
import { BookPracticeContinueLink } from "@/components/books/book-practice-continue-link";
import {
  getPublicDomainBook,
  PUBLIC_DOMAIN_BOOKS,
} from "@/features/books/catalog";
import { getPublicDomainBookText } from "@/server/book-reader";

type BookPageProps = { params: Promise<{ bookSlug: string }> };

export function generateStaticParams() {
  return PUBLIC_DOMAIN_BOOKS.map((book) => ({ bookSlug: book.slug }));
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { bookSlug } = await params;
  const book = getPublicDomainBook(bookSlug);
  if (!book) return {};
  return {
    title: `${book.koreanTitle} 영어 학습`,
    description: `${book.englishTitle} 영어 원문을 처음부터 끝까지 읽고 한국어 문장 배열로 공부합니다.`,
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { bookSlug } = await params;
  const book = getPublicDomainBook(bookSlug);
  if (!book) notFound();
  const bookText = getPublicDomainBookText(book.slug);
  if (!bookText) notFound();
  const firstSection = bookText.sections[0]!;
  const totalWords = new Intl.NumberFormat("ko-KR").format(bookText.totalWords);

  return (
    <div className="page-shell">
      <nav
        aria-label="현재 위치"
        className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]"
      >
        <Link href="/books">고전 소설 영어</Link>
        <span aria-hidden="true">/</span>
        <span>{book.koreanTitle}</span>
      </nav>

      <div className="mt-8 grid gap-8 border-b border-[var(--line)] pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="eyebrow">
            {book.author.toUpperCase()} · {book.publicationYear}
          </p>
          <h1 className="page-title mt-3">{book.englishTitle}</h1>
          <p className="mt-3 text-xl font-bold">{book.koreanTitle}</p>
          <p className="lede mt-5">{book.description}</p>
        </div>
        <div className="flex flex-wrap gap-3 self-start lg:self-auto">
          <BookPracticeContinueLink
            bookSlug={book.slug}
            firstSectionSlug={firstSection.slug}
            sectionSlugs={bookText.sections.map((section) => section.slug)}
          />
          <BookContinueLink
            bookSlug={book.slug}
            firstSectionSlug={firstSection.slug}
            sectionSlugs={bookText.sections.map((section) => section.slug)}
          />
          <a
            href={book.gutenbergUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary"
          >
            Project Gutenberg 원문
            <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
          </a>
        </div>
      </div>

      <section
        id="full-book-index"
        className="mt-10 scroll-mt-24"
        aria-labelledby="full-book-title"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <BookOpenText
                aria-hidden="true"
                size={24}
                weight="duotone"
                className="text-[var(--accent)]"
              />
              <h2 id="full-book-title" className="text-2xl font-bold">
                전체 원문 읽기
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              {bookText.sections.length}개 부분 · 약 {totalWords}단어 ·
              마지막까지 수록
            </p>
          </div>
          <BookContinueLink
            bookSlug={book.slug}
            firstSectionSlug={firstSection.slug}
            sectionSlugs={bookText.sections.map((section) => section.slug)}
          />
        </div>

        <details className="surface-card mt-7 overflow-hidden">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 font-bold sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <ListBullets
                aria-hidden="true"
                size={21}
                weight="bold"
                className="text-[var(--accent)]"
              />
              전체 목차 보기
            </span>
            <span className="font-mono text-xs text-[var(--ink-soft)]">
              {bookText.sections.length}
            </span>
          </summary>
          <ol className="grid border-t border-[var(--line)] sm:grid-cols-2">
            {bookText.sections.map((section, index) => (
              <li
                key={section.id}
                className="border-b border-[var(--line)] last:border-b-0 sm:odd:border-r"
              >
                <div className="group flex min-h-28 gap-4 p-5 transition-colors hover:bg-[var(--surface-muted)] sm:p-6">
                  <span className="mt-1 font-mono text-xs font-bold text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="block text-xs font-bold text-[var(--ink-soft)]">
                      {section.label}
                    </span>
                    <Link
                      href={`/books/${book.slug}/read/${section.slug}`}
                      className="mt-1 font-bold no-underline group-hover:text-[var(--accent)]"
                    >
                      {section.englishTitle}
                    </Link>
                    <span className="mt-1 block text-sm text-[var(--ink-soft)]">
                      {section.koreanTitle} ·{" "}
                      {section.wordCount.toLocaleString()}
                      단어
                    </span>
                    <Link
                      href={`/books/${book.slug}/practice/${section.slug}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)] no-underline"
                    >
                      배열 학습
                      <ArrowRight aria-hidden="true" size={15} weight="bold" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <section className="mt-14" aria-labelledby="book-lessons-title">
        <div className="flex items-center gap-3">
          <BookOpenText
            aria-hidden="true"
            size={24}
            weight="duotone"
            className="text-[var(--accent)]"
          />
          <h2 id="book-lessons-title" className="text-2xl font-bold">
            추천 문장 연습
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
          작품 첫부분에서 고른 문장으로 빠르게 연습합니다. 작품의 모든 문장을
          순서대로 공부하려면 위의 전체 목차에서 배열 학습을 선택하세요.
        </p>

        <ol className="mt-7 grid gap-4 md:grid-cols-2">
          {book.lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <Link
                href={`/books/${book.slug}/${lesson.id}`}
                className="surface-card group flex min-h-64 flex-col p-5 no-underline transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-raised)] hover:shadow-[0_1.25rem_3.5rem_rgb(var(--shadow)/0.13)] sm:p-6"
                aria-label={`${index + 1}번 ${lesson.englishTitle} 영어 학습 시작`}
              >
                <div className="flex items-center justify-between gap-4 text-xs font-bold text-[var(--ink-soft)]">
                  <span className="font-mono text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{lesson.chapterKorean}</span>
                </div>
                <h3 className="mt-7 text-xl leading-snug font-bold tracking-[-0.025em]">
                  {lesson.englishTitle}
                </h3>
                <p className="mt-2 font-semibold">{lesson.koreanTitle}</p>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--ink-soft)]">
                  {lesson.englishPassage}
                </p>
                <span className="button button-quiet mt-auto -mr-2 self-end pt-6 text-sm group-hover:text-[var(--accent)]">
                  학습
                  <ArrowRight aria-hidden="true" size={17} weight="bold" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
