"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Lightbulb,
  TreeStructure,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  GradeResult,
  PublicLesson,
  PublicToken,
} from "@/features/lessons/types";
import {
  markAnonymousHelped,
  recordAnonymousAttempt,
} from "@/features/progress/storage";
import { progressKey } from "@/features/progress/types";
import { useAnonymousProgress } from "@/features/progress/use-anonymous-progress";

import { StructureReasoningGuide } from "./structure-reasoning-guide";
import { WordLookupText } from "./word-lookup-text";

const LESSON_GUIDE_SEEN_STORAGE_KEY = "newsorder.lesson-guide-seen.v1";

type SortableTokenProps = {
  token: PublicToken;
  index: number;
  incorrect: boolean;
  grammarGuided: boolean;
  disabled: boolean;
  onRemove: (token: PublicToken, restoreKeyboardFocus: boolean) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onKeyboardGrabChange: (
    token: PublicToken,
    grabbed: boolean,
    index: number,
  ) => void;
};

function SortableToken({
  token,
  index,
  incorrect,
  grammarGuided,
  disabled,
  onRemove,
  onMove,
  onKeyboardGrabChange,
}: SortableTokenProps) {
  const [keyboardGrabbed, setKeyboardGrabbed] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: token.id,
    disabled,
  });

  return (
    <span
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      data-incorrect={incorrect || undefined}
      data-grammar-guided={grammarGuided || undefined}
      className={`inline-flex rounded-[0.85rem] border bg-[var(--surface-raised)] shadow-[0_5px_14px_rgb(var(--shadow)/0.08)] transition-colors ${
        keyboardGrabbed
          ? "border-[var(--accent)] bg-[var(--surface-muted)]"
          : incorrect
            ? "border-[var(--danger)] bg-[var(--danger-soft)]"
            : grammarGuided
              ? "border-[var(--accent)] bg-[var(--surface-muted)] ring-2 ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
              : "border-[var(--line-strong)] hover:border-[var(--accent)]"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        disabled={disabled}
        {...attributes}
        {...listeners}
        aria-pressed={keyboardGrabbed}
        onKeyDown={(event) => {
          if (
            (event.key === "Delete" || event.key === "Backspace") &&
            !disabled
          ) {
            event.preventDefault();
            onRemove(token, true);
            return;
          }
          if (
            (event.key === " " || event.key === "Enter") &&
            !event.altKey &&
            !disabled
          ) {
            event.preventDefault();
            const nextGrabbed = !keyboardGrabbed;
            setKeyboardGrabbed(nextGrabbed);
            onKeyboardGrabChange(token, nextGrabbed, index);
            return;
          }
          if (event.key === "Escape" && keyboardGrabbed) {
            event.preventDefault();
            setKeyboardGrabbed(false);
            onKeyboardGrabChange(token, false, index);
            return;
          }
          if (keyboardGrabbed && event.key === "ArrowDown" && !event.altKey) {
            event.preventDefault();
            setKeyboardGrabbed(false);
            onKeyboardGrabChange(token, false, index);
            onRemove(token, true);
            return;
          }
          if (
            keyboardGrabbed &&
            !event.altKey &&
            ["ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)
          ) {
            event.preventDefault();
            onMove(index, event.key === "ArrowRight" ? 1 : -1);
            return;
          }
          if (event.altKey && event.key === "ArrowLeft" && !disabled) {
            event.preventDefault();
            onMove(index, -1);
            return;
          }
          if (event.altKey && event.key === "ArrowRight" && !disabled) {
            event.preventDefault();
            onMove(index, 1);
            return;
          }
        }}
        onBlur={() => {
          if (!keyboardGrabbed) return;
          setKeyboardGrabbed(false);
          onKeyboardGrabChange(token, false, index);
        }}
        onClick={(event) => {
          if (event.detail > 0 && !disabled && !isDragging) {
            onRemove(token, false);
          }
        }}
        className={`relative min-h-11 touch-none rounded-[0.78rem] px-3.5 py-2 text-sm font-bold sm:text-base ${
          incorrect
            ? "text-[var(--danger)] after:absolute after:right-3.5 after:bottom-1 after:left-3.5 after:h-[3px] after:rounded-full after:bg-[var(--danger)] after:content-['']"
            : ""
        }`}
        aria-label={`${index + 1}번째 어절 ${token.text}. ${incorrect ? "순서가 맞지 않아 오류로 표시됨. " : ""}${keyboardGrabbed ? "현재 집어 든 상태. 좌우 화살표로 이동하고 아래 화살표로 후보 영역에 내려놓기." : "클릭하면 후보 영역으로 이동. Space 또는 Enter로 집어 들기."} Alt와 좌우 화살표로 한 칸 이동. Delete 키로 후보 영역에 이동.`}
      >
        {token.text}
      </button>
    </span>
  );
}

type PendingFocus = { kind: "candidate"; tokenId: string } | { kind: "submit" };

function StructureLearningSteps({
  phase,
  structureComplete,
}: {
  phase: "structure" | "arrange";
  structureComplete: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 border-b border-[var(--line)]"
      aria-label="문장 학습 단계"
    >
      <div
        className={`flex min-h-12 items-center gap-2 border-r border-[var(--line)] px-3 py-2 sm:gap-3 sm:px-4 ${
          phase === "structure"
            ? "bg-[var(--surface-muted)]"
            : "bg-[var(--surface-raised)]"
        }`}
        aria-current={phase === "structure" ? "step" : undefined}
      >
        <span className="font-mono text-sm font-bold text-[var(--accent)]">
          1/2
        </span>
        <span className="font-bold">문장 구조</span>
        {structureComplete && (
          <CheckCircle
            aria-label="완료"
            size={18}
            weight="fill"
            className="ml-auto text-[var(--accent)]"
          />
        )}
      </div>
      <div
        className={`flex min-h-12 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 ${
          phase === "arrange"
            ? "bg-[var(--surface-muted)]"
            : "text-[var(--ink-soft)] opacity-65"
        }`}
        aria-current={phase === "arrange" ? "step" : undefined}
        aria-disabled={phase === "structure" || undefined}
      >
        <span className="font-mono text-sm font-bold text-[var(--accent)]">
          2/2
        </span>
        <span className="font-bold">단어 배열</span>
      </div>
    </div>
  );
}

export function LessonPlayer({
  lesson,
  nextLessonHref,
  nextLessonLabel,
  onNextLesson,
  autoAdvance = false,
  autoAdvanceDelayMs = 1_200,
  startInReplay = false,
  singleStage = false,
  contentKind = "news",
}: {
  lesson: PublicLesson;
  nextLessonHref?: string;
  nextLessonLabel?: string;
  onNextLesson?: () => void;
  autoAdvance?: boolean;
  autoAdvanceDelayMs?: number;
  startInReplay?: boolean;
  singleStage?: boolean;
  contentKind?: "news" | "reddit" | "book" | "book-practice";
}) {
  const isReddit = contentKind === "reddit";
  const isBookPractice = contentKind === "book-practice";
  const isBook = contentKind === "book" || isBookPractice;
  const apiBase = isReddit
    ? `/api/reddit-lessons/${lesson.id}`
    : isBookPractice
      ? `/api/book-practice/${lesson.id}`
      : isBook
        ? `/api/book-lessons/${lesson.id}`
        : `/api/lessons/${lesson.id}`;
  const progressLessonId = isReddit
    ? `reddit:${lesson.id}`
    : isBookPractice
      ? `book-practice:${lesson.id}`
      : isBook
        ? `book:${lesson.id}`
        : lesson.id;
  const [stageIndex, setStageIndex] = useState(0);
  const stage = lesson.stages[stageIndex]!;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<GradeResult | null>(null);
  const [attemptProof, setAttemptProof] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(startInReplay);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [autoAdvancePending, setAutoAdvancePending] = useState(false);
  const [showLessonGuide, setShowLessonGuide] = useState(false);
  const [grammarGuideOpen, setGrammarGuideOpen] = useState(false);
  const [grammarStepIndex, setGrammarStepIndex] = useState(0);
  const [grammarTokensVisible, setGrammarTokensVisible] = useState(false);
  const [learningPhase, setLearningPhase] = useState<"structure" | "arrange">(
    startInReplay ? "arrange" : "structure",
  );
  const [structureComplete, setStructureComplete] = useState(false);
  const [announcement, setAnnouncement] = useState("학습을 시작합니다.");
  const candidateRefs = useRef(new Map<string, HTMLButtonElement>());
  const submitRef = useRef<HTMLButtonElement>(null);
  const lessonTitleRef = useRef<HTMLHeadingElement>(null);
  const pendingFocusRef = useRef<PendingFocus | null>(null);
  const nextActionRef = useRef<(() => void) | null>(null);
  const progress = useAnonymousProgress();
  const storedStage =
    progress.stages[progressKey(progressLessonId, stage.stage)];
  const attempts = storedStage?.attempts ?? 0;
  const completed = Boolean(storedStage?.completedAt);
  const stageComplete = completed && !replaying;
  const titleCompleted = Boolean(
    progress.stages[progressKey(progressLessonId, "title")]?.completedAt,
  );
  const helped = storedStage?.helped ?? false;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  const tokenMap = useMemo(
    () => new Map(stage.tokens.map((token) => [token.id, token])),
    [stage.tokens],
  );
  const selectedTokens = selectedIds
    .map((id) => tokenMap.get(id))
    .filter(Boolean) as PublicToken[];
  const selectedIdSet = new Set(selectedIds);
  const availableTokens = stage.tokens.filter(
    (token) => !selectedIdSet.has(token.id),
  );
  const grammarGuide = stage.grammarGuide;
  const isStructureReasoning = Boolean(
    isBookPractice && grammarGuide?.learningMode === "structure-reasoning",
  );
  const grammarStep = grammarGuide?.steps[grammarStepIndex];
  const grammarTokenIds = new Set(
    grammarTokensVisible ? (grammarStep?.tokenIds ?? []) : [],
  );

  useEffect(() => {
    if (lesson.source.fixture) return;
    void fetch(`${apiBase}/start`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [apiBase, lesson.source.fixture]);

  useEffect(() => {
    if (window.localStorage.getItem(LESSON_GUIDE_SEEN_STORAGE_KEY)) return;

    window.localStorage.setItem(LESSON_GUIDE_SEEN_STORAGE_KEY, "true");
    const timeout = window.setTimeout(() => setShowLessonGuide(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) return;

    pendingFocusRef.current = null;
    if (pendingFocus.kind === "candidate") {
      candidateRefs.current.get(pendingFocus.tokenId)?.focus();
      return;
    }
    submitRef.current?.focus();
  }, [selectedIds, stageIndex]);

  useEffect(() => {
    nextActionRef.current = onNextLesson ?? null;
  }, [onNextLesson]);

  useEffect(() => {
    if (
      !autoAdvance ||
      !autoAdvancePending ||
      !feedback?.complete ||
      stage.stage !== "excerpt" ||
      !nextActionRef.current
    ) {
      return;
    }
    const timeout = window.setTimeout(() => {
      nextActionRef.current?.();
    }, autoAdvanceDelayMs);
    return () => window.clearTimeout(timeout);
  }, [
    autoAdvance,
    autoAdvanceDelayMs,
    autoAdvancePending,
    feedback?.complete,
    stage.stage,
  ]);

  function changeStage(index: 0 | 1) {
    const nextStage = lesson.stages[index]!;
    pendingFocusRef.current = null;
    setStageIndex(index);
    setSelectedIds([]);
    setFeedback(null);
    setAttemptProof(null);
    setReplaying(false);
    setHintUsed(false);
    setSessionAttempts(0);
    setAutoAdvancePending(false);
    setGrammarGuideOpen(false);
    setGrammarStepIndex(0);
    setGrammarTokensVisible(false);
    setLearningPhase("structure");
    setStructureComplete(false);
    setError(null);
    setAnnouncement(
      nextStage.stage === "title"
        ? "제목 단계입니다."
        : `${isReddit ? "지문" : isBook ? "본문" : "발췌"} 단계입니다.`,
    );
  }

  function addToken(token: PublicToken, restoreKeyboardFocus = false) {
    if (stageComplete) return;
    if (restoreKeyboardFocus) {
      const candidateIndex = availableTokens.findIndex(
        (candidate) => candidate.id === token.id,
      );
      const nextCandidate =
        availableTokens[candidateIndex + 1] ??
        availableTokens[candidateIndex - 1];
      pendingFocusRef.current = nextCandidate
        ? { kind: "candidate", tokenId: nextCandidate.id }
        : { kind: "submit" };
    }
    setSelectedIds((current) => [...current, token.id]);
    setFeedback(null);
    setAnnouncement(
      `${token.text} 어절을 ${selectedIds.length + 1}번째 위치로 옮겼습니다.`,
    );
  }

  function removeToken(token: PublicToken, restoreKeyboardFocus = false) {
    if (stageComplete) return;
    if (restoreKeyboardFocus) {
      pendingFocusRef.current = { kind: "candidate", tokenId: token.id };
    }
    setSelectedIds((current) => current.filter((id) => id !== token.id));
    setFeedback(null);
    setAnnouncement(`${token.text} 어절을 후보 영역으로 돌려보냈습니다.`);
  }

  function moveToken(index: number, direction: -1 | 1) {
    if (stageComplete) return;
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const token = selectedTokens[index];
    setSelectedIds((current) => arrayMove(current, index, target));
    setFeedback(null);
    setAnnouncement(
      `${token?.text ?? "어절"}을 ${target + 1}번째 위치로 이동했습니다.`,
    );
  }

  function announceKeyboardGrab(
    token: PublicToken,
    grabbed: boolean,
    index: number,
  ) {
    setAnnouncement(
      grabbed
        ? `${token.text} 어절을 집었습니다. 화살표로 이동하고 Space 또는 Enter로 놓으세요.`
        : `${token.text} 어절을 ${index + 1}번째 위치에 놓았습니다.`,
    );
  }

  function moveCandidateFocus(tokenId: string, direction: -1 | 1) {
    const index = availableTokens.findIndex((token) => token.id === tokenId);
    if (index < 0) return;
    const target = Math.min(
      availableTokens.length - 1,
      Math.max(0, index + direction),
    );
    candidateRefs.current.get(availableTokens[target]!.id)?.focus();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || stageComplete) return;
    const from = selectedIds.indexOf(String(active.id));
    const to = selectedIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    setSelectedIds((current) => arrayMove(current, from, to));
    setFeedback(null);
    setAnnouncement(
      `${tokenMap.get(String(active.id))?.text ?? "어절"}을 ${to + 1}번째 위치로 이동했습니다.`,
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: stage.stage,
          tokenIds: selectedIds,
          ...(attemptProof ? { attemptProof } : {}),
        }),
      });
      if (!response.ok) throw new Error("GRADE_FAILED");
      const result = (await response.json()) as GradeResult;
      setFeedback(result);
      setAttemptProof(result.attemptProof ?? null);
      setSessionAttempts((current) =>
        result.complete ? current : Math.min(3, current + 1),
      );
      setAutoAdvancePending(result.complete);
      recordAnonymousAttempt(progressLessonId, stage.stage, result, hintUsed);
      if (result.complete) setReplaying(false);
      setAnnouncement(
        result.complete
          ? "정답입니다. 단계가 완료되었습니다."
          : `${result.incorrectPositions.length}개 어절의 순서가 맞지 않습니다. 오류로 표시된 어절을 다시 배치하세요.`,
      );
    } catch {
      setError(
        "채점하지 못했습니다. 입력한 순서는 화면에 남아 있으니 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revealAnswer() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: stage.stage,
          ...(attemptProof ? { attemptProof } : {}),
        }),
      });
      if (!response.ok) throw new Error("ANSWER_FAILED");
      const body = (await response.json()) as { tokens: PublicToken[] };
      setSelectedIds(body.tokens.map((token) => token.id));
      setFeedback({ complete: true, score: 100, incorrectPositions: [] });
      markAnonymousHelped(progressLessonId, stage.stage);
      setReplaying(false);
      setAutoAdvancePending(false);
      setAnnouncement(
        "정답 순서를 표시했습니다. 도움을 사용한 완료로 기록됩니다.",
      );
    } catch {
      setError("정답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function goToExcerpt() {
    changeStage(1);
  }

  function applyHint() {
    const hint = feedback?.hint;
    if (!hint) return;
    const token = tokenMap.get(hint.tokenId);
    setSelectedIds((current) => {
      const from = current.indexOf(hint.tokenId);
      if (from < 0 || hint.position < 0 || hint.position >= current.length) {
        return current;
      }
      return arrayMove(current, from, hint.position);
    });
    setFeedback(null);
    setHintUsed(true);
    setAutoAdvancePending(false);
    setAnnouncement(
      `${token?.text ?? "정답"} 블록을 ${hint.position + 1}번째 위치에 놓았습니다.`,
    );
  }

  function replayStage() {
    setSelectedIds([]);
    setFeedback(null);
    setAttemptProof(null);
    setError(null);
    setReplaying(true);
    setHintUsed(false);
    setSessionAttempts(0);
    setAutoAdvancePending(false);
    setLearningPhase(isStructureReasoning ? "structure" : "arrange");
    setStructureComplete(false);
    setAnnouncement(
      `${stage.stage === "title" ? "제목" : isReddit ? "지문" : isBook ? "본문" : "발췌"} 단계를 다시 시작합니다.`,
    );
  }

  function selectGrammarStep(index: number) {
    if (!grammarGuide) return;
    const nextIndex = Math.min(
      grammarGuide.steps.length - 1,
      Math.max(0, index),
    );
    setGrammarStepIndex(nextIndex);
    setGrammarTokensVisible(false);
    setAnnouncement(
      `${nextIndex + 1}번째 해석 단계, ${grammarGuide.steps[nextIndex]?.role ?? "문장 성분"} 가이드입니다.`,
    );
  }

  function toggleGrammarTokens() {
    const nextVisible = !grammarTokensVisible;
    setGrammarTokensVisible(nextVisible);
    if (nextVisible) setHintUsed(true);
    setAnnouncement(
      nextVisible
        ? `${grammarStep?.role ?? "현재 단계"}와 관련된 어절을 강조했습니다.`
        : "관련 어절 강조를 해제했습니다.",
    );
  }

  function startWordArrangement() {
    if (!structureComplete) return;
    setLearningPhase("arrange");
    setAnnouncement(
      "문장 구조 단계를 완료했습니다. 단어 배열 단계를 시작합니다.",
    );
    window.setTimeout(() => lessonTitleRef.current?.focus(), 0);
  }

  const allPlaced = selectedIds.length === stage.tokens.length;
  const incorrectSet = new Set(feedback?.incorrectPositions ?? []);
  const showStructureScreen =
    isStructureReasoning && learningPhase === "structure" && !stageComplete;

  if (showStructureScreen && grammarGuide) {
    return (
      <section
        className="surface-card overflow-clip"
        aria-labelledby="lesson-stage-title"
        data-structure-screen
      >
        <StructureLearningSteps
          phase="structure"
          structureComplete={structureComplete}
        />

        <div className="p-4 sm:p-5 lg:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <p className="text-xs font-bold text-[var(--accent)]">
                1단계 · 영문 문장 구조
              </p>
              <p className="text-xs text-[var(--ink-soft)]">
                어구 선택 → 문장 성분 자리
              </p>
            </div>
            <h2
              ref={lessonTitleRef}
              id="lesson-stage-title"
              aria-label={stage.english}
              tabIndex={-1}
              className="mt-2 max-w-[62ch] text-lg leading-snug font-bold tracking-[-0.025em] text-pretty outline-none sm:text-2xl"
            >
              <WordLookupText
                key={`${lesson.id}:${stage.stage}:structure`}
                text={stage.english}
                lessonId={lesson.id}
                stage={stage.stage}
                source="book-practice"
              />
            </h2>
          </div>

          <div className="mt-4">
            <StructureReasoningGuide
              key={`${lesson.id}:${stage.stage}:structure`}
              english={stage.english}
              guide={grammarGuide}
              tokenMap={tokenMap}
              onHelp={() => setHintUsed(true)}
              onCompleteChange={setStructureComplete}
            />
          </div>

          {structureComplete && (
            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-6">
              <button
                type="button"
                className="button button-primary"
                onClick={startWordArrangement}
              >
                단어 배열 시작
                <ArrowRight aria-hidden="true" size={18} weight="bold" />
              </button>
              <p className="text-sm text-[var(--ink-soft)]">
                다음 화면에서 한국어 어절을 순서대로 조합합니다.
              </p>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </section>
    );
  }

  return (
    <section
      className="surface-card overflow-hidden"
      aria-labelledby="lesson-stage-title"
    >
      {isStructureReasoning && (
        <StructureLearningSteps
          phase="arrange"
          structureComplete={structureComplete || completed}
        />
      )}
      {!singleStage && (
        <div className="grid border-b border-[var(--line)] sm:grid-cols-2">
          {lesson.stages.map((item, index) => {
            const active = index === stageIndex;
            const itemCompleted = Boolean(
              progress.stages[progressKey(progressLessonId, item.stage)]
                ?.completedAt,
            );
            const canOpen = index === 0 || titleCompleted;
            const itemLabel =
              item.stage === "title"
                ? "제목"
                : isReddit
                  ? "지문"
                  : isBook
                    ? "본문"
                    : "발췌";
            return (
              <button
                key={item.stage}
                type="button"
                disabled={!canOpen}
                onClick={() => changeStage(index as 0 | 1)}
                className={`flex min-h-14 items-center gap-3 px-5 py-3 ${
                  index === 0
                    ? "border-b border-[var(--line)] sm:border-r sm:border-b-0"
                    : ""
                } ${active ? "bg-[var(--surface-muted)]" : "hover:bg-[var(--surface-raised)]"} text-left disabled:cursor-not-allowed disabled:opacity-55`}
                aria-current={active ? "step" : undefined}
                aria-label={`${index + 1}/2 ${itemLabel}${itemCompleted ? " 완료" : ""}`}
              >
                <span className="font-mono text-sm font-bold text-[var(--accent)]">
                  {index + 1}/2
                </span>
                <span className="font-bold">{itemLabel}</span>
                {itemCompleted && (
                  <CheckCircle
                    aria-label="완료"
                    size={18}
                    weight="fill"
                    className="ml-auto"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="p-5 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-[var(--accent)]">
            {stage.stage === "title"
              ? "영문 제목"
              : isReddit
                ? "영문 지문"
                : isBook
                  ? "영문 본문"
                  : "영문 발췌"}
          </p>
          <h2
            ref={lessonTitleRef}
            id="lesson-stage-title"
            aria-label={stage.english}
            tabIndex={-1}
            className="mt-3 text-2xl leading-snug font-bold tracking-[-0.025em] outline-none sm:text-3xl"
          >
            <WordLookupText
              key={`${lesson.id}:${stage.stage}`}
              text={stage.english}
              lessonId={lesson.id}
              stage={stage.stage}
              source={
                isReddit
                  ? "reddit"
                  : isBookPractice
                    ? "book-practice"
                    : isBook
                      ? "book"
                      : "lesson"
              }
            />
          </h2>
          {showLessonGuide && (
            <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
              영단어를 더블클릭하면 한국어 뜻을 볼 수 있습니다. 후보 어절을 눌러
              문장을 만드세요. 배치한 어절을 다시 누르면 후보 영역으로
              돌아갑니다. 키보드에서는 Space 또는 Enter로 어절을 집고 좌우
              화살표로 이동할 수 있습니다. 아래 화살표를 누르면 후보 영역에
              내려놓으며 포커스는 그대로 유지됩니다. 후보 영역에서는 방향키로
              다른 어절로 이동할 수 있습니다.
            </p>
          )}
          {grammarGuide &&
            grammarGuide.learningMode !== "structure-reasoning" && (
              <div className="mt-5">
                <button
                  type="button"
                  className="button button-secondary"
                  aria-expanded={grammarGuideOpen}
                  aria-controls="grammar-guide-panel"
                  onClick={() => {
                    setGrammarGuideOpen((current) => !current);
                    setGrammarTokensVisible(false);
                  }}
                >
                  <TreeStructure aria-hidden="true" size={18} weight="bold" />
                  {grammarGuideOpen ? "문장 구조 닫기" : "문장 구조 보기"}
                </button>

                {grammarGuideOpen && grammarStep && (
                  <div
                    id="grammar-guide-panel"
                    className="mt-3 rounded-[1rem] border border-[var(--line-strong)] bg-[var(--surface-muted)] p-4 sm:p-5"
                  >
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--accent)]">
                            {grammarGuide.provider === "claude-cli/sonnet"
                              ? "CLAUDE CLI 문법 가이드"
                              : "CODEX CLI 문법 가이드"}
                          </p>
                          <p className="mt-2 text-sm font-bold">
                            전체 구조: {grammarGuide.structure}
                          </p>
                        </div>
                        <p className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-bold">
                          해석 단계 {grammarStepIndex + 1}/
                          {grammarGuide.steps.length}
                        </p>
                      </div>

                      <ol
                        className="mt-4 flex flex-wrap gap-2"
                        aria-label="해석 단계"
                      >
                        {grammarGuide.steps.map((item, index) => (
                          <li key={`${item.role}:${index}`}>
                            <button
                              type="button"
                              className={`min-h-9 rounded-full border px-3 text-xs font-bold ${
                                index === grammarStepIndex
                                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                                  : "border-[var(--line)] bg-[var(--surface)]"
                              }`}
                              aria-current={
                                index === grammarStepIndex ? "step" : undefined
                              }
                              onClick={() => selectGrammarStep(index)}
                            >
                              {index + 1}. {item.role}
                            </button>
                          </li>
                        ))}
                      </ol>

                      <div className="mt-4 border-l-4 border-[var(--accent)] pl-4">
                        <p className="text-xs font-bold text-[var(--ink-soft)]">
                          영어에서 찾을 부분
                        </p>
                        <p className="mt-1 font-serif text-lg font-bold">
                          {grammarStep.englishPhrase}
                        </p>
                        <p className="mt-3 text-sm font-bold">
                          {grammarStep.koreanFunction}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                          {grammarStep.instruction}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="button button-secondary text-sm"
                          aria-pressed={grammarTokensVisible}
                          onClick={toggleGrammarTokens}
                        >
                          <Lightbulb
                            aria-hidden="true"
                            size={17}
                            weight="bold"
                          />
                          {grammarTokensVisible
                            ? "관련 어절 강조 끄기"
                            : "관련 어절 표시"}
                        </button>
                        <button
                          type="button"
                          className="button button-quiet text-sm"
                          disabled={grammarStepIndex === 0}
                          onClick={() =>
                            selectGrammarStep(grammarStepIndex - 1)
                          }
                        >
                          <ArrowLeft
                            aria-hidden="true"
                            size={16}
                            weight="bold"
                          />
                          이전 단계
                        </button>
                        <button
                          type="button"
                          className="button button-quiet text-sm"
                          disabled={
                            grammarStepIndex === grammarGuide.steps.length - 1
                          }
                          onClick={() =>
                            selectGrammarStep(grammarStepIndex + 1)
                          }
                        >
                          다음 단계
                          <ArrowRight
                            aria-hidden="true"
                            size={16}
                            weight="bold"
                          />
                        </button>
                      </div>

                      {grammarGuide.grammarPoints.length > 0 && (
                        <dl className="mt-5 grid gap-2 border-t border-[var(--line)] pt-4 text-sm">
                          {grammarGuide.grammarPoints.map((point) => (
                            <div
                              key={point.expression}
                              className="grid gap-1 sm:grid-cols-[minmax(8rem,auto)_1fr] sm:gap-3"
                            >
                              <dt className="font-mono font-bold">
                                {point.expression}
                              </dt>
                              <dd className="text-[var(--ink-soft)]">
                                {point.explanation}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </>
                  </div>
                )}
              </div>
            )}
        </div>

        {stageComplete && !feedback && (
          <div
            className="mt-6 flex items-start gap-3 rounded-[1rem] border border-[var(--line)] bg-[var(--surface-muted)] p-4"
            role="status"
          >
            <CheckCircle
              aria-hidden="true"
              size={22}
              weight="fill"
              className="mt-0.5 shrink-0 text-[var(--accent)]"
            />
            <div>
              <p className="font-bold">완료한 단계입니다.</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                다시 풀기를 누르면 기록을 유지한 채 어절 배열을 복습할 수
                있습니다.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-bold">내 문장</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={selectedIds} strategy={rectSortingStrategy}>
              <div
                className="mt-3 flex min-h-28 flex-wrap content-start gap-2 rounded-[1.125rem] border-2 border-dashed border-[var(--line-strong)] bg-[var(--canvas)] p-3 sm:p-4"
                role={selectedTokens.length > 0 ? "list" : undefined}
                aria-label={
                  selectedTokens.length > 0 ? "선택한 어절 순서" : undefined
                }
              >
                {selectedTokens.length === 0 ? (
                  <p className="m-auto text-sm text-[var(--ink-soft)]">
                    아래 어절을 선택하면 이곳에 순서대로 놓입니다.
                  </p>
                ) : (
                  selectedTokens.map((token, index) => (
                    <span key={token.id} role="listitem">
                      <SortableToken
                        token={token}
                        index={index}
                        incorrect={incorrectSet.has(index)}
                        grammarGuided={grammarTokenIds.has(token.id)}
                        disabled={stageComplete || busy}
                        onRemove={removeToken}
                        onMove={moveToken}
                        onKeyboardGrabChange={announceKeyboardGrab}
                      />
                    </span>
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-7">
          <h3 className="text-sm font-bold">후보 어절</h3>
          <div
            className="mt-3 flex min-h-20 flex-wrap content-start gap-2"
            role={availableTokens.length > 0 ? "list" : undefined}
            aria-label={availableTokens.length > 0 ? "후보 어절" : undefined}
          >
            {availableTokens.length === 0 ? (
              <p className="text-sm text-[var(--ink-soft)]">
                모든 어절을 문장에 옮겼습니다.
              </p>
            ) : (
              availableTokens.map((token) => (
                <span key={token.id} role="listitem">
                  <button
                    ref={(node) => {
                      if (node) candidateRefs.current.set(token.id, node);
                      else candidateRefs.current.delete(token.id);
                    }}
                    type="button"
                    disabled={stageComplete || busy}
                    onClick={(event) => addToken(token, event.detail === 0)}
                    onKeyDown={(event) => {
                      if (
                        !event.altKey &&
                        [
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                        ].includes(event.key)
                      ) {
                        event.preventDefault();
                        moveCandidateFocus(
                          token.id,
                          event.key === "ArrowLeft" || event.key === "ArrowUp"
                            ? -1
                            : 1,
                        );
                      }
                    }}
                    data-grammar-guided={
                      grammarTokenIds.has(token.id) || undefined
                    }
                    className={`min-h-11 rounded-[0.85rem] border px-3.5 py-2 text-sm font-bold sm:text-base ${
                      grammarTokenIds.has(token.id)
                        ? "border-[var(--accent)] bg-[var(--surface)] ring-2 ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
                        : "border-[var(--line)] bg-[var(--surface-muted)] hover:border-[var(--accent)]"
                    }`}
                    aria-label={`${token.text} 어절을 내 문장으로 이동`}
                  >
                    {token.text}
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-7 flex items-start gap-3 rounded-[1rem] border p-4 ${
              feedback.complete
                ? "border-[var(--accent)] bg-[var(--surface-muted)]"
                : "border-[var(--danger)] bg-[var(--danger-soft)]"
            }`}
            role="status"
          >
            {feedback.complete ? (
              <CheckCircle
                aria-hidden="true"
                size={24}
                weight="fill"
                className="shrink-0 text-[var(--accent)]"
              />
            ) : (
              <XCircle
                aria-hidden="true"
                size={24}
                weight="bold"
                className="shrink-0 text-[var(--danger)]"
              />
            )}
            <div>
              <p className="font-bold">
                {feedback.complete
                  ? helped
                    ? "정답을 확인해 완료했습니다."
                    : "정확한 순서입니다."
                  : "빨간 밑줄로 표시한 어절을 다시 배치해 보세요."}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                문장 일치율 {feedback.score}점 · {attempts}회 시도
              </p>
              {feedback.complete &&
                autoAdvance &&
                autoAdvancePending &&
                onNextLesson && (
                  <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
                    잠시 후 다음 문장으로 이동합니다.
                  </p>
                )}
            </div>
          </div>
        )}

        {error && (
          <p
            className="mt-7 rounded-[1rem] border border-dashed border-[var(--ink)] p-4 text-sm leading-6"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-6">
          {!stageComplete && (
            <button
              ref={submitRef}
              type="button"
              className="button button-primary"
              disabled={!allPlaced || busy}
              onClick={submit}
            >
              {busy ? "확인 중" : "순서 확인"}
            </button>
          )}
          {!stageComplete && feedback?.hint && (
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={applyHint}
            >
              <Lightbulb aria-hidden="true" size={18} weight="bold" />
              다음 블록 힌트
            </button>
          )}
          {!stageComplete && sessionAttempts >= 3 && (
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={revealAnswer}
            >
              <Eye aria-hidden="true" size={18} weight="bold" />
              정답 보기
            </button>
          )}
          {stageComplete && (
            <button
              type="button"
              className="button button-secondary"
              onClick={replayStage}
            >
              <ArrowCounterClockwise
                aria-hidden="true"
                size={18}
                weight="bold"
              />
              다시 풀기
            </button>
          )}
          {stageComplete && stage.stage === "title" && !singleStage && (
            <button
              type="button"
              className="button button-primary"
              onClick={goToExcerpt}
            >
              {isReddit
                ? "지문 단계로"
                : isBook
                  ? "본문 단계로"
                  : "발췌 단계로"}
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
          )}
          {stageComplete && stage.stage === "excerpt" && onNextLesson && (
            <button
              type="button"
              className="button button-primary"
              onClick={onNextLesson}
            >
              {nextLessonLabel ?? "다음 문장"}
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
          )}
          {stageComplete &&
            stage.stage === "excerpt" &&
            !onNextLesson &&
            nextLessonHref && (
              <Link href={nextLessonHref} className="button button-primary">
                {nextLessonLabel ??
                  (isReddit ? "다음 토픽" : isBook ? "다음 구절" : "다음 기사")}
                <ArrowRight aria-hidden="true" size={18} weight="bold" />
              </Link>
            )}
          {stageComplete &&
            stage.stage === "excerpt" &&
            !onNextLesson &&
            !nextLessonHref && (
              <Link
                href={isReddit ? "/reddit" : isBook ? "/books" : "/today"}
                className="button button-primary"
              >
                {isReddit
                  ? "Reddit 목록으로"
                  : isBook
                    ? "책 목록으로"
                    : "오늘 목록으로"}
              </Link>
            )}
          {stageIndex === 1 && !stageComplete && (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => changeStage(0)}
            >
              <ArrowLeft aria-hidden="true" size={18} weight="bold" />
              제목으로 돌아가기
            </button>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}
