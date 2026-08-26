import { z } from "zod";

import { unicodeLength } from "@/server/domain/text";

import type { RssCandidate, TranslationPair } from "./types";

export const verificationGateSchema = z
  .object({
    meaningPreserved: z.boolean(),
    complete: z.boolean(),
    noHallucination: z.boolean(),
    naturalKorean: z.boolean(),
    safeForLearning: z.boolean(),
  })
  .strict();

export type VerificationGate = z.infer<typeof verificationGateSchema>;

export const verificationJsonSchema = {
  type: "object",
  properties: {
    meaningPreserved: { type: "boolean" },
    complete: { type: "boolean" },
    noHallucination: { type: "boolean" },
    naturalKorean: { type: "boolean" },
    safeForLearning: { type: "boolean" },
  },
  required: [
    "meaningPreserved",
    "complete",
    "noHallucination",
    "naturalKorean",
    "safeForLearning",
  ],
  additionalProperties: false,
} as const;

export function passesVerification(gate: VerificationGate): boolean {
  return Object.values(gate).every((value) => value === true);
}

function includesEnglish(value: string): boolean {
  return /[A-Za-z]/u.test(value);
}

function includesKorean(value: string): boolean {
  return /[가-힣]/u.test(value.normalize("NFC"));
}

export function validateTranslationPair(
  candidate: RssCandidate,
  translation: TranslationPair,
  sourceSentToVerifier: Pick<RssCandidate, "englishTitle" | "englishExcerpt">,
): string[] {
  const errors: string[] = [];

  if (!candidate.englishTitle || !candidate.englishExcerpt)
    errors.push("SOURCE_EMPTY");
  if (!translation.koreanTitle || !translation.koreanExcerpt)
    errors.push("TRANSLATION_EMPTY");
  if (unicodeLength(candidate.englishExcerpt) > 200)
    errors.push("EXCERPT_TOO_LONG");
  if (
    !includesEnglish(candidate.englishTitle) ||
    !includesEnglish(candidate.englishExcerpt)
  ) {
    errors.push("SOURCE_LANGUAGE_INVALID");
  }
  if (
    !includesKorean(translation.koreanTitle) ||
    !includesKorean(translation.koreanExcerpt)
  ) {
    errors.push("TARGET_LANGUAGE_INVALID");
  }
  if (
    candidate.englishTitle !== sourceSentToVerifier.englishTitle ||
    candidate.englishExcerpt !== sourceSentToVerifier.englishExcerpt
  ) {
    errors.push("SOURCE_MISMATCH");
  }

  return errors;
}
