"use client";

import { ArrowRight, BookmarkSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { getBookPracticeProgress } from "@/features/books/practice-progress";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function BookPracticeContinueLink({
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
  const progress = hydrated ? getBookPracticeProgress(bookSlug) : null;
  const hasProgress = Boolean(
    progress && sectionSlugs.includes(progress.sectionSlug),
  );
  const sectionSlug = hasProgress ? progress!.sectionSlug : firstSectionSlug;

  return (
    <Link
      href={`/books/${bookSlug}/practice/${sectionSlug}`}
      className="button button-primary"
    >
      {hasProgress ? (
        <BookmarkSimple aria-hidden="true" size={18} weight="fill" />
      ) : null}
      {hasProgress ? "배열 학습 이어하기" : "처음부터 배열 학습"}
      <ArrowRight aria-hidden="true" size={18} weight="bold" />
    </Link>
  );
}
