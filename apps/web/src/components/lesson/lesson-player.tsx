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
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  X,
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

type SortableTokenProps = {
  token: PublicToken;
  index: number;
  incorrect: boolean;
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
      className={`inline-flex rounded-[0.85rem] border bg-[var(--surface-raised)] shadow-[0_5px_14px_rgb(var(--shadow)/0.08)] transition-colors ${
        keyboardGrabbed
          ? "border-[var(--accent)] bg-[var(--surface-muted)]"
          : incorrect
            ? "border-[var(--danger)] bg-[var(--danger-soft)]"
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
          if (
            keyboardGrabbed &&
            !event.altKey &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            onMove(
              index,
              event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1,
            );
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
        className={`relative min-h-11 touch-none rounded-l-[0.78rem] px-3.5 py-2 text-sm font-bold sm:text-base ${
          incorrect
            ? "text-[var(--danger)] after:absolute after:right-3.5 after:bottom-1 after:left-3.5 after:h-[3px] after:rounded-full after:bg-[var(--danger)] after:content-['']"
            : ""
        }`}
        aria-label={`${index + 1}번째 어절 ${token.text}. ${incorrect ? "순서가 맞지 않아 오류로 표시됨. " : ""}${keyboardGrabbed ? "현재 집어 든 상태. 화살표로 이동한 뒤 Space 또는 Enter로 놓기." : "Space 또는 Enter로 집어 들기."} Alt와 좌우 화살표로 한 칸 이동. Delete 키로 제거.`}
      >
        {token.text}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => onRemove(token, event.detail === 0)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-r-[0.78rem] border-l border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
        aria-label={`${token.text} 어절을 후보로 돌려보내기`}
      >
        <X aria-hidden="true" size={16} weight="bold" />
      </button>
    </span>
  );
}

type PendingFocus = { kind: "candidate"; tokenId: string } | { kind: "submit" };

export function LessonPlayer({
  lesson,
  nextLessonHref,
}: {
  lesson: PublicLesson;
  nextLessonHref?: string;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = lesson.stages[stageIndex]!;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("학습을 시작합니다.");
  const candidateRefs = useRef(new Map<string, HTMLButtonElement>());
  const submitRef = useRef<HTMLButtonElement>(null);
  const pendingFocusRef = useRef<PendingFocus | null>(null);
  const progress = useAnonymousProgress();
  const storedStage = progress.stages[progressKey(lesson.id, stage.stage)];
  const attempts = storedStage?.attempts ?? 0;
  const completed = Boolean(storedStage?.completedAt);
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

  function changeStage(index: 0 | 1) {
    const nextStage = lesson.stages[index]!;
    pendingFocusRef.current = null;
    setStageIndex(index);
    setSelectedIds([]);
    setFeedback(null);
    setError(null);
    setAnnouncement(
      nextStage.stage === "title" ? "제목 단계입니다." : "발췌 단계입니다.",
    );
  }

  function addToken(token: PublicToken, restoreKeyboardFocus = false) {
    if (completed) return;
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
    if (completed) return;
    if (restoreKeyboardFocus) {
      pendingFocusRef.current = { kind: "candidate", tokenId: token.id };
    }
    setSelectedIds((current) => current.filter((id) => id !== token.id));
    setFeedback(null);
    setAnnouncement(`${token.text} 어절을 후보 영역으로 돌려보냈습니다.`);
  }

  function moveToken(index: number, direction: -1 | 1) {
    if (completed) return;
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || completed) return;
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
      const response = await fetch(`/api/lessons/${lesson.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stage.stage, tokenIds: selectedIds }),
      });
      if (!response.ok) throw new Error("GRADE_FAILED");
      const result = (await response.json()) as GradeResult;
      setFeedback(result);
      recordAnonymousAttempt(lesson.id, stage.stage, result);
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
      const response = await fetch(`/api/lessons/${lesson.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: stage.stage,
          anonymousAttempts: attempts,
        }),
      });
      if (!response.ok) throw new Error("ANSWER_FAILED");
      const body = (await response.json()) as { tokens: PublicToken[] };
      setSelectedIds(body.tokens.map((token) => token.id));
      setFeedback({ complete: true, score: 100, incorrectPositions: [] });
      markAnonymousHelped(lesson.id, stage.stage);
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

  const allPlaced = selectedIds.length === stage.tokens.length;
  const incorrectSet = new Set(feedback?.incorrectPositions ?? []);

  return (
    <section
      className="surface-card overflow-hidden"
      aria-labelledby="lesson-stage-title"
    >
      <div className="grid border-b border-[var(--line)] sm:grid-cols-2">
        {lesson.stages.map((item, index) => {
          const active = index === stageIndex;
          return (
            <div
              key={item.stage}
              className={`flex min-h-14 items-center gap-3 px-5 py-3 ${
                index === 0
                  ? "border-b border-[var(--line)] sm:border-r sm:border-b-0"
                  : ""
              } ${active ? "bg-[var(--surface-muted)]" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="font-mono text-sm font-bold text-[var(--accent)]">
                {index + 1}/2
              </span>
              <span className="font-bold">
                {item.stage === "title" ? "제목" : "발췌"}
              </span>
              {index < stageIndex && (
                <CheckCircle
                  aria-label="완료"
                  size={18}
                  weight="fill"
                  className="ml-auto"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="p-5 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-[var(--accent)]">
            {stage.stage === "title" ? "영문 제목" : "영문 발췌"}
          </p>
          <h2
            id="lesson-stage-title"
            className="mt-3 text-2xl leading-snug font-bold tracking-[-0.025em] sm:text-3xl"
          >
            {stage.english}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            후보 어절을 눌러 문장을 만드세요. 선택한 어절은 옆의 제거 버튼으로
            되돌릴 수 있습니다. 키보드에서는 Space 또는 Enter로 어절을 집어 들어
            화살표로 이동한 뒤 놓거나, Alt와 좌우 화살표로 바로 이동할 수
            있습니다.
          </p>
        </div>

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
                        disabled={completed || busy}
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
                    disabled={completed || busy}
                    onClick={(event) => addToken(token, event.detail === 0)}
                    className="min-h-11 rounded-[0.85rem] border border-[var(--line)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-bold hover:border-[var(--accent)] sm:text-base"
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
          {!completed && (
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
          {!completed && attempts >= 3 && (
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
          {completed && stage.stage === "title" && (
            <button
              type="button"
              className="button button-primary"
              onClick={goToExcerpt}
            >
              발췌 단계로
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
          )}
          {completed && stage.stage === "excerpt" && nextLessonHref && (
            <Link href={nextLessonHref} className="button button-primary">
              다음 기사
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </Link>
          )}
          {completed && stage.stage === "excerpt" && !nextLessonHref && (
            <Link href="/today" className="button button-primary">
              오늘 목록으로
            </Link>
          )}
          {stageIndex === 1 && !completed && (
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
