"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  OFFICIAL_OBJECTIVES_2026,
  TS_FSRS_VERSION,
  appendLocalLearningEvent,
  createLearningEventFromSession,
  getOrCreateGuestId,
  isCExecutionResponse,
  loadLocalLearningEvents,
  rebuildMemoryStateFromEvents,
  resolveTsFsrsAdapter,
  revealNextHelp,
  startPracticeSession,
  submitCorrection,
  submitFirstResponse,
  type CExecutionResponse,
  type CExecutionStatus,
  type ContentItem,
  type FsrsRating,
  type HelpDisclosure,
  type LearningEvent,
  type MemoryState,
  type PracticeSession,
} from "@/features/exam-coach/core";

type Notice = {
  kind: "error" | "status";
  text: string;
};

interface ExamCoachLearningSessionProps {
  content: ContentItem;
}

const RECALL_RATINGS = ["Hard", "Good", "Easy"] as const;

// prettier-ignore
export function ExamCoachLearningSession({
  content,
}: ExamCoachLearningSessionProps) {
  const [session, setSession] = useState<PracticeSession>(() =>
    startPracticeSession(content, content.id),
  );
  const [ready, setReady] = useState(false);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [correctionResponse, setCorrectionResponse] = useState("");
  const [disclosures, setDisclosures] = useState<readonly HelpDisclosure[]>([]);
  const [completedEvent, setCompletedEvent] = useState<LearningEvent | null>(null);
  const [memoryState, setMemoryState] = useState<MemoryState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [cSource, setCSource] = useState("");
  const [cExecution, setCExecution] = useState<CExecutionResponse | null>(null);
  const [cExecutionPending, setCExecutionPending] = useState(false);
  const startedAtRef = useRef(0);
  const finalizedRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const id = getOrCreateGuestId(window.localStorage);
        const events = loadLocalLearningEvents(window.localStorage, id);
        setLearnerId(id);
        setMemoryState(
          rebuildMemoryStateFromEvents(
            events,
            content.id,
            resolveTsFsrsAdapter,
          ),
        );
      } catch (error) {
        setNotice({ kind: "error", text: errorMessage(error) });
      } finally {
        startedAtRef.current = performance.now();
        setReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [content.id]);

  const firstSubmission = session.firstSubmission;
  const phase = completedEvent
    ? "completed"
    : !firstSubmission
      ? "answering"
      : firstSubmission.result.correct
        ? "rating"
        : "correction";
  const domain = OFFICIAL_OBJECTIVES_2026.find(
    (objective) => objective.id === content.domainId,
  );

  function submitFirst(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !learnerId) return;
    if (!response.trim()) {
      setNotice({ kind: "error", text: "답안을 입력한 뒤 제출해 주세요." });
      return;
    }

    try {
      const submitted = submitFirstResponse(
        session,
        content,
        response,
        new Date().toISOString(),
        Math.max(0, Math.round(performance.now() - startedAtRef.current)),
      );
      setSession(submitted);
      setResponse("");
      setNotice(
        submitted.firstSubmission?.result.correct
          ? {
              kind: "status",
              text: "첫 제출 정답입니다. 도움 없이 풀었으므로 회상 등급을 선택해 주세요.",
            }
          : {
              kind: "status",
              text: "첫 제출은 정답이 아닙니다. 교정 답안을 다시 작성하거나 도움을 한 단계씩 열어 보세요.",
            },
      );
    } catch (error) {
      setNotice({ kind: "error", text: submissionErrorMessage(error) });
    }
  }

  function revealHelp() {
    try {
      const outcome = revealNextHelp(session, content);
      setSession(outcome.session);
      setDisclosures((current) => [...current, outcome.disclosure]);
      setNotice({
        kind: "status",
        text: `${helpLabel(outcome.disclosure.level)}을 공개했습니다. 도움은 한 번에 한 단계만 열립니다.`,
      });
    } catch (error) {
      setNotice({ kind: "error", text: submissionErrorMessage(error) });
    }
  }

  function submitCorrectionResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!learnerId) return;
    if (!correctionResponse.trim()) {
      setNotice({ kind: "error", text: "교정 답안을 입력해 주세요." });
      return;
    }

    try {
      const outcome = submitCorrection(session, content, correctionResponse);
      setSession(outcome.session);
      setCorrectionResponse("");

      if (!outcome.result.correct) {
        setNotice({
          kind: "status",
          text: "교정 답안이 아직 맞지 않습니다. 다시 시도하거나 다음 도움을 확인해 보세요.",
        });
        return;
      }

      persistSessionEvent(outcome.session, "Again");
    } catch (error) {
      setNotice({ kind: "error", text: submissionErrorMessage(error) });
    }
  }

  function chooseRecallRating(rating: (typeof RECALL_RATINGS)[number]) {
    persistSessionEvent(session, rating);
  }

  async function runCSource() {
    if (!firstSubmission || content.domainId !== "programming-language") return;
    if (!cSource.trim() || cExecutionPending) return;

    setCExecutionPending(true);
    setCExecution(null);
    try {
      const response = await fetch("/api/exam-coach/c/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: cSource }),
      });
      const payload: unknown = await response.json();
      if (!isCExecutionResponse(payload)) {
        throw new Error("invalid C execution response");
      }
      setCExecution(payload);
    } catch {
      setCExecution({ ok: false, status: "sandbox-unavailable" });
    } finally {
      setCExecutionPending(false);
    }
  }

  function persistSessionEvent(
    sessionToPersist: PracticeSession,
    requestedRating: FsrsRating,
  ) {
    if (!learnerId || finalizedRef.current) return;

    try {
      if (
        content.id !== sessionToPersist.contentId ||
        content.version !== sessionToPersist.contentVersion
      ) {
        throw new Error("content does not match practice session version");
      }

      finalizedRef.current = true;
      const learningEvent = createLearningEventFromSession(
        sessionToPersist,
        {
          eventId: `learn-${crypto.randomUUID()}`,
          learnerId,
          fsrsVersion: TS_FSRS_VERSION,
          mode: "recall",
        },
        requestedRating,
      );
      const events = appendLocalLearningEvent(
        window.localStorage,
        learnerId,
        learningEvent,
      );
      const nextMemoryState = rebuildMemoryStateFromEvents(
        events,
        learningEvent.cardId,
        resolveTsFsrsAdapter,
      );

      setCompletedEvent(learningEvent);
      setMemoryState(nextMemoryState);
      setNotice({
        kind: "status",
        text:
          learningEvent.rating === "Again"
            ? "교정을 완료했습니다. 첫 제출이 오답이거나 도움을 사용한 경로이므로 FSRS 등급은 Again으로 고정했습니다."
            : `${learningEvent.rating} 등급으로 학습 이벤트를 저장하고 FSRS 기억 일정을 갱신했습니다.`,
      });
    } catch (error) {
      finalizedRef.current = false;
      setNotice({ kind: "error", text: submissionErrorMessage(error) });
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      <section
        className="surface-card p-6 sm:p-8"
        aria-labelledby="learning-goal-heading"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ink-soft)]">
          <span>{content.officialYear} 공식 범위</span>
          <span aria-hidden="true">·</span>
          <span>{domain?.nameKo ?? content.domainId}</span>
          <span aria-hidden="true">·</span>
          <span>회상 모드</span>
        </div>
        <h2
          id="learning-goal-heading"
          className="mt-4 text-2xl font-bold tracking-[-0.03em]"
        >
          학습 목표
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--ink-soft)]">
          {safePreSubmitObjective(content)}
        </p>

        <div className="mt-6 rounded-xl bg-[var(--surface-muted)] p-5">
          <h3 className="font-bold">이해 단계</h3>
          <p className="mt-2 leading-7 text-[var(--ink-soft)]">
            이 검수 콘텐츠는 먼저 목표와 문제만 확인하고 독립적으로 답하도록
            구성했습니다. 정답·힌트·해설·채점 결과는 첫 제출 전에는 공개하지
            않습니다.
          </p>
          <p className="mt-3 text-sm font-semibold text-[var(--ink-soft)]">
            예상 학습 시간 {content.estimatedMinutes}분 · 난이도 {content.difficulty}/5
          </p>
        </div>
      </section>

      <section
        className="surface-card p-6 sm:p-8"
        aria-labelledby="learning-question-heading"
      >
        <p className="text-sm font-bold text-[var(--accent)]">검수 완료 학습 문제</p>
        <h2
          id="learning-question-heading"
          className="mt-3 text-xl font-bold leading-8"
        >
          {content.prompt}
        </h2>

        {notice && (
          <div
            className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6"
            role={notice.kind === "error" ? "alert" : "status"}
          >
            {notice.text}
          </div>
        )}

        {content.domainId === "programming-language" && !firstSubmission && (
          <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
            C 코드 실행은 첫 답안 제출이 확정된 뒤에만 열립니다. 첫 제출 전에는
            실행 결과나 기대 출력을 보여 주지 않습니다.
          </div>
        )}

        {phase === "answering" && (
          <form className="mt-7" onSubmit={submitFirst}>
            <label htmlFor="learning-response" className="block font-bold">
              답안
            </label>
            <textarea
              id="learning-response"
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              rows={5}
              autoFocus
              className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono leading-7 text-[var(--ink)]"
              aria-describedby="learning-response-privacy"
            />
            <p
              id="learning-response-privacy"
              className="mt-3 text-sm leading-6 text-[var(--ink-soft)]"
            >
              입력한 답안 원문은 현재 채점에만 사용하며 학습 이벤트나
              localStorage에 저장하지 않습니다.
            </p>
            <button
              type="submit"
              className="button button-primary mt-6"
              disabled={!ready}
            >
              첫 답안 제출
            </button>
          </form>
        )}

        {content.domainId === "programming-language" && firstSubmission && (
          <section
            className="mt-7 rounded-xl border border-[var(--line)] p-5"
            aria-labelledby="c-execution-heading"
          >
            <h3 id="c-execution-heading" className="text-lg font-bold">
              C 코드 실행
            </h3>
            <p className="mt-2 leading-7 text-[var(--ink-soft)]">
              실행은 격리된 일회성 샌드박스에서만 시도합니다. 실행 결과는 교정
              피드백일 뿐 첫 제출의 정오·회상 등급·FSRS 일정을 바꾸지 않으며,
              C 소스와 stdout/stderr 원문은 학습 이벤트나 localStorage에 저장하지
              않습니다.
            </p>
            <label htmlFor="c-execution-source" className="mt-5 block font-bold">
              실행할 C 소스
            </label>
            <textarea
              id="c-execution-source"
              value={cSource}
              onChange={(event) => setCSource(event.target.value)}
              rows={9}
              spellCheck={false}
              className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono leading-7 text-[var(--ink)]"
            />
            <button
              type="button"
              className="button button-secondary mt-4"
              onClick={() => void runCSource()}
              disabled={!cSource.trim() || cExecutionPending}
            >
              {cExecutionPending ? "격리 실행 중…" : "격리 샌드박스에서 실행"}
            </button>

            {cExecution && (
              <div className="mt-5" role="status" aria-live="polite">
                <p className="font-bold">
                  실행 분류: {cExecutionStatusLabel(cExecution.status)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                  {cExecutionFallback(cExecution.status)}
                </p>
                {cExecution.output && (
                  <pre
                    className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6"
                    aria-label="C 실행 출력"
                  >
                    {cExecution.output}
                  </pre>
                )}
              </div>
            )}
          </section>
        )}

        {phase === "rating" && (
          <div className="mt-7" aria-labelledby="recall-rating-heading">
            <h3 id="recall-rating-heading" className="text-lg font-bold">
              독립 회상 난이도
            </h3>
            <p className="mt-2 leading-7 text-[var(--ink-soft)]">
              첫 제출을 도움 없이 맞혔습니다. 체감 회상 난이도를 선택하면 그
              등급으로 FSRS 기억 일정을 계산합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {RECALL_RATINGS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className="button button-secondary"
                  onClick={() => chooseRecallRating(rating)}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "correction" && (
          <div className="mt-7 grid gap-6">
            <div>
              <h3 className="text-lg font-bold">교정 흐름</h3>
              <p className="mt-2 leading-7 text-[var(--ink-soft)]">
                첫 제출 정오는 그대로 보존됩니다. 교정 답안을 다시 제출할 수
                있고, 필요하면 개념 단서부터 해설·정답까지 한 단계씩 도움을
                열 수 있습니다. 이 경로의 FSRS 등급은 Again으로 고정됩니다.
              </p>
            </div>

            {disclosures.length > 0 && (
              <div className="grid gap-3" aria-label="공개된 단계별 도움">
                {disclosures.map((disclosure) => (
                  <HelpPanel
                    key={disclosure.level}
                    disclosure={disclosure}
                  />
                ))}
              </div>
            )}

            {session.helpLevel < 4 && (
              <button
                type="button"
                className="button button-secondary justify-self-start"
                onClick={revealHelp}
              >
                {nextHelpButtonLabel(session.helpLevel)}
              </button>
            )}

            <form onSubmit={submitCorrectionResponse}>
              <label htmlFor="correction-response" className="block font-bold">
                교정 답안
              </label>
              <textarea
                id="correction-response"
                value={correctionResponse}
                onChange={(event) => setCorrectionResponse(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono leading-7 text-[var(--ink)]"
              />
              <button type="submit" className="button button-primary mt-5">
                교정 답안 제출
              </button>
            </form>
          </div>
        )}

        {phase === "completed" && completedEvent && (
          <div className="mt-7 grid gap-5">
            <div className="rounded-xl bg-[var(--surface-muted)] p-5">
              <p className="text-sm font-bold text-[var(--ink-soft)]">
                저장된 학습 이벤트
              </p>
              <p className="mt-2 font-mono text-3xl font-bold">
                {completedEvent.rating}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                응답 시간 {completedEvent.responseTimeMs}ms · 도움 단계 {completedEvent.helpLevel} · 모드 {completedEvent.mode}
              </p>
            </div>

            {memoryState && (
              <div
                className="rounded-xl border border-[var(--line)] p-5"
                aria-label="FSRS 기억 일정"
              >
                <p className="font-bold">FSRS 기억 일정이 갱신되었습니다.</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                  다음 복습: <time dateTime={memoryState.dueAt}>{formatDateTime(memoryState.dueAt)}</time>
                </p>
              </div>
            )}

            <div>
              <h3 className="font-bold">정답과 해설</h3>
              <p className="mt-2 font-mono font-bold">{content.answer}</p>
              <p className="mt-2 leading-7 text-[var(--ink-soft)]">
                {content.explanation}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function HelpPanel({ disclosure }: { disclosure: HelpDisclosure }) {
  if (disclosure.kind === "solution") {
    return (
      <div className="rounded-xl border border-[var(--line)] p-4">
        <p className="text-sm font-bold text-[var(--ink-soft)]">
          {helpLabel(disclosure.level)}
        </p>
        <p className="mt-2 leading-7">{disclosure.explanation}</p>
        <p className="mt-2 font-mono font-bold">정답: {disclosure.answer}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line)] p-4">
      <p className="text-sm font-bold text-[var(--ink-soft)]">
        {helpLabel(disclosure.level)}
      </p>
      <p className="mt-2 leading-7">{disclosure.text}</p>
    </div>
  );
}

function safePreSubmitObjective(content: ContentItem): string {
  const sensitiveValues = [
    content.answer,
    ...(content.grading.acceptedAnswers ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  const normalizedObjective = content.objective
    .normalize("NFKC")
    .toLocaleLowerCase();
  const leaksAnswer = sensitiveValues.some((value) =>
    normalizedObjective.includes(value.normalize("NFKC").toLocaleLowerCase()),
  );

  if (!leaksAnswer) return content.objective;
  return content.domainId === "sql"
    ? "검수된 SQL 문항에서 묻는 핵심 역할을 도움 없이 구분하고 회상한다."
    : "검수된 학습 문항의 실행 흐름과 핵심 개념을 도움 없이 추론한다.";
}

function nextHelpButtonLabel(helpLevel: PracticeSession["helpLevel"]): string {
  switch (helpLevel) {
    case 0:
      return "개념 단서 보기";
    case 1:
      return "구조 힌트 보기";
    case 2:
      return "구체적 힌트 보기";
    case 3:
      return "해설·정답 보기";
    case 4:
      return "모든 도움 공개됨";
  }
}

function helpLabel(level: HelpDisclosure["level"]): string {
  switch (level) {
    case 1:
      return "개념 단서";
    case 2:
      return "구조 힌트";
    case 3:
      return "구체적 힌트";
    case 4:
      return "해설·정답";
  }
}

function cExecutionStatusLabel(status: CExecutionStatus): string {
  switch (status) {
    case "completed":
      return "완료";
    case "compile-error":
      return "컴파일 오류";
    case "runtime-error":
      return "실행 오류";
    case "wall-time-limit":
      return "시간 제한 초과";
    case "cpu-limit":
      return "CPU 제한 초과";
    case "memory-limit":
      return "메모리 제한 초과";
    case "output-limit":
      return "출력 제한 초과";
    case "process-limit":
      return "프로세스 제한 초과";
    case "fd-limit":
      return "파일 디스크립터 제한 초과";
    case "disk-limit":
      return "쓰기 제한 초과";
    case "sandbox-unavailable":
      return "샌드박스 사용 불가";
    case "sandbox-error":
      return "샌드박스 오류";
    case "source-too-large":
      return "소스 크기 제한 초과";
  }
}

function cExecutionFallback(status: CExecutionStatus): string {
  if (status === "completed") {
    return "표시된 출력은 현재 세션에서만 사용됩니다.";
  }
  if (status === "compile-error" || status === "runtime-error") {
    return "프로그램의 컴파일·실행 결과이며 첫 제출의 정오 판정을 변경하지 않습니다.";
  }
  if (status === "sandbox-unavailable" || status === "sandbox-error") {
    return "실행기를 사용할 수 없습니다. 기존 설명·회상·교정 흐름은 그대로 계속할 수 있습니다.";
  }
  if (status === "source-too-large") {
    return "C 소스가 32 KiB 제한을 넘었습니다. 더 작은 예제로 줄인 뒤 다시 시도해 주세요.";
  }
  return "보안 자원 제한으로 실행을 중단했습니다. 제한 초과만으로 첫 제출을 오답 처리하지 않습니다.";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function submissionErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  if (message.includes("practice session version")) {
    return "학습 중 콘텐츠 버전이 변경되어 제출을 거부했습니다. 새 학습 세션에서 다시 시작해 주세요.";
  }
  return message;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
