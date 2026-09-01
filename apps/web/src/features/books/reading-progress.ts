export const BOOK_READING_PROGRESS_STORAGE_KEY = "newsorder.book-reading.v1";

export type BookReadingProgress = {
  sectionSlug: string;
  scrollY: number;
  updatedAt: string;
};

type BookReadingProgressMap = Record<string, BookReadingProgress>;

function isProgress(value: unknown): value is BookReadingProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<BookReadingProgress>;
  return (
    typeof progress.sectionSlug === "string" &&
    /^[a-z0-9-]+$/u.test(progress.sectionSlug) &&
    typeof progress.scrollY === "number" &&
    Number.isFinite(progress.scrollY) &&
    progress.scrollY >= 0 &&
    typeof progress.updatedAt === "string"
  );
}

function readProgressMap(): BookReadingProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BOOK_READING_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, BookReadingProgress] => isProgress(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function getBookReadingProgress(
  bookSlug: string,
): BookReadingProgress | null {
  return readProgressMap()[bookSlug] ?? null;
}

export function saveBookReadingProgress(
  bookSlug: string,
  sectionSlug: string,
  scrollY: number,
) {
  if (typeof window === "undefined") return;
  const progress = readProgressMap();
  progress[bookSlug] = {
    sectionSlug,
    scrollY: Math.max(0, Math.round(scrollY)),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    BOOK_READING_PROGRESS_STORAGE_KEY,
    JSON.stringify(progress),
  );
}
