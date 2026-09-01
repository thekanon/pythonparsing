import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { PUBLIC_DOMAIN_BOOKS } from "@/features/books/catalog";
import { getPublicDomainBookText } from "@/server/book-reader";

export const metadata: Metadata = {
  title: "고전 소설 영어",
  description:
    "저작권이 만료된 키다리 아저씨와 오즈의 마법사 영어 원문을 처음부터 끝까지 읽고 공부합니다.",
};

export default function BooksPage() {
  return (
    <div className="page-shell">
      <div className="max-w-3xl">
        <p className="eyebrow">PUBLIC DOMAIN READING</p>
        <h1 className="page-title mt-3">가벼운 고전 소설로 영어 공부</h1>
        <p className="lede mt-5">
          퍼블릭 도메인 원문을 장과 편지 단위로 나눴어요. 처음부터 마지막까지
          읽고, 모르는 단어를 확인하고, 짧은 문장 배열도 연습해 보세요.
        </p>
      </div>

      <aside
        className="mt-8 rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--ink-soft)] sm:p-5"
        aria-label="고전 소설 원문 안내"
      >
        <p className="font-bold text-[var(--ink)]">원문과 번역 안내</p>
        <p className="mt-2 max-w-3xl">
          오래된 영어 원문 전체를 순서대로 읽습니다. 문장 배열 연습의 한국어
          번역은 Sentence가 학습용으로 새로 작성했으며 현대 번역본이나 삽화는
          사용하지 않습니다.
        </p>
      </aside>

      <ol className="mt-12 grid gap-5 lg:grid-cols-2">
        {PUBLIC_DOMAIN_BOOKS.map((book, index) => {
          const bookText = getPublicDomainBookText(book.slug);
          return (
            <li key={book.slug}>
              <article className="surface-card flex h-full flex-col overflow-hidden">
                <div className="border-b border-[var(--line)] bg-[var(--surface-muted)] p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-6">
                    <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--accent)]">
                      BOOK {String(index + 1).padStart(2, "0")}
                    </span>
                    <BookOpenText
                      aria-hidden="true"
                      size={34}
                      weight="duotone"
                      className="text-[var(--accent)]"
                    />
                  </div>
                  <h2 className="mt-12 text-3xl leading-tight font-[var(--font-editorial)] font-bold tracking-[-0.04em] sm:text-4xl">
                    {book.englishTitle}
                  </h2>
                  <p className="mt-3 text-lg font-bold">{book.koreanTitle}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ink-soft)]">
                    {book.author} · {book.publicationYear}
                  </p>
                </div>

                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <p className="leading-7 text-[var(--ink-soft)]">
                    {book.description}
                  </p>
                  <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-[var(--line)] py-5 text-sm">
                    <div>
                      <dt className="text-xs font-bold text-[var(--ink-soft)]">
                        전체 원문
                      </dt>
                      <dd className="mt-1 font-bold">
                        {bookText
                          ? `${bookText.sections.length}개 · 약 ${Math.round(bookText.totalWords / 1000)}천 단어`
                          : "전체 수록"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-[var(--ink-soft)]">
                        읽기 감각
                      </dt>
                      <dd className="mt-1 font-bold">{book.readingLevel}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-7">
                    <Link
                      href={`/books/${book.slug}`}
                      className="button button-primary"
                    >
                      작품 읽기
                      <ArrowRight aria-hidden="true" size={18} weight="bold" />
                    </Link>
                    <a
                      href={book.gutenbergUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-quiet text-sm"
                    >
                      영어 원문
                      <ArrowUpRight
                        aria-hidden="true"
                        size={17}
                        weight="bold"
                      />
                    </a>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
