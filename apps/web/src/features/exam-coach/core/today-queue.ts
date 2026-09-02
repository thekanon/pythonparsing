import type { MemoryState } from "./learning-engine";

export interface ReviewQueueCandidate {
  cardId: string;
  conceptId: string;
  estimatedMinutes: number;
  importance: 1 | 2 | 3 | 4 | 5;
  memoryRisk: number;
  memory: MemoryState;
}

export interface NewQueueCandidate {
  cardId: string;
  conceptId: string;
  prerequisites: readonly string[];
  estimatedMinutes: number;
  importance: 1 | 2 | 3 | 4 | 5;
  curriculumOrder: number;
}

export interface ApplicationQueueCandidate {
  activityId: string;
  conceptId: string;
  prerequisites: readonly string[];
  estimatedMinutes: number;
  importance: 1 | 2 | 3 | 4 | 5;
  curriculumOrder: number;
}

export interface TodayQueueInput {
  now: string;
  timeBudgetMinutes: number;
  reviewCandidates: readonly ReviewQueueCandidate[];
  newCandidates: readonly NewQueueCandidate[];
  applicationCandidates?: readonly ApplicationQueueCandidate[];
  masteredConceptIds: readonly string[];
}

export interface TodayQueueItem {
  kind: "review" | "new" | "application";
  cardId: string;
  conceptId: string;
  estimatedMinutes: number;
}

export interface TodayQueue {
  items: readonly TodayQueueItem[];
  usedMinutes: number;
  remainingMinutes: number;
  dueReviewCount: number;
  deferredDueReviewCount: number;
}

export function buildTodayQueue(input: TodayQueueInput): TodayQueue {
  const now = parseDateTime(input.now, "now");
  assertPositiveInteger(input.timeBudgetMinutes, "timeBudgetMinutes");

  const mastered = new Set(input.masteredConceptIds.map(normalizeId));
  const dueReviews = input.reviewCandidates
    .map(validateReviewCandidate)
    .filter((candidate) => Date.parse(candidate.memory.dueAt) <= now)
    .sort(compareReviewCandidates);

  const unlockedNew = input.newCandidates
    .map(validateNewCandidate)
    .filter(
      (candidate) =>
        !mastered.has(candidate.conceptId) &&
        candidate.prerequisites.every((conceptId) => mastered.has(conceptId)),
    )
    .sort(compareNewCandidates);

  const unlockedApplications = (input.applicationCandidates ?? [])
    .map(validateApplicationCandidate)
    .filter((candidate) =>
      candidate.prerequisites.every((conceptId) => mastered.has(conceptId)),
    )
    .sort(compareApplicationCandidates);

  const items: TodayQueueItem[] = [];
  let remainingMinutes = input.timeBudgetMinutes;
  let scheduledDueReviews = 0;

  for (const candidate of dueReviews) {
    if (candidate.estimatedMinutes > remainingMinutes) continue;
    items.push({
      kind: "review",
      cardId: candidate.cardId,
      conceptId: candidate.conceptId,
      estimatedMinutes: candidate.estimatedMinutes,
    });
    remainingMinutes -= candidate.estimatedMinutes;
    scheduledDueReviews += 1;
  }

  if (scheduledDueReviews === dueReviews.length) {
    for (const candidate of unlockedNew) {
      if (candidate.estimatedMinutes > remainingMinutes) continue;
      items.push({
        kind: "new",
        cardId: candidate.cardId,
        conceptId: candidate.conceptId,
        estimatedMinutes: candidate.estimatedMinutes,
      });
      remainingMinutes -= candidate.estimatedMinutes;
    }

    for (const candidate of unlockedApplications) {
      if (candidate.estimatedMinutes > remainingMinutes) continue;
      items.push({
        kind: "application",
        cardId: candidate.activityId,
        conceptId: candidate.conceptId,
        estimatedMinutes: candidate.estimatedMinutes,
      });
      remainingMinutes -= candidate.estimatedMinutes;
    }
  }

  return {
    items,
    usedMinutes: input.timeBudgetMinutes - remainingMinutes,
    remainingMinutes,
    dueReviewCount: dueReviews.length,
    deferredDueReviewCount: dueReviews.length - scheduledDueReviews,
  };
}

function compareReviewCandidates(
  left: ReviewQueueCandidate,
  right: ReviewQueueCandidate,
): number {
  const riskDifference = right.memoryRisk - left.memoryRisk;
  if (riskDifference !== 0) return riskDifference;

  const dueDifference =
    Date.parse(left.memory.dueAt) - Date.parse(right.memory.dueAt);
  if (dueDifference !== 0) return dueDifference;

  const importanceDifference = right.importance - left.importance;
  if (importanceDifference !== 0) return importanceDifference;
  return left.cardId.localeCompare(right.cardId);
}

function compareNewCandidates(
  left: NewQueueCandidate,
  right: NewQueueCandidate,
): number {
  const orderDifference = left.curriculumOrder - right.curriculumOrder;
  if (orderDifference !== 0) return orderDifference;

  const importanceDifference = right.importance - left.importance;
  if (importanceDifference !== 0) return importanceDifference;
  return left.cardId.localeCompare(right.cardId);
}

function compareApplicationCandidates(
  left: ApplicationQueueCandidate,
  right: ApplicationQueueCandidate,
): number {
  const orderDifference = left.curriculumOrder - right.curriculumOrder;
  if (orderDifference !== 0) return orderDifference;

  const importanceDifference = right.importance - left.importance;
  if (importanceDifference !== 0) return importanceDifference;
  return left.activityId.localeCompare(right.activityId);
}

function validateReviewCandidate(
  candidate: ReviewQueueCandidate,
): ReviewQueueCandidate {
  const cardId = normalizeId(candidate.cardId);
  const conceptId = normalizeId(candidate.conceptId);
  assertPositiveInteger(candidate.estimatedMinutes, "estimatedMinutes");
  assertImportance(candidate.importance);
  if (
    !Number.isFinite(candidate.memoryRisk) ||
    candidate.memoryRisk < 0 ||
    candidate.memoryRisk > 1
  ) {
    throw new Error("memoryRisk must be between 0 and 1");
  }
  if (candidate.memory.cardId !== cardId) {
    throw new Error("review candidate cardId must match memory cardId");
  }
  parseDateTime(candidate.memory.dueAt, "memory.dueAt");
  return { ...candidate, cardId, conceptId };
}

function validateNewCandidate(candidate: NewQueueCandidate): NewQueueCandidate {
  const cardId = normalizeId(candidate.cardId);
  const conceptId = normalizeId(candidate.conceptId);
  assertPositiveInteger(candidate.estimatedMinutes, "estimatedMinutes");
  assertPositiveInteger(candidate.curriculumOrder, "curriculumOrder");
  assertImportance(candidate.importance);
  return {
    ...candidate,
    cardId,
    conceptId,
    prerequisites: candidate.prerequisites.map(normalizeId),
  };
}

function validateApplicationCandidate(
  candidate: ApplicationQueueCandidate,
): ApplicationQueueCandidate {
  const activityId = normalizeId(candidate.activityId);
  const conceptId = normalizeId(candidate.conceptId);
  assertPositiveInteger(candidate.estimatedMinutes, "estimatedMinutes");
  assertPositiveInteger(candidate.curriculumOrder, "curriculumOrder");
  assertImportance(candidate.importance);
  return {
    ...candidate,
    activityId,
    conceptId,
    prerequisites: candidate.prerequisites.map(normalizeId),
  };
}

function normalizeId(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("id must be non-empty");
  return normalized;
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
}

function assertImportance(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("importance must be between 1 and 5");
  }
}

function parseDateTime(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${field} must be a valid date-time`);
  }
  return timestamp;
}
