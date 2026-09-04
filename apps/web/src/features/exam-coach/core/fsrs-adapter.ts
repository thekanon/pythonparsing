import {
  FSRSVersion,
  Rating,
  State,
  createEmptyCard,
  date_scheduler,
  fsrs,
  type Card,
  type Grade,
} from "ts-fsrs";

import {
  DEFAULT_DESIRED_RETENTION,
  type FsrsAdapter,
  type FsrsRating,
  type FsrsReviewInput,
  type MemoryState,
} from "./learning-engine";

export const TS_FSRS_VERSION = FSRSVersion;
export const TS_FSRS_MAXIMUM_INTERVAL_DAYS = 36_500;

const TS_FSRS_STATE_KIND = "ts-fsrs-card";
const TS_FSRS_STATE_SCHEMA_VERSION = 1;

const scheduler = fsrs({
  request_retention: DEFAULT_DESIRED_RETENTION,
  maximum_interval: TS_FSRS_MAXIMUM_INTERVAL_DAYS,
  enable_fuzz: false,
});

const TS_FSRS_RATINGS = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
} satisfies Readonly<Record<FsrsRating, Grade>>;

interface SerializedTsFsrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: string;
}

interface SerializedTsFsrsState {
  kind: typeof TS_FSRS_STATE_KIND;
  schemaVersion: typeof TS_FSRS_STATE_SCHEMA_VERSION;
  card: SerializedTsFsrsCard;
}

export interface TsFsrsAdapter extends FsrsAdapter {
  readonly maximumIntervalDays: number;
}

export function createTsFsrsAdapter(cardId: string): TsFsrsAdapter {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new Error("cardId is required");
  }

  return {
    version: TS_FSRS_VERSION,
    desiredRetention: DEFAULT_DESIRED_RETENTION,
    maximumIntervalDays: TS_FSRS_MAXIMUM_INTERVAL_DAYS,
    review(previous, input) {
      return reviewWithTsFsrs(normalizedCardId, previous, input);
    },
  };
}

export function resolveTsFsrsAdapter(
  version: string,
  cardId: string,
): TsFsrsAdapter {
  if (version !== TS_FSRS_VERSION) {
    throw new Error(
      `FSRS adapter version mismatch: expected ${TS_FSRS_VERSION}, received ${version}`,
    );
  }
  return createTsFsrsAdapter(cardId);
}

function reviewWithTsFsrs(
  cardId: string,
  previous: MemoryState | null,
  input: FsrsReviewInput,
): MemoryState {
  const reviewedAt = parseDateTime(input.reviewedAt, "reviewedAt");
  const card = previous
    ? restorePreviousCard(cardId, previous, reviewedAt)
    : createEmptyCard(reviewedAt);

  const result = scheduler.next(
    card,
    reviewedAt,
    TS_FSRS_RATINGS[input.rating],
  );
  const scheduledCard = enforceMaximumInterval(result.card, reviewedAt);
  const fsrsState = serializeFsrsState(scheduledCard);

  return {
    cardId,
    dueAt: fsrsState.card.due,
    stability: fsrsState.card.stability,
    difficulty: fsrsState.card.difficulty,
    fsrsVersion: TS_FSRS_VERSION,
    fsrsState,
  };
}

function enforceMaximumInterval(card: Card, reviewedAt: Date): Card {
  if (card.scheduled_days <= TS_FSRS_MAXIMUM_INTERVAL_DAYS) {
    return card;
  }

  return {
    ...card,
    scheduled_days: TS_FSRS_MAXIMUM_INTERVAL_DAYS,
    due: date_scheduler(reviewedAt, TS_FSRS_MAXIMUM_INTERVAL_DAYS, true),
  };
}

function restorePreviousCard(
  cardId: string,
  previous: MemoryState,
  reviewedAt: Date,
): Card {
  if (previous.cardId !== cardId) {
    throw new Error("FSRS card ID mismatch");
  }
  if (previous.fsrsVersion !== TS_FSRS_VERSION) {
    throw new Error("FSRS adapter version mismatch");
  }

  const dueAt = parseDateTime(previous.dueAt, "memory dueAt");
  const state = parseFsrsState(previous.fsrsState);
  const card = deserializeCard(state.card);

  if (card.due.getTime() !== dueAt.getTime()) {
    throw new Error("foreign FSRS state does not match memory dueAt");
  }
  if (
    previous.stability !== card.stability ||
    previous.difficulty !== card.difficulty
  ) {
    throw new Error("foreign FSRS state does not match memory metrics");
  }
  if (!card.last_review) {
    throw new Error("foreign FSRS state is missing last review date");
  }
  if (reviewedAt.getTime() < card.last_review.getTime()) {
    throw new Error("reviewedAt cannot be before the previous FSRS review");
  }

  return card;
}

function serializeFsrsState(card: Card): SerializedTsFsrsState {
  assertCardNumbers(card);
  if (!(card.due instanceof Date) || Number.isNaN(card.due.getTime())) {
    throw new Error("FSRS returned an invalid due date");
  }
  if (
    !(card.last_review instanceof Date) ||
    Number.isNaN(card.last_review.getTime())
  ) {
    throw new Error("FSRS returned an invalid last review date");
  }
  assertState(card.state);

  return {
    kind: TS_FSRS_STATE_KIND,
    schemaVersion: TS_FSRS_STATE_SCHEMA_VERSION,
    card: {
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days,
      learningSteps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      lastReview: card.last_review.toISOString(),
    },
  };
}

function parseFsrsState(value: unknown): SerializedTsFsrsState {
  if (!isRecord(value)) {
    throw new Error("invalid or foreign FSRS state");
  }
  if (
    value.kind !== TS_FSRS_STATE_KIND ||
    value.schemaVersion !== TS_FSRS_STATE_SCHEMA_VERSION ||
    !isRecord(value.card)
  ) {
    throw new Error("invalid or foreign FSRS state");
  }

  const card = value.card;
  return {
    kind: TS_FSRS_STATE_KIND,
    schemaVersion: TS_FSRS_STATE_SCHEMA_VERSION,
    card: {
      due: readString(card, "due"),
      stability: readFiniteNumber(card, "stability"),
      difficulty: readFiniteNumber(card, "difficulty"),
      elapsedDays: readNonNegativeInteger(card, "elapsedDays"),
      scheduledDays: readNonNegativeInteger(card, "scheduledDays"),
      learningSteps: readNonNegativeInteger(card, "learningSteps"),
      reps: readNonNegativeInteger(card, "reps"),
      lapses: readNonNegativeInteger(card, "lapses"),
      state: readState(card, "state"),
      lastReview: readString(card, "lastReview"),
    },
  };
}

function deserializeCard(card: SerializedTsFsrsCard): Card {
  const due = parseDateTime(card.due, "FSRS state due");
  const lastReview = parseDateTime(card.lastReview, "FSRS state lastReview");

  if (card.stability <= 0) {
    throw new Error("invalid or foreign FSRS state stability");
  }
  if (card.difficulty < 1 || card.difficulty > 10) {
    throw new Error("invalid or foreign FSRS state difficulty");
  }
  if (card.state === State.New) {
    throw new Error("invalid or foreign FSRS state cannot be New after review");
  }
  if (card.scheduledDays > TS_FSRS_MAXIMUM_INTERVAL_DAYS) {
    throw new Error("invalid or foreign FSRS state exceeds maximum interval");
  }

  return {
    due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: lastReview,
  };
}

function assertCardNumbers(card: Card): void {
  assertPositiveFinite(card.stability, "stability");
  if (
    !Number.isFinite(card.difficulty) ||
    card.difficulty < 1 ||
    card.difficulty > 10
  ) {
    throw new Error("FSRS returned an invalid difficulty");
  }
  assertNonNegativeInteger(card.elapsed_days, "elapsed_days");
  assertNonNegativeInteger(card.scheduled_days, "scheduled_days");
  assertNonNegativeInteger(card.learning_steps, "learning_steps");
  assertNonNegativeInteger(card.reps, "reps");
  assertNonNegativeInteger(card.lapses, "lapses");
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`FSRS returned an invalid ${name}`);
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`FSRS returned an invalid ${name}`);
  }
}

function assertState(value: number): asserts value is State {
  if (
    value !== State.New &&
    value !== State.Learning &&
    value !== State.Review &&
    value !== State.Relearning
  ) {
    throw new Error("FSRS returned an invalid card state");
  }
}

function parseDateTime(value: string, name: string): Date {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${name} must be a valid date-time`);
  }
  return new Date(timestamp);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`invalid or foreign FSRS state ${key}`);
  }
  return value;
}

function readFiniteNumber(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`invalid or foreign FSRS state ${key}`);
  }
  return value;
}

function readNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = readFiniteNumber(record, key);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`invalid or foreign FSRS state ${key}`);
  }
  return value;
}

function readState(record: Record<string, unknown>, key: string): State {
  const value = readNonNegativeInteger(record, key);
  assertState(value);
  return value;
}
