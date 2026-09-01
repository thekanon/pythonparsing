import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import type { LessonStage } from "@/features/lessons/types";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

const proofPayloadSchema = z.object({
  version: z.literal(1),
  lessonId: z.string().min(1).max(160),
  stage: z.enum(["title", "excerpt"]),
  attempts: z.number().int().min(1).max(3),
  expiresAt: z.number().int().positive(),
});

const PROOF_LIFETIME_MS = 2 * 60 * 60 * 1_000;

function proofSecret() {
  const secret = getServerEnv().BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (isFixtureRuntime()) return "newsorder-fixture-attempt-proof";
  throw new Error("ATTEMPT_PROOF_NOT_CONFIGURED");
}

function signature(encodedPayload: string) {
  return createHmac("sha256", proofSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function verifyAttemptProof(
  proof: string | undefined,
  lessonId: string,
  stage: LessonStage,
): number {
  if (!proof) return 0;
  const [encodedPayload, encodedSignature, extra] = proof.split(".");
  if (!encodedPayload || !encodedSignature || extra) return 0;

  const expected = Buffer.from(signature(encodedPayload));
  const actual = Buffer.from(encodedSignature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return 0;
  }

  try {
    const payload = proofPayloadSchema.parse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    );
    if (
      payload.lessonId !== lessonId ||
      payload.stage !== stage ||
      payload.expiresAt < Date.now()
    ) {
      return 0;
    }
    return payload.attempts;
  } catch {
    return 0;
  }
}

export function createAttemptProof(
  previousProof: string | undefined,
  lessonId: string,
  stage: LessonStage,
): string {
  const attempts = Math.min(
    3,
    verifyAttemptProof(previousProof, lessonId, stage) + 1,
  );
  const encodedPayload = Buffer.from(
    JSON.stringify({
      version: 1,
      lessonId,
      stage,
      attempts,
      expiresAt: Date.now() + PROOF_LIFETIME_MS,
    }),
  ).toString("base64url");
  return `${encodedPayload}.${signature(encodedPayload)}`;
}
