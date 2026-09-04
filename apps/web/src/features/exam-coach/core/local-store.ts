import {
  FSRS_RATINGS,
  SQL_ERROR_KINDS,
  appendLearningEvent,
  type LearningEvent,
  type SqlErrorKind,
  validateLearningEvent,
} from "./learning-engine";

export const EXAM_COACH_STORAGE_KEYS = {
  guestId: "exam-coach:v1:guest-id",
  learningEvents: "exam-coach:v1:learning-events",
} as const;

const LEARNING_MODES = [
  "understanding",
  "recall",
  "application",
  "assessment",
] as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedLearningEvents {
  schemaVersion: 1;
  learnerId: string;
  events: readonly LearningEvent[];
}

export function getOrCreateGuestId(
  storage: StorageLike,
  createId: () => string = defaultGuestIdFactory,
): string {
  const existing = storage.getItem(EXAM_COACH_STORAGE_KEYS.guestId)?.trim();
  if (existing) return existing;

  const generated = createId().trim();
  if (!generated) {
    throw new Error("guest id factory returned an empty id");
  }

  const guestId = generated.startsWith("guest-")
    ? generated
    : `guest-${generated}`;
  storage.setItem(EXAM_COACH_STORAGE_KEYS.guestId, guestId);
  return guestId;
}

export function loadLocalLearningEvents(
  storage: StorageLike,
  learnerId: string,
): readonly LearningEvent[] {
  const normalizedLearnerId = learnerId.trim();
  if (!normalizedLearnerId) {
    throw new Error("learnerId is required");
  }

  const raw = storage.getItem(EXAM_COACH_STORAGE_KEYS.learningEvents);
  if (!raw) return [];

  const envelope = parseEnvelope(raw);
  if (envelope.learnerId !== normalizedLearnerId) {
    throw new Error("stored learning events belong to a different learner");
  }

  return replayPersistedEvents(envelope.events, normalizedLearnerId);
}

export function appendLocalLearningEvent(
  storage: StorageLike,
  learnerId: string,
  incoming: LearningEvent,
): readonly LearningEvent[] {
  const normalizedLearnerId = learnerId.trim();
  if (!normalizedLearnerId) {
    throw new Error("learnerId is required");
  }
  if (incoming.learnerId !== normalizedLearnerId) {
    throw new Error("incoming event learnerId does not match guest learner");
  }

  const existing = loadLocalLearningEvents(storage, normalizedLearnerId);
  const duplicate = existing.find(
    (event) => event.eventId === incoming.eventId,
  );
  if (duplicate && !sameLearningEvent(duplicate, incoming)) {
    throw new Error("duplicate eventId has conflicting payload");
  }

  const appended = appendLearningEvent(existing, incoming);
  if (appended === existing) return existing;

  const canonical = replayPersistedEvents(appended, normalizedLearnerId);
  persistEvents(storage, normalizedLearnerId, canonical);
  return canonical;
}

export function resetGuestLearningData(storage: StorageLike): void {
  storage.removeItem(EXAM_COACH_STORAGE_KEYS.learningEvents);
  storage.removeItem(EXAM_COACH_STORAGE_KEYS.guestId);
}

function persistEvents(
  storage: StorageLike,
  learnerId: string,
  events: readonly LearningEvent[],
): void {
  const envelope: PersistedLearningEvents = {
    schemaVersion: 1,
    learnerId,
    events,
  };

  storage.setItem(
    EXAM_COACH_STORAGE_KEYS.learningEvents,
    JSON.stringify(envelope),
  );
}

function parseEnvelope(raw: string): PersistedLearningEvents {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("stored learning events are not valid JSON");
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    throw new Error("stored learning events use an unsupported schema");
  }
  if (typeof parsed.learnerId !== "string" || !parsed.learnerId.trim()) {
    throw new Error("stored learning events are missing learnerId");
  }
  if (!Array.isArray(parsed.events)) {
    throw new Error("stored learning events must contain an events array");
  }

  return {
    schemaVersion: 1,
    learnerId: parsed.learnerId,
    events: parsed.events.map(parseLearningEvent),
  };
}

function parseLearningEvent(value: unknown): LearningEvent {
  if (!isRecord(value)) {
    throw new Error("stored learning event must be an object");
  }

  const event: LearningEvent = {
    eventId: requireString(value.eventId, "eventId"),
    occurredAt: requireString(value.occurredAt, "occurredAt"),
    learnerId: requireString(value.learnerId, "learnerId"),
    contentId: requireString(value.contentId, "contentId"),
    contentVersion: requireNumber(value.contentVersion, "contentVersion"),
    cardId: requireString(value.cardId, "cardId"),
    correct: requireBoolean(value.correct, "correct"),
    rating: parseRating(value.rating),
    responseTimeMs: requireNumber(value.responseTimeMs, "responseTimeMs"),
    helpLevel: parseHelpLevel(value.helpLevel),
    mode: parseLearningMode(value.mode),
    firstSubmission: requireBoolean(value.firstSubmission, "firstSubmission"),
    fsrsVersion: requireString(value.fsrsVersion, "fsrsVersion"),
    ...(value.errorKinds === undefined
      ? {}
      : { errorKinds: parseErrorKinds(value.errorKinds) }),
  };

  const errors = validateLearningEvent(event);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  return event;
}

function replayPersistedEvents(
  events: readonly LearningEvent[],
  learnerId: string,
): readonly LearningEvent[] {
  const byId = new Map<string, LearningEvent>();

  for (const event of events) {
    if (event.learnerId !== learnerId) {
      throw new Error("stored event learnerId does not match guest learner");
    }

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
    JSON.stringify(canonicalLearningEvent(left)) ===
    JSON.stringify(canonicalLearningEvent(right))
  );
}

function canonicalLearningEvent(event: LearningEvent): Record<string, unknown> {
  return {
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    learnerId: event.learnerId,
    contentId: event.contentId,
    contentVersion: event.contentVersion,
    cardId: event.cardId,
    correct: event.correct,
    rating: event.rating,
    responseTimeMs: event.responseTimeMs,
    helpLevel: event.helpLevel,
    mode: event.mode,
    firstSubmission: event.firstSubmission,
    fsrsVersion: event.fsrsVersion,
    errorKinds: event.errorKinds ?? [],
  };
}

function parseRating(value: unknown): LearningEvent["rating"] {
  if (
    typeof value === "string" &&
    FSRS_RATINGS.some((rating) => rating === value)
  ) {
    return value as LearningEvent["rating"];
  }
  return invalidField("rating");
}

function parseLearningMode(value: unknown): LearningEvent["mode"] {
  if (
    typeof value === "string" &&
    LEARNING_MODES.some((mode) => mode === value)
  ) {
    return value as LearningEvent["mode"];
  }
  return invalidField("mode");
}

function parseErrorKinds(value: unknown): readonly SqlErrorKind[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (errorKind) =>
        typeof errorKind !== "string" ||
        !SQL_ERROR_KINDS.some((allowed) => allowed === errorKind),
    )
  ) {
    return invalidField("errorKinds");
  }
  return value as SqlErrorKind[];
}

function parseHelpLevel(value: unknown): LearningEvent["helpLevel"] {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 4
  ) {
    return value as LearningEvent["helpLevel"];
  }
  return invalidField("helpLevel");
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") return invalidField(field);
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalidField(field);
  }
  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") return invalidField(field);
  return value;
}

function invalidField(field: string): never {
  throw new Error(`stored learning event has invalid ${field}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultGuestIdFactory(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is required to create a guest id");
  }
  return globalThis.crypto.randomUUID();
}
