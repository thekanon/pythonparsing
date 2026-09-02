"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import {
  FOLLOWUP_DIAGNOSTIC,
  appendLocalDiagnosticRun,
  appendLocalLearningEvent,
  compareDiagnosticRuns,
  getOrCreateGuestId,
  loadLocalDiagnosticRuns,
  recordDiagnosticAttempt,
  summarizeDiagnosticRun,
  type DiagnosticAttemptRecord,
  type LocalDiagnosticRun,
} from "@/features/exam-coach/core";

const FSRS_VERSION = "pending-adapter";

const PAIR_LABELS: Readonly<Record<string, string>> = {
  "sql-filter": "SQL 조건 조회",
  "sql-group": "SQL 집계",
  "sql-join": "SQL 조인",
  "c-control": "C 제어 흐름",
  "c-array": "C 배열",
  "c-pointer": "C 포인터",
};

interface FollowupSession {
  index: number;
  attempts: readonly DiagnosticAttemptRecord[];
  response: string;
  startedAt: number;
  runId: string;
}

type Notice = {
  kind: "error" | "status";
  text: string;
};

// prettier-ignore
export function ExamCoachFollowupDiagnostic() {
  const [ready, setReady] = useState(false);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [runs, setRuns] = useState<readonly LocalDiagnosticRun[]>([]);
  const [session, setSession] = useState<FollowupSession | null>(null);
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

  const latestRuns = [...runs].reverse();
  const baseline = latestRuns.find((run) => run.summary.form === "baseline");
  const followup = baseline
    ? latestRuns.find(
        (run) =>
          run.summary.form === "followup" &&
          Date.parse(run.completedAt) >= Date.parse(baseline.completedAt),
      )
    : undefined;
  const comparison =
    baseline && followup
      ? compareDiagnosticRuns(baseline.summary, followup.summary)
      : null;

  function startFollowup() {
    if (!learnerId || !baseline) return;

    setNotice(null);
    setSession({
      index: 0,
      attempts: [],
      response: "",
      startedAt: performance.now(),
      runId: `followup-${crypto.randomUUID()}`,
    });
  }

  function submitFollowup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!learnerId || !session) return;

    const item = FOLLOWUP_DIAGNOSTIC.items[session.index];
    if (!item) {
      setNotice({ kind: "error", text: "종료 진단 문항을 불러오지 못했습니다." });
      return;
    }
    if (!session.response.trim()) {
      setNotice({ kind: "error", text: "답안을 입력한 뒤 제출해 주세요." });
      return;
    }

    try {
      const attempt = recordDiagnosticAttempt(item, session.response, {
        eventId: `event-${crypto.randomUUID()}`,
        learnerId,
        occurredAt: new Date().toISOString(),
        responseTimeMs: Math.max(
          0,
          Math.round(performance.now() - session.startedAt),
        ),
        fsrsVersion: FSRS_VERSION,
      });
      appendLocalLearningEvent(window.localStorage, learnerId, attempt.event);
      const attempts = [...session.attempts, attempt];

      if (session.index + 1 === FOLLOWUP_DIAGNOSTIC.items.length) {
        const summary = summarizeDiagnosticRun(FOLLOWUP_DIAGNOSTIC, attempts);
        setRuns(
          appendLocalDiagnosticRun(
            window.localStorage,
            learnerId,
            session.runId,
            new Date().toISOString(),
            summary,
          ),
        );
        setSession(null);
        setNotice({
          kind: "status",
          text: "종료 동형 진단을 완료했습니다. 기준선과 비교 결과를 확인할 수 있습니다.",
        });
        return;
      }

      setSession({
        ...session,
        index: session.index + 1,
        attempts,
        response: "",
        startedAt: performance.now(),
      });
      setNotice(null);
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error) });
    }
  }

  if (!ready) {
    return (
      <div className="page-shell muted" aria-live="polite">
        진단 기록을 불러오는 중입니다.
      </div>
    );
  }

  if (session) {
    const item = FOLLOWUP_DIAGNOSTIC.items[session.index];
    if (!item) return null;
    const last = session.index + 1 === FOLLOWUP_DIAGNOSTIC.items.length;

    return (
      <div className="page-shell">
        <p className="eyebrow">정보처리기사 실기 · 종료 동형 진단</p>
        <h1 className="page-title mt-3">SQL·C 변화 확인</h1>
        <p className="lede mt-5">
          기준선과 같은 기술쌍을 다른 문항으로 다시 측정합니다. 진단 중에는
          정답·힌트·문항별 채점 결과를 보여주지 않습니다.
        </p>
        <p className="mt-6 font-mono text-sm font-bold text-[var(--ink-soft)]">
          {session.index + 1} / {FOLLOWUP_DIAGNOSTIC.items.length}
        </p>

        <section
          className="surface-card mt-6 p-6 sm:p-8"
          aria-labelledby="followup-question"
        >
          <p className="text-sm font-bold text-[var(--accent)]">
            {item.domainId === "sql" ? "SQL 응용" : "프로그래밍 언어 활용"}
          </p>
          <h2
            id="followup-question"
            className="mt-3 text-xl font-bold leading-8"
          >
            {item.prompt}
          </h2>

          <form className="mt-8" onSubmit={submitFollowup}>
            <label htmlFor="followup-response" className="block font-bold">
              답안
            </label>
            <textarea
              id="followup-response"
              value={session.response}
              onChange={(event) =>
                setSession({ ...session, response: event.target.value })
              }
              rows={5}
              autoFocus
              className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono leading-7 text-[var(--ink)]"
              aria-describedby="followup-privacy"
            />
            <p
              id="followup-privacy"
              className="mt-3 text-sm leading-6 text-[var(--ink-soft)]"
            >
              제출 답안 원문은 현재 문항 채점에만 사용하고 장기 저장하지 않습니다.
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
              {last ? "종료 진단 완료" : "답안 제출 후 다음"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  const timeDeltaSeconds =
    baseline && followup
      ? Math.round(
          (followup.summary.totalResponseTimeMs -
            baseline.summary.totalResponseTimeMs) /
            1000,
        )
      : null;

  return (
    <div className="page-shell">
      <Link href="/exam-coach" className="button button-quiet mb-6">
        시작 화면으로
      </Link>
      <p className="eyebrow">8주 개인 검증 · 동형 평가</p>
      <h1 className="page-title mt-3">기준선과 종료 진단 비교</h1>
      <p className="lede mt-5">
        같은 SQL·C 기술쌍을 다른 문제로 다시 측정해 정확도와 수행 시간의 변화를
        확인합니다. 이 결과를 합격 확률로 환산하지 않습니다.
      </p>

      {notice && (
        <div
          className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6"
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      {!baseline ? (
        <section
          className="surface-card mt-10 p-6 sm:p-8"
          aria-labelledby="baseline-required"
        >
          <h2
            id="baseline-required"
            className="text-2xl font-bold tracking-[-0.03em]"
          >
            기준선 진단이 먼저 필요합니다.
          </h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            종료 진단은 시작점을 비교하는 평가이므로 같은 브라우저에서 기준선
            진단을 먼저 완료해 주세요.
          </p>
          <Link href="/exam-coach" className="button button-primary mt-6">
            기준선 진단으로 돌아가기
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <DiagnosticSummaryCard
              label="기준선"
              run={baseline}
            />
            {followup ? (
              <DiagnosticSummaryCard
                label="종료 동형"
                run={followup}
              />
            ) : (
              <section className="surface-card p-6 sm:p-8">
                <h2 className="text-xl font-bold">종료 동형 진단</h2>
                <p className="mt-3 leading-7 text-[var(--ink-soft)]">
                  약 18분, SQL 3문항과 C 3문항입니다. 8주 검증 종료 시점에
                  수행하는 것을 권장합니다.
                </p>
                <p className="mt-5 text-sm text-[var(--ink-soft)]">
                  기준선 완료됨 · 비교 준비 완료
                </p>
              </section>
            )}
          </div>

          <button
            type="button"
            className="button button-primary mt-6"
            onClick={startFollowup}
          >
            {followup ? "종료 동형 진단 다시 시작" : "종료 동형 진단 시작"}
          </button>

          {comparison && followup && (
            <section
              className="surface-card mt-10 p-6 sm:p-8"
              aria-labelledby="comparison-heading"
            >
              <h2
                id="comparison-heading"
                className="text-2xl font-bold tracking-[-0.03em]"
              >
                실제 측정 변화
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Metric
                  label="기준선 정확도"
                  value={`${Math.round(comparison.baselineAccuracy * 100)}%`}
                />
                <Metric
                  label="종료 정확도"
                  value={`${Math.round(comparison.followupAccuracy * 100)}%`}
                />
                <Metric
                  label="정확도 변화"
                  value={formatPercentagePoint(comparison.accuracyDelta)}
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
                총 응답시간 변화: {formatSecondsDelta(timeDeltaSeconds ?? 0)}
              </p>

              <div
                className="mt-8 overflow-x-auto"
                role="region"
                aria-label="기술쌍별 진단 변화"
                tabIndex={0}
              >
                <table className="w-full min-w-[34rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-sm text-[var(--ink-soft)]">
                      <th className="px-3 py-3 font-semibold">기술쌍</th>
                      <th className="px-3 py-3 font-semibold">기준선</th>
                      <th className="px-3 py-3 font-semibold">종료</th>
                      <th className="px-3 py-3 font-semibold">변화</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.pairChanges.map((pair) => (
                      <tr
                        key={pair.pairId}
                        className="border-b border-[var(--line)]"
                      >
                        <th className="px-3 py-4 font-semibold">
                          {PAIR_LABELS[pair.pairId] ?? pair.pairId}
                        </th>
                        <td className="px-3 py-4">
                          {pair.baselineCorrect ? "정답" : "오답"}
                        </td>
                        <td className="px-3 py-4">
                          {pair.followupCorrect ? "정답" : "오답"}
                        </td>
                        <td className="px-3 py-4 font-semibold">
                          {pairChangeLabel(
                            pair.baselineCorrect,
                            pair.followupCorrect,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DiagnosticSummaryCard({
  label,
  run,
}: {
  label: string;
  run: LocalDiagnosticRun;
}) {
  return (
    <section className="surface-card p-6 sm:p-8">
      <p className="text-sm font-bold text-[var(--ink-soft)]">{label}</p>
      <p className="mt-3 font-mono text-4xl font-bold">
        {run.summary.correctCount} / {run.summary.expectedItemCount}
      </p>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        정확도 {Math.round((run.summary.accuracy ?? 0) * 100)}% · 총 응답{" "}
        {Math.round(run.summary.totalResponseTimeMs / 1000)}초
      </p>
    </section>
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

function pairChangeLabel(
  baselineCorrect: boolean,
  followupCorrect: boolean,
): string {
  if (!baselineCorrect && followupCorrect) return "개선";
  if (baselineCorrect && !followupCorrect) return "하락";
  return followupCorrect ? "정답 유지" : "오답 유지";
}

function formatPercentagePoint(delta: number): string {
  const points = Math.round(delta * 100);
  return `${points > 0 ? "+" : ""}${points}%p`;
}

function formatSecondsDelta(deltaSeconds: number): string {
  if (deltaSeconds === 0) return "동일";
  const direction = deltaSeconds < 0 ? "단축" : "증가";
  return `${Math.abs(deltaSeconds)}초 ${direction}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
