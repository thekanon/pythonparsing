"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  EXAM_COACH_PILOT_CONCEPTS,
  buildConceptMasterySummary,
  buildDiagnosticReadinessReport,
  diagnosticMasteryEvidenceFromEvents,
  getOrCreateGuestId,
  loadLocalDiagnosticRuns,
  loadLocalLearningEvents,
  type LearningEvent,
  type LocalDiagnosticRun,
  type ReadinessMetric,
} from "@/features/exam-coach/core";

interface ReportSnapshot {
  generatedAt: string;
  events: readonly LearningEvent[];
  runs: readonly LocalDiagnosticRun[];
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; snapshot: ReportSnapshot };

const DOMAIN_LABELS = {
  sql: "SQL 응용",
  "programming-language": "C 언어",
} as const;

// prettier-ignore
export function ExamCoachReadinessReport() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const learnerId = getOrCreateGuestId(window.localStorage);
        setState({
          kind: "ready",
          snapshot: {
            generatedAt: new Date().toISOString(),
            events: loadLocalLearningEvents(window.localStorage, learnerId),
            runs: loadLocalDiagnosticRuns(window.localStorage, learnerId),
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
        준비도 근거를 불러오는 중입니다.
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="page-shell">
        <p className="eyebrow">정보처리기사 실기 · 준비도 리포트</p>
        <h1 className="page-title mt-3">저장된 근거를 읽지 못했습니다.</h1>
        <p className="mt-6 text-[var(--danger)]" role="alert">
          {state.message}
        </p>
      </div>
    );
  }

  const { snapshot } = state;
  const report = buildDiagnosticReadinessReport(
    snapshot.events,
    snapshot.generatedAt,
  );
  const evidence = diagnosticMasteryEvidenceFromEvents(snapshot.events);
  const summaries = EXAM_COACH_PILOT_CONCEPTS.map((concept) =>
    buildConceptMasterySummary(concept.id, evidence, [], snapshot.generatedAt),
  );
  const summaryByConceptId = new Map(
    summaries.map((summary) => [summary.conceptId, summary]),
  );
  const latestRun = snapshot.runs.at(-1);

  return (
    <div className="page-shell">
      <Link href="/exam-coach" className="button button-quiet mb-6">
        시작 화면으로
      </Link>

      <p className="eyebrow">실제 관찰 근거 · 합격 확률 없음</p>
      <h1 className="page-title mt-3">SQL·C 준비도 리포트</h1>
      <p className="lede mt-5">
        현재 브라우저에 기록된 학습 이벤트와 완료 진단만 집계합니다. 데이터가
        없는 항목은 0%로 만들지 않고 측정 없음으로 표시합니다.
      </p>

      <section
        className="surface-card mt-10 p-6 sm:p-8"
        aria-labelledby="readiness-overview-heading"
      >
        <h2 id="readiness-overview-heading" className="text-2xl font-bold">
          현재 관찰 범위
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="근거 있는 개념"
            value={`${report.conceptsWithEvidence} / ${report.conceptCount}`}
          />
          <Metric
            label="최근 완료 진단"
            value={latestDiagnosticScore(latestRun)}
          />
          <Metric
            label="독립 회상"
            value={formatMetric(report.independentRecall)}
          />
          <Metric
            label="독립 적용"
            value={formatMetric(report.independentApplication)}
          />
          <Metric label="복습 부채" value="FSRS 연결 후 측정" compact />
        </dl>
        <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
          진단은 정규 복습과 분리된 assessment 근거입니다. 현재 FSRS 기억 상태를
          계산하지 않으므로 복습 부채 0건이라고 표시하지 않습니다.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="domain-readiness-heading">
        <p className="eyebrow">영역별 근거</p>
        <h2 id="domain-readiness-heading" className="section-title mt-2">
          SQL·C 준비 상태
        </h2>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          {report.domains.map((domain) => {
            const label =
              DOMAIN_LABELS[
                domain.domainId as keyof typeof DOMAIN_LABELS
              ] ?? domain.domainId;

            return (
              <section
                key={domain.domainId}
                className="surface-card p-6 sm:p-8"
                aria-label={`${label} 준비도`}
              >
                <h3 className="text-xl font-bold">{label}</h3>
                <dl className="mt-5 grid grid-cols-2 gap-4">
                  <Metric
                    label="근거 개념"
                    value={`${domain.conceptsWithEvidence} / ${
                      domain.conceptCount
                    }`}
                  />
                  <Metric
                    label="평가 근거"
                    value={formatMetric(domain.assessment)}
                  />
                </dl>
                <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
                  독립 회상 {formatMetric(domain.independentRecall)} · 독립 적용{" "}
                  {formatMetric(domain.independentApplication)}
                </p>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="concept-evidence-heading">
        <p className="eyebrow">개념별 근거</p>
        <h2 id="concept-evidence-heading" className="section-title mt-2">
          진단에서 직접 확인된 개념
        </h2>
        <p className="mt-4 max-w-2xl leading-7 text-[var(--ink-soft)]">
          선수지식으로만 연결된 개념은 진단 문항에서 직접 측정되지 않았다면 근거
          없음으로 남깁니다.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {EXAM_COACH_PILOT_CONCEPTS.map((concept) => {
            const summary = summaryByConceptId.get(concept.id);
            const domainLabel =
              DOMAIN_LABELS[
                concept.domainId as keyof typeof DOMAIN_LABELS
              ] ?? concept.domainId;

            return (
              <article key={concept.id} className="surface-card p-5">
                <p className="text-xs font-bold text-[var(--accent)]">
                  {domainLabel}
                </p>
                <h3 className="mt-2 text-lg font-bold">{concept.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                  {formatAssessmentEvidence(summary?.assessment)}
                </p>
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  최근 근거 {formatEvidenceDate(summary?.latestEvidenceAt)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface-card mt-12 p-6 sm:p-8">
        <h2 className="text-xl font-bold">다음 측정</h2>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--ink-soft)]">
          정규 학습과 FSRS가 연결되기 전까지 이 화면은 진단 근거를 중심으로
          보여줍니다. 독립 회상·적용·복습 부채는 해당 이벤트가 실제로 쌓인 뒤에만
          수치가 생깁니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/exam-coach/curriculum"
            className="button button-secondary"
          >
            커리큘럼 확인
          </Link>
          <Link href="/exam-coach/followup" className="button button-secondary">
            진단 비교 보기
          </Link>
          <Link href="/exam-coach/weakness" className="button button-secondary">
            취약점 보드
          </Link>
        </div>
      </section>
    </div>
  );
}

// prettier-ignore
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
        className={`mt-2 font-bold ${
          compact ? "text-sm leading-6" : "font-mono text-2xl"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatMetric(metric: ReadinessMetric): string {
  if (metric.attempts === 0 || metric.rate === null) return "측정 없음";
  return `${metric.correct}/${metric.attempts} · ${Math.round(
    metric.rate * 100,
  )}%`;
}

function formatAssessmentEvidence(
  assessment:
    | {
        attempts: number;
        correct: number;
        independentSuccessRate: number | null;
      }
    | undefined,
): string {
  if (!assessment || assessment.attempts === 0) return "진단 근거 없음";
  return `진단 근거 ${assessment.correct}/${assessment.attempts} · ${formatRate(
    assessment.independentSuccessRate,
  )}`;
}

function formatRate(rate: number | null): string {
  return rate === null ? "측정 없음" : `${Math.round(rate * 100)}%`;
}

function formatEvidenceDate(value: string | null | undefined): string {
  if (!value) return "측정 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function latestDiagnosticScore(run: LocalDiagnosticRun | undefined): string {
  if (!run) return "측정 없음";
  return `${run.summary.correctCount}/${run.summary.expectedItemCount}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
