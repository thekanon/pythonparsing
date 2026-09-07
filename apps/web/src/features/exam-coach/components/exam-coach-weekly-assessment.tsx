"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import {
  WEEKLY_ASSESSMENT,
  getOrCreateGuestId,
  loadLocalDiagnosticRuns,
  type LocalDiagnosticRun,
} from "@/features/exam-coach/core";

import { useDiagnosticSession } from "./use-diagnostic-session";

const FSRS_VERSION = "ts-fsrs@5.4.1";

const CONCEPT_LABELS: Readonly<Record<string, string>> = {
  "sql-table-row-column": "SQL 테이블·행·열",
  "sql-select": "SQL SELECT와 FROM",
  "sql-where": "SQL WHERE 조건",
  "sql-group": "SQL 집계와 GROUP BY",
  "sql-join": "SQL JOIN",
  "c-value-type": "C 값·변수·자료형",
  "c-operator": "C 연산자",
  "c-control-flow": "C 조건문과 반복문",
  "c-array": "C 배열",
  "c-pointer": "C 포인터",
};

type Notice = {
  kind: "error" | "status";
  text: string;
};

export function ExamCoachWeeklyAssessment() {
  const [ready, setReady] = useState(false);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [runs, setRuns] = useState<readonly LocalDiagnosticRun[]>([]);
  const assessment = useDiagnosticSession(WEEKLY_ASSESSMENT, FSRS_VERSION);
  const { session } = assessment;
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const id = getOrCreateGuestId(window.localStorage);
        setLearnerId(id);
        setRuns(loadLocalDiagnosticRuns(window.localStorage, id));
      } catch (error) {
        setNotice({ kind: "error", text: errorMessage(error) });
      } finally {
        setReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const latestWeekly = [...runs]
    .reverse()
    .find((run) => run.summary.form === "weekly");
  const weeklySummary =
    latestWeekly?.summary.form === "weekly" ? latestWeekly.summary : null;

  function startWeeklyAssessment() {
    if (!learnerId) return;
    setNotice(null);
    assessment.start();
  }

  function submitWeeklyAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!learnerId || !session) return;
    try {
      const completedRuns = assessment.submit(learnerId);
      if (completedRuns) {
        setRuns(completedRuns);
        setNotice({
          kind: "status",
          text: "주간 미니 테스트를 완료했습니다. 답안 원문은 저장하지 않았습니다.",
        });
      } else {
        setNotice(null);
      }
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error) });
    }
  }

  if (!ready) {
    return (
      <div className="page-shell muted" aria-live="polite">
        주간 평가 기록을 불러오는 중입니다.
      </div>
    );
  }

  if (session) {
    const item = WEEKLY_ASSESSMENT.items[session.index];
    if (!item) return null;
    const last = session.index + 1 === WEEKLY_ASSESSMENT.items.length;

    return (
      <div className="page-shell">
        <p className="eyebrow">정보처리기사 실기 · 주간 평가</p>
        <h1 className="page-title mt-3">SQL·C 주간 미니 테스트</h1>
        <p className="lede mt-5">
          평가 중에는 정답·힌트·문항별 결과를 보여주지 않습니다. 모든 문항을
          마친 뒤에만 결과를 확인할 수 있습니다.
        </p>
        <p className="mt-6 font-mono text-sm font-bold text-[var(--ink-soft)]">
          {session.index + 1} / {WEEKLY_ASSESSMENT.items.length}
        </p>

        <section
          className="surface-card mt-6 p-6 sm:p-8"
          aria-labelledby="weekly-question"
        >
          <p className="text-sm font-bold text-[var(--accent)]">
            {item.domainId === "sql" ? "SQL 응용" : "프로그래밍 언어 활용"}
          </p>
          <h2 id="weekly-question" className="mt-3 text-xl leading-8 font-bold">
            {item.prompt}
          </h2>

          <form className="mt-8" onSubmit={submitWeeklyAnswer}>
            <label htmlFor="weekly-response" className="block font-bold">
              답안
            </label>
            <textarea
              id="weekly-response"
              value={session.response}
              disabled={Boolean(session.pending)}
              onChange={(event) => assessment.setResponse(event.target.value)}
              rows={5}
              autoFocus
              className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono leading-7 text-[var(--ink)]"
              aria-describedby="weekly-privacy"
            />
            <p
              id="weekly-privacy"
              className="mt-3 text-sm leading-6 text-[var(--ink-soft)]"
            >
              입력 내용은 현재 문항 채점에만 사용하며 localStorage에는 저장하지
              않습니다.
            </p>
            {notice?.kind === "error" && (
              <p
                className="mt-4 text-sm font-semibold text-[var(--danger)]"
                role="alert"
              >
                {notice.text}
              </p>
            )}
            <button type="submit" className="button button-primary mt-6">
              {session.pending
                ? "저장 다시 시도"
                : last
                  ? "주간 테스트 완료"
                  : "답안 제출 후 다음"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link href="/exam-coach" className="button button-quiet mb-6">
        코치 홈으로
      </Link>
      <p className="eyebrow">E1 · 관찰 지표</p>
      <h1 className="page-title mt-3">SQL·C 주간 미니 테스트</h1>
      <p className="lede mt-5">
        SQL과 C의 10개 개념을 약 25분 동안 점검합니다. 평가는 정규 FSRS 복습
        일정과 분리하며 합격 확률로 환산하지 않습니다.
      </p>

      {notice && (
        <div
          className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6"
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      {weeklySummary ? (
        <section
          className="surface-card mt-10 p-6 sm:p-8"
          aria-labelledby="weekly-summary"
        >
          <h2
            id="weekly-summary"
            className="text-2xl font-bold tracking-[-0.03em]"
          >
            최근 주간 결과
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric
              label="점수"
              value={`${weeklySummary.correctCount} / ${weeklySummary.expectedItemCount}`}
            />
            <Metric
              label="응답 문항"
              value={`${weeklySummary.attemptedItemCount} / ${weeklySummary.expectedItemCount}`}
            />
            <Metric
              label="총 응답시간"
              value={`${Math.round(weeklySummary.totalResponseTimeMs / 1000)}초`}
            />
          </div>
          <ul
            className="mt-8 grid gap-3 sm:grid-cols-2"
            aria-label="개념별 결과"
          >
            {weeklySummary.conceptResults.map((result) => (
              <li
                key={result.conceptId}
                className="rounded-xl bg-[var(--surface-muted)] p-4"
              >
                <span className="font-semibold">
                  {CONCEPT_LABELS[result.conceptId] ?? result.conceptId}
                </span>
                <span className="ml-2 font-mono text-sm">
                  {result.correctCount} / {result.attemptedItemCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-10 rounded-xl bg-[var(--surface-muted)] p-5 text-sm text-[var(--ink-soft)]">
          아직 완료된 주간 미니 테스트가 없습니다.
        </p>
      )}

      <button
        type="button"
        className="button button-primary mt-6"
        onClick={startWeeklyAssessment}
      >
        {weeklySummary ? "주간 미니 테스트 다시 시작" : "주간 미니 테스트 시작"}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-5">
      <p className="text-sm font-semibold text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold">{value}</p>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
