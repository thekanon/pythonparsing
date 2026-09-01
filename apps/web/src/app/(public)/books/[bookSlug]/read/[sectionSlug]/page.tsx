import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookReaderText } from "@/components/books/book-reader-text";
import { BookReadingTracker } from "@/components/books/book-reading-tracker";
import {
  getPublicDomainBookSection,
  getPublicDomainBookSectionParams,
} from "@/server/book-reader";

type BookReaderPageProps = {
  params: Promise<{ bookSlug: string; sectionSlug: string }>;
};

export function generateStaticParams() {
  return getPublicDomainBookSectionParams();
}

export async function generateMetadata({
  params,
}: BookReaderPageProps): Promise<Metadata> {
  const { bookSlug, sectionSlug } = await params;
  const view = getPublicDomainBookSection(bookSlug, sectionSlug);
  if (!view) return {};
  return {
    title: `${view.section.englishTitle} · ${view.book.koreanTitle}`,
    description: `${view.book.englishTitle} ${view.section.label} 영어 원문을 읽고 모르는 단어의 뜻을 확인합니다.`,
  };
}

function sectionHref(bookSlug: string, sectionSlug: string) {
  return `/books/${bookSlug}/read/${sectionSlug}`;
}

export default async function BookReaderPage({ params }: BookReaderPageProps) {
  const { bookSlug, sectionSlug } = await params;
  const view = getPublicDomainBookSection(bookSlug, sectionSlug);
  if (!view) notFound();

  const progress = Math.round((view.position / view.total) * 100);
  const wordCount = new Intl.NumberFormat("ko-KR").format(
    view.section.wordCount,
  );

  return (
    <div className="page-shell max-w-[74rem]">
      <BookReadingTracker
        bookSlug={view.book.slug}
        sectionSlug={view.section.slug}
      />

      <nav
        aria-label="현재 위치"
        className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]"
      >
        <Link href="/books">고전 소설 영어</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/books/${view.book.slug}`}>{view.book.koreanTitle}</Link>
        <span aria-hidden="true">/</span>
        <span>{view.section.label}</span>
      </nav>

      <header className="mt-8 border-b border-[var(--line)] pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{view.section.label.toUpperCase()}</p>
            <h1 className="mt-3 max-w-[22ch] text-[clamp(2.15rem,5vw,4.5rem)] leading-[1.04] font-[var(--font-editorial)] font-bold tracking-[-0.045em] text-balance">
              {view.section.englishTitle}
            </h1>
            <p className="mt-4 text-lg font-bold">{view.section.koreanTitle}</p>
          </div>
          <Link
            href={`/books/${view.book.slug}#full-book-index`}
            className="button button-secondary self-start text-sm sm:self-auto"
          >
            <ListBullets aria-hidden="true" size={18} weight="bold" />
            전체 목차
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[var(--ink-soft)]">
          <span>
            {view.position}/{view.total} · 약 {wordCount}단어
          </span>
          <span>{progress}%</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
          role="progressbar"
          aria-label={`${view.book.koreanTitle} 읽기 진도`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <article className="surface-card overflow-hidden px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
          <BookReaderText
            paragraphs={view.section.paragraphs}
            sectionId={view.section.id}
          />
        </article>

        <aside className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--ink-soft)] lg:sticky lg:top-24">
          <BookOpenText
            aria-hidden="true"
            size={24}
            weight="duotone"
            className="text-[var(--accent)]"
          />
          <p className="mt-4 font-bold text-[var(--ink)]">읽는 방법</p>
          <p className="mt-2">
            PC에서는 모르는 영단어를 더블클릭하고, 모바일에서는 단어를 한 번
            누르면 한국어 뜻을 볼 수 있습니다.
          </p>
          <p className="mt-4 border-t border-[var(--line)] pt-4 text-xs leading-5">
            현재 위치와 스크롤은 이 브라우저에만 자동 저장됩니다. 원문: Project
            Gutenberg eBook #{view.book.gutenbergEbookNumber}
          </p>
        </aside>
      </main>

      <nav
        aria-label="작품 읽기 이동"
        className="mt-10 grid gap-3 border-t border-[var(--line)] pt-8 sm:grid-cols-2"
      >
        {view.previousSectionSlug ? (
          <Link
            href={sectionHref(view.book.slug, view.previousSectionSlug)}
            className="button button-secondary justify-start whitespace-normal"
          >
            <ArrowLeft aria-hidden="true" size={18} weight="bold" />
            이전 구획
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        {view.nextSectionSlug ? (
          <Link
            href={sectionHref(view.book.slug, view.nextSectionSlug)}
            className="button button-primary justify-end whitespace-normal"
          >
            다음 구획
            <ArrowRight aria-hidden="true" size={18} weight="bold" />
          </Link>
        ) : (
          <Link
            href={`/books/${view.book.slug}`}
            className="button button-primary justify-end whitespace-normal"
          >
            작품 끝 · 목차로
            <ArrowRight aria-hidden="true" size={18} weight="bold" />
          </Link>
        )}
      </nav>
    </div>
  );
}
