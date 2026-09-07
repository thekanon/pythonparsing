"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  C_CONCEPTS,
  SQL_CONCEPTS,
  buildWeaknessBoard,
  getOrCreateGuestId,
  listReviewedLearningContent,
  loadLocalLearningEvents,
  loadLocalStudySettings,
  type ContentItem,
  type LearningEvent,
  type WeaknessBoard,
  type WeaknessKind,
} from "@/features/exam-coach/core";

interface WeaknessSnapshot {
  generatedAt: string;
  events: readonly LearningEvent[];
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; snapshot: WeaknessSnapshot };

const DOMAIN_LABELS = {
  sql: "SQL 응용",
  "programming-language": "C 언어",
} as const;

const SIGNAL_SPECS: readonly {
  kind: WeaknessKind;
  label: string;
}[] = [
  { kind: "review-debt", label: "복습 부채" },
  { kind: "repeated-recall-failure", label: "반복 회상 실패" },
  { kind: "application-failure", label: "적용 실패" },
  { kind: "assistance-dependence", label: "도움 의존" },
];

const CONCEPT_BY_ID = new Map(
  [...SQL_CONCEPTS, ...C_CONCEPTS].map(
    (concept) => [concept.id, concept] as const,
  ),
);

// prettier-ignore
export function ExamCoachWeaknessBoard() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const learnerId = getOrCreateGuestId(window.localStorage);

        // Match the guest-data boundary used by the Today surface. A corrupt
        // settings envelope should fail through this board's explicit error state
        // instead of being silently ignored while events are still consumed.
        loadLocalStudySettings(window.localStorage, learnerId);

        setState({
          kind: "ready",
          snapshot: {
            generatedAt: new Date().toISOString(),
            events: loadLocalLearningEvents(window.localStorage, learnerId),
          },
        });
      } catch (error) {
        setState({ kind: "error", message: errorMessage(error) });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="page-shell muted" aria-live="polite">
        취약점 근거를 불러오는 중입니다.
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="page-shell">
        <p className="eyebrow">정보처리기사 실기 · 취약점 보드</p>
        <h1 className="page-title mt-3">저장된 근거를 읽지 못했습니다.</h1>
        <p className="mt-6 text-[var(--danger)]" role="alert">
          {state.message}
        </p>
      </div>
    );
  }

  const board = buildWeaknessBoard({
    events: state.snapshot.events,
    now: state.snapshot.generatedAt,
  });

  return (
    <WeaknessBoardView
      board={board}
      reviewedContent={listReviewedLearningContent()}
    />
  );
}

// Exported as a pure ready-state surface so routing/action contracts can be
// verified without manufacturing FSRS state in component tests.
export function WeaknessBoardView({
  board,
  reviewedContent,
}: {
  board: WeaknessBoard;
  reviewedContent: readonly ContentItem[];
}) {
  return (
    <div className="page-shell">
      <Link href="/exam-coach" className="button button-quiet mb-6">
        코치 홈으로
      </Link>

      <p className="eyebrow">실제 학습 근거 · 단일 취약도 점수 없음</p>
      <h1 className="page-title mt-3">SQL·C 취약점 보드</h1>
      <p className="lede mt-5">
        반복 회상 실패, 도움 의존, 적용 실패, 복습 부채를 각각 확인합니다.
        근거가 없는 항목은 가짜 0점 대신 측정 없음으로 남깁니다.
      </p>

      <section
        className="surface-card mt-10 p-6 sm:p-8"
        aria-labelledby="weakness-overview-heading"
      >
        <h2 id="weakness-overview-heading" className="text-2xl font-bold">
          현재 관찰 범위
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Metric
            label="근거 있는 개념"
            value={`${board.conceptsWithEvidence} / ${board.conceptCount}`}
          />
          <Metric
            label="생성 시각"
            value={formatDate(board.generatedAt)}
            compact
          />
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="weakness-concepts-heading">
        <h2 id="weakness-concepts-heading" className="section-title">
          개념별 근거와 다음 행동
        </h2>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          {board.entries.map((entry) => {
            const domainLabel =
              DOMAIN_LABELS[entry.domainId as keyof typeof DOMAIN_LABELS] ??
              entry.domainId;
            const firstPrerequisite = entry.prerequisiteGapConceptIds[0];
            const prerequisiteConcept = firstPrerequisite
              ? CONCEPT_BY_ID.get(firstPrerequisite)
              : undefined;
            const prerequisiteContent = firstPrerequisite
              ? reviewedContent.find((item) =>
                  item.conceptIds.includes(firstPrerequisite),
                )
              : undefined;
            const applicationFailure = entry.signals.find(
              (signal) => signal.kind === "application-failure",
            );
            const dueCardId = entry.dueCardIds[0];

            return (
              <article
                key={entry.conceptId}
                className="surface-card p-6"
                aria-labelledby={`weakness-${entry.conceptId}`}
              >
                <p className="text-xs font-bold text-[var(--accent)]">
                  {domainLabel}
                </p>
                <h3
                  id={`weakness-${entry.conceptId}`}
                  className="mt-2 text-xl font-bold"
                >
                  {entry.conceptTitle}
                </h3>
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  최근 개념 근거 {formatEvidenceDate(entry.latestEvidenceAt)}
                </p>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  {SIGNAL_SPECS.map((spec) => {
                    const signal = entry.signals.find(
                      (item) => item.kind === spec.kind,
                    );
                    return (
                      <div
                        key={spec.kind}
                        className="rounded-xl bg-[var(--surface-muted)] p-4"
                      >
                        <dt className="text-xs font-semibold text-[var(--ink-soft)]">
                          {spec.label}
                        </dt>
                        <dd className="mt-2 font-bold">
                          {signal ? `${signal.count}회` : "측정 없음"}
                        </dd>
                        <dd className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
                          {signal
                            ? spec.kind === "review-debt"
                              ? `가장 빠른 만기 ${formatEvidenceDate(signal.latestAt)}`
                              : `최근 근거 ${formatEvidenceDate(signal.latestAt)}`
                            : "근거 시각 측정 없음"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <div
                  className="mt-6 flex flex-wrap gap-3"
                  aria-label="취약점 다음 행동"
                >
                  {dueCardId ? (
                    <Link
                      href={`/exam-coach/learn?content=${encodeURIComponent(dueCardId)}`}
                      className="button button-primary"
                    >
                      만기 복습하기
                    </Link>
                  ) : (
                    <span className="text-sm leading-9 text-[var(--ink-soft)]">
                      만기 복습 없음
                    </span>
                  )}

                  <span
                    className="rounded-xl bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink-soft)]"
                    aria-disabled="true"
                  >
                    동형 문제 없음
                  </span>

                  {firstPrerequisite ? (
                    prerequisiteContent ? (
                      <Link
                        href={`/exam-coach/learn?content=${encodeURIComponent(
                          prerequisiteContent.id,
                        )}`}
                        className="button button-secondary"
                      >
                        선행 개념 보기:{" "}
                        {prerequisiteConcept?.title ?? firstPrerequisite}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Link
                          href="/exam-coach/curriculum"
                          className="button button-secondary"
                        >
                          선행 개념 보기:{" "}
                          {prerequisiteConcept?.title ?? firstPrerequisite}
                        </Link>
                        <span className="text-xs leading-5 text-[var(--ink-soft)]">
                          해당 개념의 검수 콘텐츠가 아직 없습니다.
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="text-sm leading-9 text-[var(--ink-soft)]">
                      선행 개념 결손 없음
                    </span>
                  )}
                </div>

                {applicationFailure ? (
                  <p
                    className="mt-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--ink-soft)]"
                    role="status"
                  >
                    적용 콘텐츠 준비 중
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <dt className="text-xs font-semibold text-[var(--ink-soft)]">{label}</dt>
      <dd
        className={`mt-2 font-bold ${compact ? "text-sm leading-6" : "font-mono text-2xl"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatEvidenceDate(value: string | null): string {
  return value ? formatDate(value) : "측정 없음";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
