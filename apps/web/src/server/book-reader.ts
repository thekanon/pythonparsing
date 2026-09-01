import "server-only";

import aliceInWonderlandText from "@/features/books/texts/alice-in-wonderland.json";
import daddyLongLegsText from "@/features/books/texts/daddy-long-legs.json";
import jekyllAndHydeText from "@/features/books/texts/dr-jekyll-and-mr-hyde.json";
import wizardOfOzText from "@/features/books/texts/the-wonderful-wizard-of-oz.json";
import {
  getPublicDomainBook,
  type PublicDomainBook,
} from "@/features/books/catalog";

export type PublicDomainBookSection = {
  id: string;
  slug: string;
  label: string;
  englishTitle: string;
  koreanTitle: string;
  summary: string;
  wordCount: number;
  paragraphs: string[];
};

export type PublicDomainBookText = {
  bookSlug: string;
  sourceEbookNumber: number;
  totalWords: number;
  sections: PublicDomainBookSection[];
};

export type PublicDomainBookSectionView = {
  book: PublicDomainBook;
  text: PublicDomainBookText;
  section: PublicDomainBookSection;
  position: number;
  total: number;
  previousSectionSlug: string | null;
  nextSectionSlug: string | null;
};

const PUBLIC_DOMAIN_BOOK_TEXTS = [
  daddyLongLegsText,
  wizardOfOzText,
  aliceInWonderlandText,
  jekyllAndHydeText,
] as PublicDomainBookText[];

export function getPublicDomainBookText(bookSlug: string) {
  return (
    PUBLIC_DOMAIN_BOOK_TEXTS.find((text) => text.bookSlug === bookSlug) ?? null
  );
}

export function getPublicDomainBookSection(
  bookSlug: string,
  sectionSlug: string,
): PublicDomainBookSectionView | null {
  const book = getPublicDomainBook(bookSlug);
  const text = getPublicDomainBookText(bookSlug);
  if (!book || !text) return null;

  const position = text.sections.findIndex(
    (section) => section.slug === sectionSlug,
  );
  if (position < 0) return null;

  return {
    book,
    text,
    section: text.sections[position]!,
    position: position + 1,
    total: text.sections.length,
    previousSectionSlug:
      position > 0 ? (text.sections[position - 1]?.slug ?? null) : null,
    nextSectionSlug:
      position < text.sections.length - 1
        ? (text.sections[position + 1]?.slug ?? null)
        : null,
  };
}

export function findPublicDomainBookSection(
  sectionId: string,
): PublicDomainBookSectionView | null {
  for (const text of PUBLIC_DOMAIN_BOOK_TEXTS) {
    const section = text.sections.find(
      (candidate) => candidate.id === sectionId,
    );
    if (!section) continue;
    return getPublicDomainBookSection(text.bookSlug, section.slug);
  }
  return null;
}

export function getPublicDomainBookSectionParams() {
  return PUBLIC_DOMAIN_BOOK_TEXTS.flatMap((text) =>
    text.sections.map((section) => ({
      bookSlug: text.bookSlug,
      sectionSlug: section.slug,
    })),
  );
}
