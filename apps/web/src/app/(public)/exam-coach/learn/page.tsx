import type { Metadata } from "next";
import Link from "next/link";

import { ExamCoachLearningSession } from "@/features/exam-coach/components/exam-coach-learning-session";
import {
  listReviewedLearningContent,
  type ContentItem,
} from "@/features/exam-coach/core";

export const metadata: Metadata = {
  title: "정규 학습 | 정보처리기사 실기 코치",
  description: "검수된 SQL·C 학습 단위를 풀고 FSRS 기억 일정을 기록합니다.",
  robots: { index: false, follow: false },
};

type LearningUnit = "sql" | "c";

interface ExamCoachLearningPageProps {
  searchParams: Promise<{
    content?: string | string[];
    unit?: string | string[];
  }>;
}

// prettier-ignore
export default async function ExamCoachLearningPage({
  searchParams,
}: ExamCoachLearningPageProps) {
  const params = await searchParams;
  const contentRequested = params.content !== undefined;
  const contentId = firstSearchValue(params.content);
  const unit = parseUnit(params.unit);
  const reviewedContent = listReviewedLearningContent();
  const selected = contentRequested
    ? selectReviewedContent(reviewedContent, contentId)
    : selectReviewedUnit(reviewedContent, unit);
  const activeUnit = selected
    ? unitForContent(selected)
    : contentRequested
      ? null
      : unit;

  return (
    <div className="page-shell">
      <p className="eyebrow">정보처리기사 실기 · 정규 학습</p>
      <h1 className="page-title mt-3">검수된 SQL·C 학습 세션</h1>
      <p className="lede mt-5">
        현재 catalog에서 review 승인이 끝난 학습 단위만 사용합니다. 첫 제출의
        독립성, 교정 도움 수준, 회상 등급을 불변 이벤트로 남기고 곧바로 FSRS
        기억 일정을 다시 계산합니다.
      </p>

      <nav
        className="mt-7 flex flex-wrap gap-3"
        aria-label="정규 학습 단위 선택"
      >
        <Link
          href="/exam-coach/learn?unit=sql"
          className={activeUnit === "sql" ? "button button-primary" : "button button-secondary"}
          aria-current={activeUnit === "sql" ? "page" : undefined}
        >
          SQL 학습 단위
        </Link>
        <Link
          href="/exam-coach/learn?unit=c"
          className={activeUnit === "c" ? "button button-primary" : "button button-secondary"}
          aria-current={activeUnit === "c" ? "page" : undefined}
        >
          C 학습 단위
        </Link>
        <Link href="/exam-coach" className="button button-quiet">
          코치 홈으로
        </Link>
      </nav>

      {selected ? (
        <ExamCoachLearningSession
          key={`${selected.id}:${selected.version}`}
          content={selected}
        />
      ) : contentRequested ? (
        <section className="surface-card mt-8 p-6 sm:p-8" role="status">
          <h2 className="text-xl font-bold">
            요청한 검수 콘텐츠를 사용할 수 없습니다.
          </h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            {contentId
              ? `${contentId}에 해당하는 review 승인 정규 학습 콘텐츠가 없습니다.`
              : "content 파라미터에 사용할 수 있는 검수 콘텐츠 ID가 없습니다."}
          </p>
        </section>
      ) : (
        <section className="surface-card mt-8 p-6 sm:p-8" role="status">
          <h2 className="text-xl font-bold">학습할 검수 콘텐츠가 없습니다.</h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            현재 선택한 영역에는 review 승인이 끝난 정규 학습 콘텐츠가 없습니다.
          </p>
        </section>
      )}
    </div>
  );
}

function firstSearchValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseUnit(value: string | string[] | undefined): LearningUnit {
  return firstSearchValue(value) === "c" ? "c" : "sql";
}

function selectReviewedContent(
  content: readonly ContentItem[],
  contentId: string | undefined,
): ContentItem | undefined {
  if (contentId === undefined) return undefined;
  return content.find((item) => item.id === contentId);
}

function selectReviewedUnit(
  content: readonly ContentItem[],
  unit: LearningUnit,
): ContentItem | undefined {
  const domainId = unit === "sql" ? "sql" : "programming-language";
  return content.find((item) => item.domainId === domainId);
}

function unitForContent(content: ContentItem): LearningUnit {
  return content.domainId === "programming-language" ? "c" : "sql";
}
