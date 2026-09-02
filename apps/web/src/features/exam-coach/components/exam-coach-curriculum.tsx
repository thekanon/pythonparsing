import Link from "next/link";

import {
  C_CONCEPTS,
  OFFICIAL_OBJECTIVES_2026,
  OFFICIAL_SCOPE_SOURCE_2026,
  SQL_CONCEPTS,
  type ConceptNode,
} from "@/features/exam-coach/core";

const ACTIVE_DOMAIN_IDS = new Set(["sql", "programming-language"]);
const ALL_CONCEPTS = [...SQL_CONCEPTS, ...C_CONCEPTS];
const CONCEPT_TITLE_BY_ID = new Map(
  ALL_CONCEPTS.map((concept) => [concept.id, concept.title]),
);

// prettier-ignore
export function ExamCoachCurriculum() {
  const activeDomainCount = OFFICIAL_OBJECTIVES_2026.filter((objective) =>
    ACTIVE_DOMAIN_IDS.has(objective.id),
  ).length;

  return (
    <div className="page-shell">
      <Link href="/exam-coach" className="button button-quiet mb-6">
        시작 화면으로
      </Link>
      <p className="eyebrow">2026 공식 범위 · 개인 검증 경로</p>
      <h1 className="page-title mt-3">정보처리기사 실기 커리큘럼</h1>
      <p className="lede mt-5">
        공식 12개 영역은 누락을 확인하는 범위 지도이고, 실제 학습 순서는 별도의
        선수지식 그래프로 관리합니다. 현재 개인 검증은 SQL과 C 언어 경로만
        구현합니다.
      </p>

      <section
        className="surface-card mt-10 p-6 sm:p-8"
        aria-labelledby="curriculum-summary"
      >
        <h2 id="curriculum-summary" className="text-xl font-bold">
          현재 구현 범위
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="공식 영역" value={`${OFFICIAL_OBJECTIVES_2026.length}개`} />
          <Metric
            label="학습 경로 정의"
            value={`${activeDomainCount} / ${OFFICIAL_OBJECTIVES_2026.length}`}
          />
          <Metric label="선수지식 노드" value={`${ALL_CONCEPTS.length}개`} />
        </dl>
        <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
          경로가 정의됐다는 사실과 공개 가능한 검수 콘텐츠가 충분하다는 사실은
          다릅니다. 콘텐츠 커버리지는 별도 검수 근거가 있을 때만 표시합니다.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="official-scope-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">범위 지도</p>
          <h2
            id="official-scope-heading"
            className="section-title mt-2"
          >
            2026 공식 12개 영역
          </h2>
        </div>
        <ol
          className="mt-7 grid gap-4 md:grid-cols-2"
          aria-label="2026 공식 12개 영역"
        >
          {OFFICIAL_OBJECTIVES_2026.map((objective) => {
            const active = ACTIVE_DOMAIN_IDS.has(objective.id);
            return (
              <li key={objective.id} className="surface-card list-none p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs font-bold text-[var(--ink-soft)]">
                      {String(objective.order).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{objective.nameKo}</h3>
                  </div>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold">
                    {active ? "현재 개인 검증 범위" : "향후 확장"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
                  {objective.detailTopics.join(" · ")}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-14" aria-labelledby="learning-path-heading">
        <p className="eyebrow">학습 순서</p>
        <h2 id="learning-path-heading" className="section-title mt-2">
          SQL·C 선수지식 그래프
        </h2>
        <p className="mt-4 max-w-2xl leading-7 text-[var(--ink-soft)]">
          아래 순서는 공식 영역의 번호가 아니라, 다음 개념을 이해하기 위해 필요한
          선수지식 관계입니다.
        </p>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <ConceptPath title="SQL 응용" concepts={SQL_CONCEPTS} />
          <ConceptPath title="C 언어" concepts={C_CONCEPTS} />
        </div>
      </section>

      <section
        className="surface-card mt-12 p-6 sm:p-8"
        aria-labelledby="scope-source-heading"
      >
        <h2 id="scope-source-heading" className="text-xl font-bold">
          공식 범위 근거
        </h2>
        <p className="mt-3 leading-7 text-[var(--ink-soft)]">
          {OFFICIAL_SCOPE_SOURCE_2026.authority} · 확인일{" "}
          {OFFICIAL_SCOPE_SOURCE_2026.checkedAt} · 적용기간{" "}
          {OFFICIAL_SCOPE_SOURCE_2026.validFrom} ~{" "}
          {OFFICIAL_SCOPE_SOURCE_2026.validTo}
        </p>
        <a
          href={OFFICIAL_SCOPE_SOURCE_2026.url}
          className="button button-secondary mt-5"
        >
          Q-Net 공식 종목 정보 확인
        </a>
      </section>
    </div>
  );
}

// prettier-ignore
function ConceptPath({
  title,
  concepts,
}: {
  title: string;
  concepts: readonly ConceptNode[];
}) {
  return (
    <section className="surface-card p-6 sm:p-8" aria-label={`${title} 학습 경로`}>
      <h3 className="text-xl font-bold">{title}</h3>
      <ol className="mt-6 grid gap-3">
        {concepts.map((concept, index) => (
          <li
            key={concept.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <p className="text-sm font-bold text-[var(--accent)]">
              {index + 1}. {concept.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              {concept.prerequisites.length === 0
                ? "선수지식 없음"
                : `선수지식: ${concept.prerequisites
                    .map(
                      (prerequisite) =>
                        CONCEPT_TITLE_BY_ID.get(prerequisite) ?? prerequisite,
                    )
                    .join(", ")}`}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-5">
      <dt className="text-sm font-semibold text-[var(--ink-soft)]">{label}</dt>
      <dd className="mt-2 font-mono text-3xl font-bold">{value}</dd>
    </div>
  );
}
