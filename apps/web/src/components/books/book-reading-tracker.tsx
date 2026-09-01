"use client";

import { useEffect } from "react";

import {
  getBookReadingProgress,
  saveBookReadingProgress,
} from "@/features/books/reading-progress";

export function BookReadingTracker({
  bookSlug,
  sectionSlug,
}: {
  bookSlug: string;
  sectionSlug: string;
}) {
  useEffect(() => {
    const previous = getBookReadingProgress(bookSlug);
    const savedScrollY =
      previous?.sectionSlug === sectionSlug ? previous.scrollY : 0;

    saveBookReadingProgress(bookSlug, sectionSlug, savedScrollY);
    if (savedScrollY > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
      });
    }

    let frame = 0;
    const save = () => {
      frame = 0;
      saveBookReadingProgress(bookSlug, sectionSlug, window.scrollY);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(save);
    };
    const onPageHide = () =>
      saveBookReadingProgress(bookSlug, sectionSlug, window.scrollY);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      onPageHide();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [bookSlug, sectionSlug]);

  return null;
}
