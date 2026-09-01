import "server-only";

import aliceInWonderlandExercises from "@/features/books/exercises/alice-in-wonderland.json";
import daddyLongLegsExercises from "@/features/books/exercises/daddy-long-legs.json";
import jekyllAndHydeExercises from "@/features/books/exercises/dr-jekyll-and-mr-hyde.json";
import wizardOfOzExercises from "@/features/books/exercises/the-wonderful-wizard-of-oz.json";
import daddyLongLegsBlueWednesdayGrammarGuides from "@/features/books/grammar-guides/daddy-long-legs-blue-wednesday.json";
import daddyLongLegsLetterOneGrammarGuides from "@/features/books/grammar-guides/daddy-long-legs-letter-001.json";
import daddyLongLegsLetterTwoGrammarGuides from "@/features/books/grammar-guides/daddy-long-legs-letter-002.json";
import jekyllChapterOneGrammarGuides from "@/features/books/grammar-guides/dr-jekyll-and-mr-hyde-chapter-01.json";
import {
  getCuratedPublicDomainBookTranslation,
  getPublicDomainBook,
  type PublicDomainBook,
} from "@/features/books/catalog";
import {
  fisherYates,
  seededRandom,
  tokenizeKorean,
} from "@/features/lessons/tokenize";
import type { PublicGrammarGuide, PublicToken } from "@/features/lessons/types";
import {
  getPublicDomainBookSection,
  type PublicDomainBookSection,
} from "@/server/book-reader";

export type BookPracticeSentence = {
  id: string;
  sectionSlug: string;
  position: number;
  paragraphIndex: number;
  english: string;
  korean: string;
  translationProvider: string;
};

export type BookPracticeSection = {
  sectionSlug: string;
  sentenceCount: number;
  sentences: BookPracticeSentence[];
};

export type BookPracticeText = {
  bookSlug: string;
  scope: "pilot" | "all";
  sentenceCount: number;
  sections: BookPracticeSection[];
};

export type BookPracticeSectionView = {
  book: PublicDomainBook;
  bookSection: PublicDomainBookSection;
  section: BookPracticeSection;
  sectionPosition: number;
  sectionTotal: number;
  previousSectionSlug: string | null;
  nextSectionSlug: string | null;
};

export type PublicBookPracticeSentence = {
  id: string;
  position: number;
  english: string;
  tokens: PublicToken[];
  grammarGuide?: PublicGrammarGuide;
};

type StoredGrammarGuide = {
  sentenceId: string;
  provider: "claude-cli/sonnet" | "codex-cli/gpt-5.6-terra";
  structure: string;
  steps: Array<{
    role: string;
    englishPhrase: string;
    koreanFunction: string;
    instruction: string;
    tokenEnd: number;
  }>;
  grammarPoints: Array<{
    expression: string;
    explanation: string;
  }>;
};

const BOOK_PRACTICE_TEXTS = [
  daddyLongLegsExercises,
  wizardOfOzExercises,
  aliceInWonderlandExercises,
  jekyllAndHydeExercises,
] as BookPracticeText[];

const grammarGuides = new Map(
  [
    ...(daddyLongLegsBlueWednesdayGrammarGuides.guides as StoredGrammarGuide[]),
    ...(daddyLongLegsLetterOneGrammarGuides.guides as StoredGrammarGuide[]),
    ...(daddyLongLegsLetterTwoGrammarGuides.guides as StoredGrammarGuide[]),
    ...(jekyllChapterOneGrammarGuides.guides as StoredGrammarGuide[]),
  ].map((guide) => [guide.sentenceId, guide]),
);

function toPublicGrammarGuide(
  guide: StoredGrammarGuide,
  tokens: readonly { id: string }[],
): PublicGrammarGuide {
  let tokenStart = 0;
  const steps = guide.steps.map((step) => {
    if (step.tokenEnd < tokenStart || step.tokenEnd >= tokens.length) {
      throw new Error("GRAMMAR_GUIDE_TOKEN_RANGE_INVALID");
    }
    const tokenIds = tokens
      .slice(tokenStart, step.tokenEnd + 1)
      .map((token) => token.id);
    tokenStart = step.tokenEnd + 1;
    return {
      role: step.role,
      englishPhrase: step.englishPhrase,
      koreanFunction: step.koreanFunction,
      instruction: step.instruction,
      tokenIds,
    };
  });
  if (tokenStart !== tokens.length) {
    throw new Error("GRAMMAR_GUIDE_TOKEN_COVERAGE_INVALID");
  }
  return {
    provider: guide.provider,
    ...(guide.sentenceId.startsWith("daddy-long-legs:blue-wednesday:")
      ? { learningMode: "structure-reasoning" as const }
      : {}),
    structure: guide.structure,
    steps,
    grammarPoints: guide.grammarPoints,
  };
}

const sentenceViews = new Map<
  string,
  { bookSlug: string; sentence: BookPracticeSentence }
>();
for (const text of BOOK_PRACTICE_TEXTS) {
  for (const section of text.sections) {
    for (const sentence of section.sentences) {
      sentenceViews.set(sentence.id, { bookSlug: text.bookSlug, sentence });
    }
  }
}

export function getBookPracticeText(bookSlug: string) {
  return BOOK_PRACTICE_TEXTS.find((text) => text.bookSlug === bookSlug) ?? null;
}

export function getBookPracticeSection(
  bookSlug: string,
  sectionSlug: string,
): BookPracticeSectionView | null {
  const book = getPublicDomainBook(bookSlug);
  const text = getBookPracticeText(bookSlug);
  const bookSectionView = getPublicDomainBookSection(bookSlug, sectionSlug);
  if (!book || !text || !bookSectionView) return null;
  const sectionPosition = text.sections.findIndex(
    (section) => section.sectionSlug === sectionSlug,
  );
  if (sectionPosition < 0) return null;
  return {
    book,
    bookSection: bookSectionView.section,
    section: text.sections[sectionPosition]!,
    sectionPosition: sectionPosition + 1,
    sectionTotal: text.sections.length,
    previousSectionSlug:
      sectionPosition > 0
        ? (text.sections[sectionPosition - 1]?.sectionSlug ?? null)
        : null,
    nextSectionSlug:
      sectionPosition < text.sections.length - 1
        ? (text.sections[sectionPosition + 1]?.sectionSlug ?? null)
        : null,
  };
}

export function findBookPracticeSentence(sentenceId: string) {
  const view = sentenceViews.get(sentenceId);
  if (!view) return null;
  const korean =
    getCuratedPublicDomainBookTranslation(
      view.bookSlug,
      view.sentence.english,
    ) ?? view.sentence.korean;
  return { ...view, korean };
}

export function createBookPracticeTokens(sentenceId: string) {
  const view = findBookPracticeSentence(sentenceId);
  if (!view) return null;
  return tokenizeKorean(
    view.korean,
    (position) => `${sentenceId}:token-${String(position).padStart(3, "0")}`,
  );
}

export function toPublicBookPracticeSentence(
  sentence: BookPracticeSentence,
): PublicBookPracticeSentence {
  const tokens = createBookPracticeTokens(sentence.id);
  if (!tokens) throw new Error("BOOK_PRACTICE_SENTENCE_NOT_FOUND");
  const grammarGuide = grammarGuides.get(sentence.id);
  return {
    id: sentence.id,
    position: sentence.position,
    english: sentence.english,
    tokens: fisherYates(tokens, seededRandom(sentence.id)).map(
      ({ id, text }) => ({ id, text }),
    ),
    ...(grammarGuide
      ? { grammarGuide: toPublicGrammarGuide(grammarGuide, tokens) }
      : {}),
  };
}

export function getBookPracticeSectionParams() {
  return BOOK_PRACTICE_TEXTS.flatMap((text) =>
    text.sections.map((section) => ({
      bookSlug: text.bookSlug,
      sectionSlug: section.sectionSlug,
    })),
  );
}
