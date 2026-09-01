import { createHash } from "node:crypto";

import type {
  ApprovedCandidate,
  PreparedBatch,
  QuarantinedCandidate,
  RssCandidate,
  TranslationAdapter,
  VerificationAdapter,
} from "./types";
import { passesVerification, validateTranslationPair } from "./verification";

type WorkflowOptions = {
  targetCount?: number;
  maximumCandidates?: number;
  maximumCharacters?: number;
  retryDelaysMs?: readonly number[];
  wait?: (milliseconds: number) => Promise<void>;
};

function safeExternalIdHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedErrorCode(error: unknown): string {
  if (error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message))
    return error.message;
  return "EXTERNAL_SERVICE_FAILURE";
}

async function withRetry<T>(
  operation: () => Promise<T>,
  delays: readonly number[],
  wait: (milliseconds: number) => Promise<void>,
): Promise<{ value: T; retries: number }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return { value: await operation(), retries: attempt };
    } catch (error) {
      lastError = error;
      const delay = delays[attempt];
      if (delay === undefined) break;
      await wait(delay);
    }
  }

  throw lastError;
}

export async function prepareIngestionBatch(
  candidates: readonly RssCandidate[],
  translator: TranslationAdapter,
  verifier: VerificationAdapter,
  options: WorkflowOptions = {},
): Promise<PreparedBatch> {
  const targetCount = options.targetCount ?? 10;
  const maximumCandidates = options.maximumCandidates ?? 30;
  const maximumCharacters = options.maximumCharacters ?? 450_000;
  const retryDelaysMs = options.retryDelaysMs ?? [250, 1_000];
  const wait =
    options.wait ??
    ((milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const approved: ApprovedCandidate[] = [];
  const quarantined: QuarantinedCandidate[] = [];
  let translatedCount = 0;
  let characterCount = 0;

  for (const candidate of candidates.slice(0, maximumCandidates)) {
    if (approved.length >= targetCount) break;

    const estimatedCharacters = Array.from(
      candidate.englishTitle + candidate.englishExcerpt,
    ).length;
    if (characterCount + estimatedCharacters > maximumCharacters) {
      quarantined.push({
        externalIdHash: safeExternalIdHash(candidate.externalId),
        errorCode: "TRANSLATION_QUOTA_GUARD",
        retries: 0,
      });
      break;
    }

    let translation:
      Awaited<ReturnType<TranslationAdapter["translate"]>> | undefined;

    try {
      const translated = await withRetry(
        () => translator.translate(candidate),
        retryDelaysMs,
        wait,
      );
      translatedCount += 1;
      characterCount += translated.value.characterCount;
      translation = translated.value;

      const sourceSentToVerifier = {
        englishTitle: candidate.englishTitle,
        englishExcerpt: candidate.englishExcerpt,
      };
      const applicationErrors = validateTranslationPair(
        candidate,
        translated.value,
        sourceSentToVerifier,
      );
      if (applicationErrors.length > 0) {
        quarantined.push({
          externalIdHash: safeExternalIdHash(candidate.externalId),
          errorCode: applicationErrors[0]!,
          retries: translated.retries,
          candidate,
          translation: translated.value,
        });
        continue;
      }

      const verified = await withRetry(
        () => verifier.verify(candidate, translated.value),
        retryDelaysMs,
        wait,
      );

      if (!passesVerification(verified.value)) {
        quarantined.push({
          externalIdHash: safeExternalIdHash(candidate.externalId),
          errorCode: "VERIFICATION_REJECTED",
          retries: translated.retries + verified.retries,
          candidate,
          translation: translated.value,
          verification: verified.value,
        });
        continue;
      }

      approved.push({
        ...candidate,
        ...translated.value,
        verification: verified.value,
        verificationModel: verifier.model,
      });
    } catch (error) {
      quarantined.push({
        externalIdHash: safeExternalIdHash(candidate.externalId),
        errorCode: normalizedErrorCode(error),
        retries: retryDelaysMs.length,
        candidate,
        ...(translation ? { translation } : {}),
      });
    }
  }

  return {
    discoveredCount: Math.min(candidates.length, maximumCandidates),
    translatedCount,
    approved,
    quarantined,
    characterCount,
    warningCode:
      approved.length < targetCount ? "INSUFFICIENT_APPROVED_CONTENT" : null,
  };
}
