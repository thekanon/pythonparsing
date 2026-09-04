import type { OfficialDomainId } from "./content-schema";

export interface ConceptNode {
  id: string;
  domainId: OfficialDomainId;
  title: string;
  prerequisites: readonly string[];
}

export const SQL_CONCEPTS: readonly ConceptNode[] = [
  {
    id: "sql-table-row-column",
    domainId: "sql",
    title: "테이블·행·열",
    prerequisites: [],
  },
  {
    id: "sql-select",
    domainId: "sql",
    title: "SELECT와 FROM",
    prerequisites: ["sql-table-row-column"],
  },
  {
    id: "sql-where",
    domainId: "sql",
    title: "WHERE 조건",
    prerequisites: ["sql-select"],
  },
  {
    id: "sql-group",
    domainId: "sql",
    title: "집계와 GROUP BY",
    prerequisites: ["sql-where"],
  },
  {
    id: "sql-join",
    domainId: "sql",
    title: "JOIN",
    prerequisites: ["sql-select"],
  },
] as const;

export const C_CONCEPTS: readonly ConceptNode[] = [
  {
    id: "c-value-type",
    domainId: "programming-language",
    title: "값·변수·자료형",
    prerequisites: [],
  },
  {
    id: "c-operator",
    domainId: "programming-language",
    title: "연산자",
    prerequisites: ["c-value-type"],
  },
  {
    id: "c-control-flow",
    domainId: "programming-language",
    title: "조건문과 반복문",
    prerequisites: ["c-operator"],
  },
  {
    id: "c-array",
    domainId: "programming-language",
    title: "배열",
    prerequisites: ["c-control-flow"],
  },
  {
    id: "c-pointer",
    domainId: "programming-language",
    title: "포인터",
    prerequisites: ["c-array"],
  },
] as const;

export function validateConceptGraph(nodes: readonly ConceptNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) errors.push("concept ids must be unique");

  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      if (!ids.has(prerequisite)) {
        errors.push(`${node.id}: unknown prerequisite ${prerequisite}`);
      }
      if (prerequisite === node.id) {
        errors.push(`${node.id}: cannot depend on itself`);
      }
    }
  }

  return [...new Set(errors)];
}

export const FSRS_RATINGS = ["Again", "Hard", "Good", "Easy"] as const;
export const SQL_ERROR_KINDS = [
  "syntax",
  "scope",
  "condition",
  "join",
  "aggregate",
  "forbidden",
] as const;
export type SqlErrorKind = (typeof SQL_ERROR_KINDS)[number];

export type FsrsRating = (typeof FSRS_RATINGS)[number];

export interface LearningEvent {
  eventId: string;
  occurredAt: string;
  learnerId: string;
  contentId: string;
  contentVersion: number;
  cardId: string;
  correct: boolean;
  rating: FsrsRating;
  responseTimeMs: number;
  helpLevel: 0 | 1 | 2 | 3 | 4;
  mode: "understanding" | "recall" | "application" | "assessment";
  firstSubmission: boolean;
  fsrsVersion: string;
  errorKinds?: readonly SqlErrorKind[];
}

export const DEFAULT_DESIRED_RETENTION = 0.9;

export interface MemoryState {
  cardId: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  fsrsVersion: string;
  fsrsState?: unknown;
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

export function validateLearningEvent(event: LearningEvent): string[] {
  const errors: string[] = [];
  if (!event.eventId.trim()) errors.push("eventId is required");
  if (!event.learnerId.trim()) errors.push("learnerId is required");
  if (!event.contentId.trim()) errors.push("contentId is required");
  if (!event.cardId.trim()) errors.push("cardId is required");
  if (!event.fsrsVersion.trim()) errors.push("fsrsVersion is required");
  if (!Number.isInteger(event.contentVersion) || event.contentVersion < 1) {
    errors.push("contentVersion must be a positive integer");
  }
  if (Number.isNaN(Date.parse(event.occurredAt))) {
    errors.push("occurredAt must be a valid date-time");
  }
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
  if (event.errorKinds !== undefined) {
    if (
      !Array.isArray(event.errorKinds) ||
      event.errorKinds.some(
        (errorKind) =>
          !SQL_ERROR_KINDS.some((allowed) => allowed === errorKind),
      )
    ) {
      errors.push("errorKinds must contain known SQL error kind strings");
    } else if (new Set(event.errorKinds).size !== event.errorKinds.length) {
      errors.push("errorKinds must be unique");
    }
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
  if (event.mode === "assessment") {
    throw new Error("assessment events cannot update memory scheduling");
  }
  const errors = validateLearningEvent(event);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return { reviewedAt: event.occurredAt, rating: event.rating };
}
