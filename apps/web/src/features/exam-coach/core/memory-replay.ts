import type {
  FsrsAdapter,
  LearningEvent,
  MemoryState,
} from "./learning-engine";
import { toFsrsReviewInput, validateLearningEvent } from "./learning-engine";

export type FsrsAdapterResolver = (
  version: string,
  cardId: string,
) => FsrsAdapter;

export function rebuildMemoryStateFromEvents(
  events: readonly LearningEvent[],
  cardId: string,
  resolveAdapter: FsrsAdapterResolver,
): MemoryState | null {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new Error("cardId is required");
  }

  const canonical = canonicalizeLearningEvents(events);
  let state: MemoryState | null = null;

  for (const event of canonical) {
    if (event.mode === "assessment") continue;
    if (event.cardId !== normalizedCardId || !event.firstSubmission) {
      continue;
    }

    const adapter = resolveAdapter(event.fsrsVersion, normalizedCardId);
    validateAdapter(adapter, event.fsrsVersion);

    state = adapter.review(state, toFsrsReviewInput(event));
    validateMemoryState(state, normalizedCardId, adapter.version);
  }

  return state;
}

export function canonicalizeLearningEvents(
  events: readonly LearningEvent[],
): readonly LearningEvent[] {
  const byId = new Map<string, LearningEvent>();

  for (const event of events) {
    const errors = validateLearningEvent(event);
    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }

    const existing = byId.get(event.eventId);
    if (existing && !sameLearningEvent(existing, event)) {
      throw new Error("duplicate eventId has conflicting payload");
    }
    byId.set(event.eventId, existing ?? event);
  }

  return [...byId.values()].sort(compareLearningEvents);
}

function validateMemoryState(
  state: MemoryState,
  expectedCardId: string,
  expectedVersion: string,
): void {
  if (state.cardId !== expectedCardId) {
    throw new Error("FSRS adapter returned memory state for a different card");
  }
  if (state.fsrsVersion !== expectedVersion) {
    throw new Error("FSRS adapter returned memory state with wrong version");
  }
  if (Number.isNaN(Date.parse(state.dueAt))) {
    throw new Error("FSRS adapter returned memory state with invalid dueAt");
  }
  if (!Number.isFinite(state.stability) || state.stability <= 0) {
    throw new Error("FSRS adapter returned invalid stability");
  }
  if (!Number.isFinite(state.difficulty) || state.difficulty <= 0) {
    throw new Error("FSRS adapter returned invalid difficulty");
  }
}

function validateAdapter(adapter: FsrsAdapter, expectedVersion: string): void {
  if (adapter.version !== expectedVersion) {
    throw new Error("FSRS adapter version does not match event version");
  }
  if (
    !Number.isFinite(adapter.desiredRetention) ||
    adapter.desiredRetention <= 0 ||
    adapter.desiredRetention >= 1
  ) {
    throw new Error("FSRS adapter desiredRetention must be between 0 and 1");
  }
}

function compareLearningEvents(
  left: LearningEvent,
  right: LearningEvent,
): number {
  const timeDifference =
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
  return timeDifference || left.eventId.localeCompare(right.eventId);
}

function sameLearningEvent(left: LearningEvent, right: LearningEvent): boolean {
  return (
    left.eventId === right.eventId &&
    left.occurredAt === right.occurredAt &&
    left.learnerId === right.learnerId &&
    left.contentId === right.contentId &&
    left.contentVersion === right.contentVersion &&
    left.cardId === right.cardId &&
    left.correct === right.correct &&
    left.rating === right.rating &&
    left.responseTimeMs === right.responseTimeMs &&
    left.helpLevel === right.helpLevel &&
    left.mode === right.mode &&
    left.firstSubmission === right.firstSubmission &&
    left.fsrsVersion === right.fsrsVersion
  );
}
