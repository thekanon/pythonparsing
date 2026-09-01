"use client";

import { BookOpenText, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { normalizeEnglishWord } from "@/features/lessons/english-words";

type LookupState = {
  word: string;
  normalizedWord: string;
  meaning?: string;
  error?: string;
  loading: boolean;
  left: number;
  top: number;
};

type TouchStart = { x: number; y: number; time: number };

const WORD_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

function popupPosition(rect: DOMRect) {
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

function wordRangeAtPoint(clientX: number, clientY: number) {
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
  const fallbackRange = documentWithCaret.caretRangeFromPoint?.(
    clientX,
    clientY,
  );
  const node = position?.offsetNode ?? fallbackRange?.startContainer;
  const offset = position?.offset ?? fallbackRange?.startOffset;
  if (!(node instanceof Text) || offset === undefined) return null;

  const text = node.textContent ?? "";
  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset < start || offset > end) continue;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    return { word: match[0], range };
  }
  return null;
}

export function BookReaderText({
  paragraphs,
  sectionId,
}: {
  paragraphs: string[];
  sectionId: string;
}) {
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const touchStartRef = useRef<TouchStart | null>(null);

  useEffect(() => {
    if (!lookup) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLookup(null);
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popupRef.current?.contains(target)) return;
      setLookup(null);
    };
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

  async function lookUpWord(word: string, range: Range) {
    const normalizedWord = normalizeEnglishWord(word);
    if (!normalizedWord) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLookup({
      word,
      normalizedWord,
      loading: true,
      ...popupPosition(range.getBoundingClientRect()),
    });

    const query = new URLSearchParams({
      lessonId: sectionId,
      stage: "excerpt",
      word: normalizedWord,
      source: "book-reader",
    });
    try {
      const response = await fetch(`/api/word-meaning?${query}`, {
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        meaning?: unknown;
      } | null;
      if (!response.ok || typeof body?.meaning !== "string") {
        throw new Error("LOOKUP_FAILED");
      }
      setLookup((current) =>
        current?.normalizedWord === normalizedWord
          ? { ...current, loading: false, meaning: body.meaning as string }
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

  function onDoubleClick() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const word = selection.toString().trim();
    if (!normalizeEnglishWord(word)) return;
    void lookUpWord(word, selection.getRangeAt(0));
  }

  return (
    <>
      <div
        className="book-reader-copy"
        onDoubleClick={onDoubleClick}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          touchStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            time: Date.now(),
          };
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse") return;
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start) return;
          if (
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 ||
            Date.now() - start.time > 650
          ) {
            return;
          }
          const selected = wordRangeAtPoint(event.clientX, event.clientY);
          if (selected) void lookUpWord(selected.word, selected.range);
        }}
      >
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
        ))}
      </div>

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
