"use client";

import { BookOpenText, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import {
  normalizeEnglishWord,
  splitEnglishText,
} from "@/features/lessons/english-words";
import type { LessonStage } from "@/features/lessons/types";

type LookupState = {
  word: string;
  normalizedWord: string;
  meaning?: string;
  error?: string;
  loading: boolean;
  left: number;
  top: number;
};

function popupPosition(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const popupWidth = Math.min(288, window.innerWidth - 32);
  const halfWidth = popupWidth / 2;
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, halfWidth + 16),
    window.innerWidth - halfWidth - 16,
  );
  const below = rect.bottom + 10;
  const top =
    below + 150 < window.innerHeight ? below : Math.max(16, rect.top - 150);
  return { left, top };
}

export function WordLookupText({
  text,
  lessonId,
  stage,
  source = "lesson",
}: {
  text: string;
  lessonId: string;
  stage: LessonStage;
  source?: "lesson" | "reddit" | "book" | "book-practice";
}) {
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!lookup) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLookup(null);
    }

    function closeOnOutsidePress(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-word-lookup-trigger]")) return;
      if (popupRef.current?.contains(target)) return;
      setLookup(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [lookup]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function lookUpWord(word: string, anchor: HTMLElement) {
    const normalizedWord = normalizeEnglishWord(word);
    if (!normalizedWord) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const position = popupPosition(anchor);
    setLookup({
      word,
      normalizedWord,
      loading: true,
      ...position,
    });

    const query = new URLSearchParams({
      lessonId,
      stage,
      word: normalizedWord,
      source,
    });
    try {
      const response = await fetch(`/api/word-meaning?${query}`, {
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        meaning?: unknown;
      } | null;
      const meaning = body?.meaning;
      if (!response.ok || typeof meaning !== "string") {
        throw new Error("LOOKUP_FAILED");
      }
      setLookup((current) =>
        current?.normalizedWord === normalizedWord
          ? { ...current, loading: false, meaning }
          : current,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLookup((current) =>
        current?.normalizedWord === normalizedWord
          ? {
              ...current,
              loading: false,
              error: "뜻을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
            }
          : current,
      );
    }
  }

  return (
    <>
      {splitEnglishText(text).map((segment, index) => {
        const normalizedWord = normalizeEnglishWord(segment);
        if (!normalizedWord)
          return <span key={`${segment}-${index}`}>{segment}</span>;

        const selected = lookup?.normalizedWord === normalizedWord;
        return (
          <button
            key={`${segment}-${index}`}
            type="button"
            data-word-lookup-trigger
            aria-label={`${segment} 뜻 보기`}
            aria-pressed={selected}
            title="더블클릭하여 뜻 보기"
            className={`inline cursor-help appearance-none rounded-[0.2em] border-0 bg-transparent p-0 text-left transition-colors [font:inherit] hover:bg-[color:color-mix(in_srgb,var(--accent)_13%,transparent)] focus-visible:bg-[color:color-mix(in_srgb,var(--accent)_13%,transparent)] ${
              selected
                ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]"
                : ""
            }`}
            onDoubleClick={(event) => {
              event.preventDefault();
              void lookUpWord(segment, event.currentTarget);
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== "mouse") {
                void lookUpWord(segment, event.currentTarget);
              }
            }}
            onClick={(event) => {
              if (event.detail === 0) {
                void lookUpWord(segment, event.currentTarget);
              }
            }}
          >
            {segment}
          </button>
        );
      })}

      {lookup &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="status"
            aria-live="polite"
            className="fixed z-50 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[1rem] border border-[var(--line-strong)] bg-[var(--surface-raised)] p-4 shadow-[0_1.25rem_4rem_rgb(var(--shadow)/0.24)]"
            style={{ left: lookup.left, top: lookup.top }}
          >
            <div className="flex items-start gap-3">
              <BookOpenText
                aria-hidden="true"
                size={21}
                weight="bold"
                className="mt-0.5 shrink-0 text-[var(--accent)]"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-bold text-[var(--accent)]">
                  {lookup.word}
                </p>
                <p className="mt-1.5 text-sm leading-6 font-semibold">
                  {lookup.loading
                    ? "뜻을 찾고 있습니다…"
                    : (lookup.meaning ?? lookup.error)}
                </p>
              </div>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
                aria-label="단어 뜻 닫기"
                onClick={() => setLookup(null)}
              >
                <X aria-hidden="true" size={17} weight="bold" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
