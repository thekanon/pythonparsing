"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { LessonPlayer } from "@/components/lesson/lesson-player";
import {
  getBookPracticeProgress,
  saveBookPracticeProgress,
} from "@/features/books/practice-progress";
import type { PublicLesson } from "@/features/lessons/types";
import { useAnonymousProgress } from "@/features/progress/use-anonymous-progress";
import { progressKey } from "@/features/progress/types";
import type { PublicBookPracticeSentence } from "@/server/book-practice";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const AUTO_ADVANCE_STORAGE_KEY = "newsorder.book-practice-auto-advance.v1";
const AUTO_ADVANCE_EVENT = "newsorder:book-practice-auto-advance";

function getAutoAdvanceSnapshot() {
  return window.localStorage.getItem(AUTO_ADVANCE_STORAGE_KEY) !== "false";
}

function getAutoAdvanceServerSnapshot() {
  return true;
}

function subscribeToAutoAdvance(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === AUTO_ADVANCE_STORAGE_KEY) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTO_ADVANCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTO_ADVANCE_EVENT, onStoreChange);
  };
}

function setAutoAdvancePreference(value: boolean) {
  window.localStorage.setItem(AUTO_ADVANCE_STORAGE_KEY, String(value));
  window.dispatchEvent(new Event(AUTO_ADVANCE_EVENT));
}

function toLesson(
  sentence: PublicBookPracticeSentence,
  bookTitle: string,
  sourceUrl: string,
): PublicLesson {
  const stage = {
    stage: "excerpt" as const,
    english: sentence.english,
    tokens: sentence.tokens,
    ...(sentence.grammarGuide ? { grammarGuide: sentence.grammarGuide } : {}),
  };
  return {
    id: sentence.id,
    revisionId: `${sentence.id}:v1`,
    learningDate: "",
    ordinal: sentence.position,
    source: {
      provider: "Project Gutenberg",
      label: bookTitle,
      url: sourceUrl,
      publishedAt: "",
      fixture: false,
    },
    stages: [stage, stage],
  };
}

export function BookPracticeSequence({
  bookSlug,
  bookTitle,
  sourceUrl,
  sectionSlug,
  sectionPosition,
  sectionTotal,
  sentences,
  nextSectionHref,
}: {
  bookSlug: string;
  bookTitle: string;
  sourceUrl: string;
  sectionSlug: string;
  sectionPosition: number;
  sectionTotal: number;
  sentences: PublicBookPracticeSentence[];
  nextSectionHref?: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const saved = hydrated ? getBookPracticeProgress(bookSlug) : null;
  const progress = useAnonymousProgress();
  const savedIndex =
    saved?.sectionSlug === sectionSlug
      ? Math.min(sentences.length - 1, saved.sentencePosition - 1)
      : 0;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const autoAdvance = useSyncExternalStore(
    subscribeToAutoAdvance,
    getAutoAdvanceSnapshot,
    getAutoAdvanceServerSnapshot,
  );
  const [reviewMode, setReviewMode] = useState(false);
  const activeIndex = selectedIndex ?? Math.max(0, savedIndex);
  const sentence = sentences[activeIndex]!;
  const lesson = toLesson(sentence, bookTitle, sourceUrl);
  const sentenceProgress = sentences.map(
    (item) =>
      progress.stages[progressKey(`book-practice:${item.id}`, "excerpt")] ??
      null,
  );
  const completedCount = sentenceProgress.filter(
    (item) => item?.completedAt,
  ).length;
  const reviewIndexes = sentenceProgress.flatMap((item, index) =>
    item && (item.bestScore < 100 || item.attempts > 1 || item.helped === true)
      ? [index]
      : [],
  );
  const visibleIndexes = reviewMode
    ? reviewIndexes
    : sentences.map((_, index) => index);
  const activeVisiblePosition = visibleIndexes.indexOf(activeIndex);
  const previousSentenceIndex =
    activeVisiblePosition > 0
      ? (visibleIndexes[activeVisiblePosition - 1] ?? null)
      : null;
  const nextSentenceIndex =
    activeVisiblePosition >= 0 &&
    activeVisiblePosition < visibleIndexes.length - 1
      ? (visibleIndexes[activeVisiblePosition + 1] ?? null)
      : null;

  useEffect(() => {
    if (!hydrated) return;
    saveBookPracticeProgress(bookSlug, sectionSlug, activeIndex + 1);
  }, [activeIndex, bookSlug, hydrated, sectionSlug]);

  function selectSentence(index: number) {
    const nextIndex = Math.min(sentences.length - 1, Math.max(0, index));
    setSelectedIndex(nextIndex);
    saveBookPracticeProgress(bookSlug, sectionSlug, nextIndex + 1);
  }

  function toggleAutoAdvance() {
    setAutoAdvancePreference(!autoAdvance);
  }

  function toggleReviewMode() {
    if (reviewMode) {
      setReviewMode(false);
      return;
    }
    const firstReviewIndex = reviewIndexes[0];
    if (firstReviewIndex === undefined) return;
    setReviewMode(true);
    selectSentence(firstReviewIndex);
  }

  function sentenceStatus(index: number) {
    const item = sentenceProgress[index];
    if (!item) return "미학습";
    if (!item.completedAt) return "오답";
    if (item.attempts > 1 || item.helped) return "완료, 복습 권장";
    return "완료";
  }

  return (
    <>
      <div className="mb-3 rounded-[0.9rem] border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="font-mono text-xs font-bold text-[var(--accent)]">
              SECTION {sectionPosition}/{sectionTotal}
            </p>
            <span
              aria-hidden="true"
              className="hidden h-3 w-px bg-[var(--line-strong)] sm:block"
            />
            <p className="text-sm font-bold">
              {reviewMode
                ? `복습 ${activeVisiblePosition + 1}/${visibleIndexes.length}`
                : `문장 ${activeIndex + 1}/${sentences.length}`}
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              완료 {completedCount}/{sentences.length}, 복습 대상{" "}
              {reviewIndexes.length}개
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
            <button
              type="button"
              className="button button-secondary min-h-11 px-3 text-sm"
              disabled={previousSentenceIndex === null}
              onClick={() =>
                previousSentenceIndex !== null &&
                selectSentence(previousSentenceIndex)
              }
              aria-label="이전 문장"
            >
              <CaretLeft aria-hidden="true" size={18} weight="bold" />
              이전
            </button>
            <label className="sr-only" htmlFor="book-practice-sentence">
              연습할 문장 선택
            </label>
            <select
              id="book-practice-sentence"
              value={activeIndex}
              onChange={(event) => selectSentence(Number(event.target.value))}
              className="min-h-11 min-w-0 flex-1 rounded-[0.7rem] border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-bold sm:flex-none"
            >
              {visibleIndexes.map((index) => {
                const item = sentences[index]!;
                return (
                  <option key={item.id} value={index}>
                    {index + 1} / {sentences.length} ({sentenceStatus(index)})
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="button button-secondary min-h-11 px-3 text-sm"
              disabled={nextSentenceIndex === null}
              onClick={() =>
                nextSentenceIndex !== null && selectSentence(nextSentenceIndex)
              }
              aria-label="다음 문장"
            >
              다음
              <CaretRight aria-hidden="true" size={18} weight="bold" />
            </button>
            <span
              aria-hidden="true"
              className="hidden h-6 w-px bg-[var(--line-strong)] xl:block"
            />
            <button
              type="button"
              className="button button-secondary min-h-11 px-3 text-sm"
              aria-pressed={autoAdvance}
              onClick={toggleAutoAdvance}
            >
              자동 다음 {autoAdvance ? "켜짐" : "꺼짐"}
            </button>
            <button
              type="button"
              className="button button-secondary min-h-11 px-3 text-sm"
              aria-pressed={reviewMode}
              disabled={reviewIndexes.length === 0}
              onClick={toggleReviewMode}
            >
              {reviewMode
                ? "전체 문장 보기"
                : `오답만 복습 ${reviewIndexes.length}`}
            </button>
          </div>
        </div>
      </div>

      <LessonPlayer
        key={`${sentence.id}:${reviewMode ? "review" : "normal"}`}
        lesson={lesson}
        contentKind="book-practice"
        singleStage
        autoAdvance={autoAdvance && nextSentenceIndex !== null}
        startInReplay={reviewMode}
        {...(nextSentenceIndex !== null
          ? {
              onNextLesson: () => selectSentence(nextSentenceIndex),
              nextLessonLabel: "다음 문장",
            }
          : reviewMode
            ? {
                onNextLesson: () => setReviewMode(false),
                nextLessonLabel: "복습 마치기",
              }
            : nextSectionHref
              ? {
                  nextLessonHref: nextSectionHref,
                  nextLessonLabel: "다음 부분",
                }
              : {
                  nextLessonHref: `/books/${bookSlug}`,
                  nextLessonLabel: "작품으로 돌아가기",
                })}
      />
    </>
  );
}
