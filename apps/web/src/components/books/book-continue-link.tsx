"use client";

import { ArrowRight, BookmarkSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { getBookReadingProgress } from "@/features/books/reading-progress";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function BookContinueLink({
  bookSlug,
  firstSectionSlug,
  sectionSlugs,
}: {
  bookSlug: string;
  firstSectionSlug: string;
  sectionSlugs: string[];
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const progress = hydrated ? getBookReadingProgress(bookSlug) : null;
  const hasProgress = Boolean(
    progress && sectionSlugs.includes(progress.sectionSlug),
  );
  const sectionSlug = hasProgress ? progress!.sectionSlug : firstSectionSlug;

  return (
    <Link
      href={`/books/${bookSlug}/read/${sectionSlug}`}
      className="button button-primary"
    >
      {hasProgress ? (
        <BookmarkSimple aria-hidden="true" size={18} weight="fill" />
      ) : null}
      {hasProgress ? "이어 읽기" : "처음부터 읽기"}
      <ArrowRight aria-hidden="true" size={18} weight="bold" />
    </Link>
  );
}
