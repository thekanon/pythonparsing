import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { formatKoreanDate } from "@/server/domain/date";
import { getLatestRedditLearningDigest } from "@/server/queries/reddit-learning";

export const metadata: Metadata = {
  title: "Reddit 영어 토픽",
  description: "Reddit 주요 토픽을 짧은 영문 지문과 한국어 해설로 공부합니다.",
  robots: { index: false, follow: true },
};

function DigestLoading() {
  return (
    <div className="mt-12 grid gap-10" aria-label="Reddit 학습을 불러오는 중">
      {[0, 1].map((item) => (
        <section key={item} aria-hidden="true">
          <div className="skeleton h-8 w-44" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="skeleton h-72 w-full" />
            <div className="skeleton h-72 w-full" />
          </div>
        </section>
      ))}
    </div>
  );
}

async function RedditLearningDigest() {
  const digest = await getLatestRedditLearningDigest();

  if (!digest) {
    return (
      <div className="surface-card mt-12 p-8 sm:p-12">
        <BookOpenText
          aria-hidden="true"
          size={30}
          weight="duotone"
          className="text-[var(--accent)]"
        />
        <h2 className="mt-5 text-xl font-bold">학습 자료를 준비하고 있습니다.</h2>
        <p className="mt-3 max-w-xl leading-7 text-[var(--ink-soft)]">
          다음 수집에서 영문 지문 생성이 끝나면 이곳에 토픽별 학습 카드가
          표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-14">
      <p className="-mb-7 text-sm font-semibold text-[var(--ink-soft)]">
        수집 기준 {formatKoreanDate(digest.collectionDate)}
      </p>
      {digest.communities.map((community) => (
        <section
          key={community.slug}
          aria-labelledby={`community-${community.slug}`}
        >
          <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id={`community-${community.slug}`}
                className="text-2xl font-bold tracking-[-0.03em]"
              >
                r/{community.slug}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                인기 게시물 {community.analyzedPostCount}개에서 찾은 학습 토픽
              </p>
            </div>
            <a
              href={community.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-1 text-sm font-bold text-[var(--accent)] sm:self-auto"
            >
              커뮤니티 원문
              <ArrowUpRight aria-hidden="true" size={16} weight="bold" />
            </a>
          </div>

          <ol className="mt-5 grid gap-4 md:grid-cols-2">
            {community.topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/reddit/${topic.id}`}
                  className="surface-card group flex min-h-72 flex-col p-5 no-underline transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-raised)] hover:shadow-[0_1.25rem_3.5rem_rgb(var(--shadow)/0.13)] sm:p-6"
                  aria-label={`${topic.englishTitle} 영어 학습 시작`}
                >
                  <div className="flex items-center justify-between gap-4 text-xs font-bold text-[var(--ink-soft)]">
                    <span className="font-mono text-[var(--accent)]">
                      {String(topic.rank).padStart(2, "0")}
                    </span>
                    <span>근거 게시물 {topic.supportingPostCount}개</span>
                  </div>
                  <h3 className="mt-6 text-xl leading-snug font-bold tracking-[-0.025em]">
                    {topic.englishTitle}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--ink-soft)]">
                    {topic.englishPassage}
                  </p>
                  <p className="mt-4 text-sm font-semibold">
                    {topic.koreanTitleTranslation}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                    <span className="line-clamp-1 text-xs font-semibold text-[var(--ink-soft)]">
                      {topic.expressions.map((item) => item.phrase).join(", ")}
                    </span>
                    <span className="button button-quiet -mr-2 shrink-0 text-sm group-hover:text-[var(--accent)]">
                      학습
                      <ArrowRight aria-hidden="true" size={17} weight="bold" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default function RedditLearningPage() {
  return (
    <div className="page-shell">
      <div>
        <p className="eyebrow">REDDIT ENGLISH</p>
        <h1 className="page-title mt-3">Reddit 주요 토픽으로 영어 공부</h1>
        <p className="lede mt-5">
          매일 네 개 커뮤니티의 주요 논의를 짧은 영문 지문으로 공부해요.
        </p>
      </div>

      <aside
        className="mt-8 rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--ink-soft)] sm:p-5"
        aria-label="Reddit 학습 자료 안내"
      >
        <p className="font-bold text-[var(--ink)]">AI 학습 자료 안내</p>
        <p className="mt-2 max-w-3xl">
          Reddit 공식 번역이나 원문 인용이 아닙니다. 공개 게시물의 반복 토픽을
          바탕으로 AI가 새 영문 지문과 한국어 해설을 만들었습니다. 이 페이지를
          열어도 Reddit에 추가 요청을 보내지 않습니다.
        </p>
      </aside>

      <Suspense fallback={<DigestLoading />}>
        <RedditLearningDigest />
      </Suspense>
    </div>
  );
}
