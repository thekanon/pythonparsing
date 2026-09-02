"use client";

import { type FormEvent, useEffect, useState } from "react";

import {
  BASELINE_DIAGNOSTIC,
  appendLocalDiagnosticRun,
  appendLocalLearningEvent,
  getOrCreateGuestId,
  loadLocalDiagnosticRuns,
  loadLocalStudySettings,
  recordDiagnosticAttempt,
  resetAllLocalGuestData,
  saveLocalStudySettings,
  summarizeDiagnosticRun,
  type DiagnosticAttemptRecord,
  type LocalDiagnosticRun,
  type LocalStudySettings,
} from "@/features/exam-coach/core";

const FSRS_VERSION = "pending-adapter";

interface DiagnosticSession {
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
export function ExamCoachGuestToday() {
  const [ready, setReady] = useState(false);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LocalStudySettings | null>(null);
  const [runs, setRuns] = useState<readonly LocalDiagnosticRun[]>([]);
  const [examDate, setExamDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState("45");
  const [diagnostic, setDiagnostic] = useState<DiagnosticSession | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const id = getOrCreateGuestId(window.localStorage);
        const saved = loadLocalStudySettings(window.localStorage, id);
        setLearnerId(id);
        setSettings(saved);
        setRuns(loadLocalDiagnosticRuns(window.localStorage, id));
        if (saved) {
          setExamDate(saved.examDate);
          setDailyMinutes(String(saved.dailyMinutes));
        }
      } catch (error) {
        setNotice({ kind: "error", text: errorMessage(error) });
      } finally {
        setReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const baseline = [...runs]
    .reverse()
    .find((run) => run.summary.form === "baseline");

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!learnerId) return;

    const minutes = Number(dailyMinutes);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 180) {
      setNotice({
        kind: "error",
        text: "하루 학습 시간은 15분에서 180분 사이로 입력해 주세요.",
      });
      return;
    }

    try {
      const saved = saveLocalStudySettings(window.localStorage, learnerId, {
        examDate,
        dailyMinutes: minutes,
        updatedAt: new Date().toISOString(),
      });
      setSettings(saved);
      setNotice({
        kind: "status",
        text: "학습 설정을 이 브라우저에 저장했습니다.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error) });
    }
  }

  function startDiagnostic() {
    if (!learnerId) return;

    setNotice(null);
    setDiagnostic({
      index: 0,
      attempts: [],
      response: "",
      startedAt: performance.now(),
      runId: `baseline-${crypto.randomUUID()}`,
    });
  }

  function submitDiagnostic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!learnerId || !diagnostic) return;

    const item = BASELINE_DIAGNOSTIC.items[diagnostic.index];
    if (!item) {
      setNotice({ kind: "error", text: "진단 문항을 불러오지 못했습니다." });
      return;
    }
    if (!diagnostic.response.trim()) {
      setNotice({ kind: "error", text: "답안을 입력한 뒤 제출해 주세요." });
      return;
    }

    try {
      const attempt = recordDiagnosticAttempt(item, diagnostic.response, {
        eventId: `event-${crypto.randomUUID()}`,
        learnerId,
        occurredAt: new Date().toISOString(),
        responseTimeMs: Math.max(
          0,
          Math.round(performance.now() - diagnostic.startedAt),
        ),
        fsrsVersion: FSRS_VERSION,
      });
      appendLocalLearningEvent(window.localStorage, learnerId, attempt.event);
      const attempts = [...diagnostic.attempts, attempt];

      if (diagnostic.index + 1 === BASELINE_DIAGNOSTIC.items.length) {
        const summary = summarizeDiagnosticRun(BASELINE_DIAGNOSTIC, attempts);
        setRuns(
          appendLocalDiagnosticRun(
            window.localStorage,
            learnerId,
            diagnostic.runId,
            new Date().toISOString(),
            summary,
          ),
        );
        setDiagnostic(null);
        setNotice({
          kind: "status",
          text: "기준선 진단을 완료했습니다. 제출 답안 원문은 저장하지 않았습니다.",
        });
        return;
      }

      setDiagnostic({
        ...diagnostic,
        index: diagnostic.index + 1,
        attempts,
        response: "",
        startedAt: performance.now(),
      });
      setNotice(null);
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error) });
    }
  }

  function resetData() {
    resetAllLocalGuestData(window.localStorage);
    setLearnerId(getOrCreateGuestId(window.localStorage));
    setSettings(null);
    setRuns([]);
    setDiagnostic(null);
    setExamDate("");
    setDailyMinutes("45");
    setNotice({
      kind: "status",
      text: "정보처리기사 코치의 로컬 학습 데이터를 초기화했습니다.",
    });
  }

  if (!ready) {
    return (
      <div className="page-shell muted" aria-live="polite">
        학습 기록을 불러오는 중입니다.
      </div>
    );
  }

  if (diagnostic) {
    const item = BASELINE_DIAGNOSTIC.items[diagnostic.index];
    if (!item) return null;
    const last = diagnostic.index + 1 === BASELINE_DIAGNOSTIC.items.length;

    return (
      <div className="page-shell">
        <p className="eyebrow">정보처리기사 실기 · 기준선 진단</p>
        <h1 className="page-title mt-3">SQL·C 현재 상태 확인</h1>
        <p className="lede mt-5">
          진단 중에는 정답·힌트·채점 결과를 보여주지 않으며 제출 답안 원문을
          장기 저장하지 않습니다.
        </p>
        <p className="mt-6 font-mono text-sm font-bold text-[var(--ink-soft)]">
          {diagnostic.index + 1} / {BASELINE_DIAGNOSTIC.items.length}
        </p>

        <section
          className="surface-card mt-6 p-6 sm:p-8"
          aria-labelledby="diagnostic-question"
        >
          <p className="text-sm font-bold text-[var(--accent)]">
            {item.domainId === "sql" ? "SQL 응용" : "프로그래밍 언어 활용"}
          </p>
          <h2
            id="diagnostic-question"
            className="mt-3 text-xl font-bold leading-8"
          >
            {item.prompt}
          </h2>

          <form className="mt-8" onSubmit={submitDiagnostic}>
            <label htmlFor="diagnostic-response" className="block font-bold">
              답안
            </label>
            <textarea
              id="diagnostic-response"
              value={diagnostic.response}
              onChange={(event) =>
                setDiagnostic({ ...diagnostic, response: event.target.value })
              }
              rows={5}
              autoFocus
              className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono leading-7 text-[var(--ink)]"
              aria-describedby="diagnostic-privacy"
            />
            <p
              id="diagnostic-privacy"
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
              {last ? "진단 완료" : "답안 제출 후 다음"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <p className="eyebrow">개인 검증용 · SQL + C</p>
      <h1 className="page-title mt-3">정보처리기사 실기 합격 코치</h1>
      <p className="lede mt-5">
        시험일까지의 시간과 현재 실력을 먼저 기록합니다. 학습 데이터는 기존
        영어 학습 기록과 분리된 브라우저 저장소를 사용합니다.
      </p>

      {notice && (
        <div
          className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6"
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section
          className="surface-card p-6 sm:p-8"
          aria-labelledby="study-settings-heading"
        >
          <h2
            id="study-settings-heading"
            className="text-2xl font-bold tracking-[-0.03em]"
          >
            학습 설정
          </h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            시험 예정일과 하루 학습 가능 시간을 오늘 계획의 시간 상한으로
            사용합니다.
          </p>
          <form className="mt-7 grid gap-5" onSubmit={saveSettings}>
            <label className="grid gap-2 font-semibold">
              시험 예정일
              <input
                type="date"
                required
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[var(--ink)]"
              />
            </label>
            <label className="grid gap-2 font-semibold">
              하루 학습 가능 시간(분)
              <input
                type="number"
                required
                min={15}
                max={180}
                step={5}
                value={dailyMinutes}
                onChange={(event) => setDailyMinutes(event.target.value)}
                className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[var(--ink)]"
              />
            </label>
            <button
              type="submit"
              className="button button-primary justify-self-start"
            >
              설정 저장
            </button>
          </form>
          {settings && (
            <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
              현재 설정: {settings.examDate}까지 하루 {settings.dailyMinutes}분
            </p>
          )}
        </section>

        <section
          className="surface-card p-6 sm:p-8"
          aria-labelledby="baseline-heading"
        >
          <h2
            id="baseline-heading"
            className="text-2xl font-bold tracking-[-0.03em]"
          >
            기준선 진단
          </h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            SQL 3문항과 C 3문항을 약 18분 동안 풀어 시작점을 남깁니다. 진단은
            정규 FSRS 복습 일정을 직접 변경하지 않습니다.
          </p>
          {baseline ? (
            <div className="mt-7 rounded-xl bg-[var(--surface-muted)] p-5">
              <p className="text-sm font-bold text-[var(--ink-soft)]">
                최근 기준선
              </p>
              <p className="mt-2 font-mono text-4xl font-bold">
                {baseline.summary.correctCount} /{" "}
                {baseline.summary.expectedItemCount}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                정확도 {Math.round((baseline.summary.accuracy ?? 0) * 100)}%
              </p>
            </div>
          ) : (
            <p className="mt-7 rounded-xl bg-[var(--surface-muted)] p-5 text-sm text-[var(--ink-soft)]">
              아직 완료된 기준선 진단이 없습니다.
            </p>
          )}
          <button
            type="button"
            className="button button-secondary mt-6"
            onClick={startDiagnostic}
          >
            {baseline ? "기준선 진단 다시 시작" : "기준선 진단 시작"}
          </button>
        </section>
      </div>

      <section
        className="surface-card mt-6 p-6 sm:p-8"
        aria-labelledby="today-plan-heading"
      >
        <h2
          id="today-plan-heading"
          className="text-2xl font-bold tracking-[-0.03em]"
        >
          오늘 계획
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--ink-soft)]">
          실제 만기 복습·신규·적용 큐는 검증된 FSRS 구현체 연결 후 이 화면에서
          같은 시간 예산으로 계산합니다.
        </p>
        <p className="mt-5 font-mono text-3xl font-bold">
          {settings ? settings.dailyMinutes : 0}분
        </p>
        {!settings && (
          <p className="mt-3 text-sm font-semibold text-[var(--danger)]">
            오늘 계획을 만들려면 먼저 학습 설정을 저장해 주세요.
          </p>
        )}
      </section>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <button
          type="button"
          className="button button-quiet"
          onClick={resetData}
        >
          정보처리기사 코치 로컬 데이터 초기화
        </button>
      </div>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
