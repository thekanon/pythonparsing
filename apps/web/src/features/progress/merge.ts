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
    attempts: Math.min(ATTEMPT_LIMIT, Math.max(left.attempts, right.attempts)),
    bestScore: Math.max(left.bestScore, right.bestScore),
    completedAt: earliestNullableIso(left.completedAt, right.completedAt),
    helped: left.helped || right.helped,
    lastAttemptAt: latestIso(left.lastAttemptAt, right.lastAttemptAt),
  };
}

export function chunkAnonymousProgress(
  progress: AnonymousProgress,
  chunkSize: number,
): AnonymousProgress[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error("INVALID_PROGRESS_CHUNK_SIZE");
  }

  const entries = Object.entries(progress.stages);
  const chunks: AnonymousProgress[] = [];

  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push({
      version: 1,
      stages: Object.fromEntries(entries.slice(index, index + chunkSize)),
    });
  }

  return chunks;
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
