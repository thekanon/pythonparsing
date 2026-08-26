import type { RssCandidate, TranslationPair } from "./types";
import {
  passesVerification,
  validateTranslationPair,
  verificationGateSchema,
} from "./verification";

const candidate: RssCandidate = {
  externalId: "item-1",
  canonicalUrl: "https://example.com/news/item-1",
  publishedAt: new Date("2026-08-26T00:00:00Z"),
  englishTitle: "Libraries extend study hours",
  englishExcerpt: "Five libraries will stay open later during the exam period.",
  sourceHash: "hash",
};
const translation: TranslationPair = {
  koreanTitle: "도서관들이 학습 시간을 연장한다",
  koreanExcerpt: "시험 기간에 다섯 곳의 도서관이 더 늦게까지 문을 연다.",
  provider: "fixture",
  model: "fixture-v1",
  characterCount: 100,
};
const allTrue = {
  meaningPreserved: true,
  complete: true,
  noHallucination: true,
  naturalKorean: true,
  safeForLearning: true,
};

describe("Gemini verification gate", () => {
  it("requires exactly five booleans and all values to be true", () => {
    expect(verificationGateSchema.parse(allTrue)).toEqual(allTrue);
    expect(passesVerification(allTrue)).toBe(true);
    expect(passesVerification({ ...allTrue, complete: false })).toBe(false);
    expect(() =>
      verificationGateSchema.parse({ ...allTrue, notes: "extra" }),
    ).toThrow();
  });

  it("applies language, length, and source-identity checks outside the model", () => {
    expect(validateTranslationPair(candidate, translation, candidate)).toEqual(
      [],
    );
    expect(
      validateTranslationPair(
        candidate,
        { ...translation, koreanTitle: "English only" },
        candidate,
      ),
    ).toContain("TARGET_LANGUAGE_INVALID");
    expect(
      validateTranslationPair(candidate, translation, {
        englishTitle: "Changed source",
        englishExcerpt: candidate.englishExcerpt,
      }),
    ).toContain("SOURCE_MISMATCH");
    expect(
      validateTranslationPair(
        { ...candidate, englishExcerpt: `Sentence ${"x".repeat(205)}` },
        translation,
        {
          englishTitle: candidate.englishTitle,
          englishExcerpt: `Sentence ${"x".repeat(205)}`,
        },
      ),
    ).toContain("EXCERPT_TOO_LONG");
  });
});
