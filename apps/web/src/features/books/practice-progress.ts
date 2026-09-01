export const BOOK_PRACTICE_PROGRESS_STORAGE_KEY =
  "newsorder.book-practice-position.v1";

export type BookPracticeProgress = {
  sectionSlug: string;
  sentencePosition: number;
  updatedAt: string;
};

type BookPracticeProgressMap = Record<string, BookPracticeProgress>;

function isProgress(value: unknown): value is BookPracticeProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<BookPracticeProgress>;
  return (
    typeof progress.sectionSlug === "string" &&
    /^[a-z0-9-]+$/u.test(progress.sectionSlug) &&
    typeof progress.sentencePosition === "number" &&
    Number.isInteger(progress.sentencePosition) &&
    progress.sentencePosition >= 1 &&
    typeof progress.updatedAt === "string"
  );
}

function readProgressMap(): BookPracticeProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BOOK_PRACTICE_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, BookPracticeProgress] =>
          isProgress(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function getBookPracticeProgress(
  bookSlug: string,
): BookPracticeProgress | null {
  return readProgressMap()[bookSlug] ?? null;
}

export function saveBookPracticeProgress(
  bookSlug: string,
  sectionSlug: string,
  sentencePosition: number,
) {
  if (typeof window === "undefined") return;
  const progress = readProgressMap();
  progress[bookSlug] = {
    sectionSlug,
    sentencePosition: Math.max(1, Math.round(sentencePosition)),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    BOOK_PRACTICE_PROGRESS_STORAGE_KEY,
    JSON.stringify(progress),
  );
}
