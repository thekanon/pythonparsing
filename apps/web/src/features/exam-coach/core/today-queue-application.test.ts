import { describe, expect, it } from "vitest";

import type { MemoryState } from "./learning-engine";
import {
  buildTodayQueue,
  type ApplicationQueueCandidate,
  type NewQueueCandidate,
  type ReviewQueueCandidate,
} from "./today-queue";

describe("exam coach today queue application activities", () => {
  it("schedules applications after reviews and new learning", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 20,
      reviewCandidates: [reviewCandidate("review-due")],
      newCandidates: [newCandidate("new-card", "sql-where", ["sql-select"])],
      applicationCandidates: [
        applicationCandidate("apply-card", "sql-select", ["sql-select"]),
      ],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.kind)).toEqual([
      "review",
      "new",
      "application",
    ]);
    expect(queue.items.map((item) => item.cardId)).toEqual([
      "review-due",
      "new-card",
      "apply-card",
    ]);
  });

  it("suppresses applications while due reviews are deferred", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 5,
      reviewCandidates: [
        reviewCandidate("short-review", {
          estimatedMinutes: 3,
          memoryRisk: 0.9,
        }),
        reviewCandidate("long-review", {
          estimatedMinutes: 4,
          memoryRisk: 0.8,
        }),
      ],
      newCandidates: [],
      applicationCandidates: [
        applicationCandidate("apply-card", "sql-select", ["sql-select"], {
          estimatedMinutes: 2,
        }),
      ],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual(["short-review"]);
    expect(queue.deferredDueReviewCount).toBe(1);
  });

  it("requires every application prerequisite to be mastered", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 20,
      reviewCandidates: [],
      newCandidates: [],
      applicationCandidates: [
        applicationCandidate("sql-apply", "sql-where", ["sql-select"]),
        applicationCandidate("c-apply", "c-array", ["c-control-flow"]),
      ],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual(["sql-apply"]);
    expect(queue.items[0]?.kind).toBe("application");
  });
});

function reviewCandidate(
  cardId: string,
  overrides: Partial<ReviewQueueCandidate> = {},
): ReviewQueueCandidate {
  const memory: MemoryState = {
    cardId,
    dueAt: "2026-09-02T01:00:00.000Z",
    stability: 2,
    difficulty: 5,
    fsrsVersion: "fake-v1",
  };
  return {
    cardId,
    conceptId: `${cardId}-concept`,
    estimatedMinutes: 3,
    importance: 3,
    memoryRisk: 0.5,
    memory,
    ...overrides,
  };
}

function newCandidate(
  cardId: string,
  conceptId: string,
  prerequisites: readonly string[],
): NewQueueCandidate {
  return {
    cardId,
    conceptId,
    prerequisites,
    estimatedMinutes: 5,
    importance: 3,
    curriculumOrder: 1,
  };
}

function applicationCandidate(
  activityId: string,
  conceptId: string,
  prerequisites: readonly string[],
  overrides: Partial<ApplicationQueueCandidate> = {},
): ApplicationQueueCandidate {
  return {
    activityId,
    conceptId,
    prerequisites,
    estimatedMinutes: 5,
    importance: 3,
    curriculumOrder: 1,
    ...overrides,
  };
}
