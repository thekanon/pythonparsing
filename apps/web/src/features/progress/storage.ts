"use client";

import type { GradeResult, LessonStage } from "@/features/lessons/types";

import {
  anonymousProgressSchema,
  EMPTY_ANONYMOUS_PROGRESS,
  type AnonymousProgress,
  progressKey,
} from "./types";

export const ANONYMOUS_PROGRESS_STORAGE_KEY = "newsorder.progress.v1";
const PROGRESS_EVENT = "newsorder:progress";

let cachedRaw: string | null | undefined;
let cachedProgress: AnonymousProgress = EMPTY_ANONYMOUS_PROGRESS;

function readRaw() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ANONYMOUS_PROGRESS_STORAGE_KEY);
}

export function getAnonymousProgressSnapshot(): AnonymousProgress {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedProgress;

  cachedRaw = raw;
  if (!raw) {
    cachedProgress = EMPTY_ANONYMOUS_PROGRESS;
    return cachedProgress;
  }

  try {
    const parsed = anonymousProgressSchema.safeParse(JSON.parse(raw));
    cachedProgress = parsed.success ? parsed.data : EMPTY_ANONYMOUS_PROGRESS;
  } catch {
    cachedProgress = EMPTY_ANONYMOUS_PROGRESS;
  }

  return cachedProgress;
}

export function getAnonymousProgressServerSnapshot(): AnonymousProgress {
  return EMPTY_ANONYMOUS_PROGRESS;
}

export function subscribeToAnonymousProgress(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ANONYMOUS_PROGRESS_STORAGE_KEY) {
      cachedRaw = undefined;
      onStoreChange();
    }
  };
  const handleProgress = () => {
    cachedRaw = undefined;
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(PROGRESS_EVENT, handleProgress);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PROGRESS_EVENT, handleProgress);
  };
}

function saveProgress(progress: AnonymousProgress) {
  const raw = JSON.stringify(progress);
  window.localStorage.setItem(ANONYMOUS_PROGRESS_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedProgress = progress;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function recordAnonymousAttempt(
  lessonId: string,
  stage: LessonStage,
  result: GradeResult,
  helped = false,
) {
  const progress = getAnonymousProgressSnapshot();
  const key = progressKey(lessonId, stage);
  const previous = progress.stages[key];
  const now = new Date().toISOString();

  saveProgress({
    version: 1,
    stages: {
      ...progress.stages,
      [key]: {
        attempts: Math.min(10_000, (previous?.attempts ?? 0) + 1),
        bestScore: Math.max(previous?.bestScore ?? 0, result.score),
        completedAt: previous?.completedAt ?? (result.complete ? now : null),
        helped: previous?.helped === true || helped,
        lastAttemptAt: now,
      },
    },
  });
}

export function markAnonymousHelped(lessonId: string, stage: LessonStage) {
  const progress = getAnonymousProgressSnapshot();
  const key = progressKey(lessonId, stage);
  const previous = progress.stages[key];
  const now = new Date().toISOString();

  saveProgress({
    version: 1,
    stages: {
      ...progress.stages,
      [key]: {
        attempts: previous?.attempts ?? 0,
        bestScore: Math.max(previous?.bestScore ?? 0, 100),
        completedAt: previous?.completedAt ?? now,
        helped: true,
        lastAttemptAt: now,
      },
    },
  });
}

export function replaceAnonymousProgress(progress: AnonymousProgress) {
  saveProgress(anonymousProgressSchema.parse(progress));
}

export function clearAnonymousProgress() {
  window.localStorage.removeItem(ANONYMOUS_PROGRESS_STORAGE_KEY);
  cachedRaw = null;
  cachedProgress = EMPTY_ANONYMOUS_PROGRESS;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}
