import {
  OFFICIAL_DOMAIN_IDS,
  type ContentItem,
  type FsrsRating,
  type LearningEvent,
} from "./types";

const DOMAIN_IDS = new Set<string>(OFFICIAL_DOMAIN_IDS);

export const DEFAULT_DESIRED_RETENTION = 0.9;

export interface MemoryState {
  cardId: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  fsrsVersion: string;
}

export interface FsrsReviewInput {
  reviewedAt: string;
  rating: FsrsRating;
}

export interface FsrsAdapter {
  readonly version: string;
  readonly desiredRetention: number;
  review(previous: MemoryState | null, input: FsrsReviewInput): MemoryState;
}

export function validateContentItem(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["content must be an object"];

  for (const key of [
    "id",
    "domainId",
    "objective",
    "knowledgeType",
    "prompt",
    "answer",
    "explanation",
    "author",
    "reviewStatus",
    "changeReason",
    "memoryInheritance",
  ]) {
    const field = value[key];
    if (typeof field !== "string" || field.trim() === "") {
      errors.push(`${key} must be a non-empty string`);
    }
  }

  for (const key of [
    "schemaVersion",
    "version",
    "officialYear",
    "difficulty",
    "estimatedMinutes",
  ]) {
    const field = value[key];
    if (typeof field !== "number" || !Number.isFinite(field)) {
      errors.push(`${key} must be a number`);
    }
  }

  for (const key of ["conceptIds", "prerequisites"]) {
    const items = value[key];
    if (
      !Array.isArray(items) ||
      items.some((item) => typeof item !== "string" || item.trim() === "")
    ) {
      errors.push(`${key} must be a string array`);
    }
  }

  if (value.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (typeof value.domainId === "string" && !DOMAIN_IDS.has(value.domainId)) {
    errors.push("domainId must be an official domain id");
  }
  if (
    typeof value.version === "number" &&
    (!Number.isInteger(value.version) || value.version < 1)
  ) {
    errors.push("version must be a positive integer");
  }
  if (
    typeof value.difficulty === "number" &&
    (!Number.isInteger(value.difficulty) ||
      value.difficulty < 1 ||
      value.difficulty > 5)
  ) {
    errors.push("difficulty must be between 1 and 5");
  }
  if (
    value.reviewStatus === "reviewed" &&
    (typeof value.reviewer !== "string" || value.reviewer.trim() === "")
  ) {
    errors.push("reviewed content requires reviewer");
  }

  if (!isRecord(value.grading)) {
    errors.push("grading must be an object");
  }

  if (!isRecord(value.rights)) {
    errors.push("rights must be an object");
  } else {
    for (const key of ["source", "license", "notes"]) {
      const field = value.rights[key];
      if (typeof field !== "string" || field.trim() === "") {
        errors.push(`rights.${key} must be a non-empty string`);
      }
    }
  }

  return errors;
}

export function assertContentItem(
  value: unknown,
): asserts value is ContentItem {
  const errors = validateContentItem(value);
  if (errors.length > 0) throw new Error(errors.join("; "));
}

export function validateLearningEvent(event: LearningEvent): string[] {
  const errors: string[] = [];

  if (!event.eventId.trim()) errors.push("eventId is required");
  if (!event.correct && event.rating !== "Again") {
    errors.push("incorrect answers must be rated Again");
  }
  if (event.helpLevel > 0 && event.rating !== "Again") {
    errors.push("helped answers must be rated Again");
  }
  if (event.correct && event.helpLevel === 0 && event.rating === "Again") {
    errors.push("independent correct answers require Hard, Good, or Easy");
  }
  if (event.responseTimeMs < 0) {
    errors.push("responseTimeMs must be non-negative");
  }

  return errors;
}

export function appendLearningEvent(
  events: readonly LearningEvent[],
  incoming: LearningEvent,
): readonly LearningEvent[] {
  const errors = validateLearningEvent(incoming);
  if (errors.length > 0) throw new Error(errors.join("; "));
  if (events.some((event) => event.eventId === incoming.eventId)) return events;
  return [...events, incoming];
}

export function toFsrsReviewInput(event: LearningEvent): FsrsReviewInput {
  if (!event.firstSubmission) {
    throw new Error("only the first submission can update memory scheduling");
  }
  if (!event.correct && event.rating !== "Again") {
    throw new Error("incorrect answers must schedule as Again");
  }
  if (event.helpLevel > 0 && event.rating !== "Again") {
    throw new Error("helped answers must schedule as Again");
  }

  return { reviewedAt: event.occurredAt, rating: event.rating };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
