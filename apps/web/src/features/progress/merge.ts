import type { AnonymousProgress, ProgressStage } from "./types";

const ATTEMPT_LIMIT = 10_000;

function latestIso(left: string, right: string): string {
  return new Date(left) >= new Date(right) ? left : right;
}

function earliestNullableIso(
  left: string | null,
  right: string | null,
): string | null {
  if (!left) return right;
  if (!right) return left;
  return new Date(left) <= new Date(right) ? left : right;
}

export function mergeProgressStage(
  left: ProgressStage,
  right: ProgressStage,
): ProgressStage {
  return {
    attempts: Math.min(ATTEMPT_LIMIT, left.attempts + right.attempts),
    bestScore: Math.max(left.bestScore, right.bestScore),
    completedAt: earliestNullableIso(left.completedAt, right.completedAt),
    helped: left.helped || right.helped,
    lastAttemptAt: latestIso(left.lastAttemptAt, right.lastAttemptAt),
  };
}

export function mergeAnonymousProgress(
  local: AnonymousProgress,
  remote: AnonymousProgress,
): AnonymousProgress {
  const stages = { ...remote.stages };

  for (const [key, localStage] of Object.entries(local.stages)) {
    const remoteStage = stages[key];
    stages[key] = remoteStage
      ? mergeProgressStage(localStage, remoteStage)
      : localStage;
  }

  return { version: 1, stages };
}
