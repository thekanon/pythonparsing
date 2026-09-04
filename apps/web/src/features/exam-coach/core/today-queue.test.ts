import { describe, expect, it } from "vitest";

import type { MemoryState } from "./learning-engine";
import {
  buildTodayQueue,
  type ApplicationQueueCandidate,
  type NewQueueCandidate,
  type ReviewQueueCandidate,
} from "./today-queue";

describe("exam coach today queue", () => {
  it("schedules due reviews before unlocked new learning", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 15,
      reviewCandidates: [
        reviewCandidate("review-due", {
          dueAt: "2026-09-02T02:00:00.000Z",
          estimatedMinutes: 5,
        }),
        reviewCandidate("review-future", {
          dueAt: "2026-09-03T02:00:00.000Z",
          estimatedMinutes: 5,
        }),
      ],
      newCandidates: [newCandidate("new-card", "sql-where", ["sql-select"])],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.kind)).toEqual(["review", "new"]);
    expect(queue.items.map((item) => item.cardId)).toEqual([
      "review-due",
      "new-card",
    ]);
    expect(queue.dueReviewCount).toBe(1);
  });

  it("orders due reviews by memory risk, overdue time, then importance", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 20,
      reviewCandidates: [
        reviewCandidate("importance-low", {
          memoryRisk: 0.5,
          dueAt: "2026-09-02T01:00:00.000Z",
          importance: 2,
        }),
        reviewCandidate("highest-risk", {
          memoryRisk: 0.9,
          dueAt: "2026-09-02T02:00:00.000Z",
        }),
        reviewCandidate("older-due", {
          memoryRisk: 0.5,
          dueAt: "2026-09-01T23:00:00.000Z",
        }),
        reviewCandidate("importance-high", {
          memoryRisk: 0.5,
          dueAt: "2026-09-02T01:00:00.000Z",
          importance: 5,
        }),
      ],
      newCandidates: [],
      masteredConceptIds: [],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual([
      "highest-risk",
      "older-due",
      "importance-high",
      "importance-low",
    ]);
  });

  it("does not add new cards while any due review is deferred", () => {
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
      newCandidates: [
        newCandidate("new-card", "sql-where", ["sql-select"], {
          estimatedMinutes: 2,
        }),
      ],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual(["short-review"]);
    expect(queue.remainingMinutes).toBe(2);
    expect(queue.dueReviewCount).toBe(2);
    expect(queue.deferredDueReviewCount).toBe(1);
  });

  it("unlocks new learning only when every prerequisite is mastered", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 20,
      reviewCandidates: [],
      newCandidates: [
        newCandidate("select-card", "sql-select", ["sql-table-row-column"], {
          curriculumOrder: 2,
        }),
        newCandidate("where-card", "sql-where", ["sql-select"], {
          curriculumOrder: 3,
        }),
        newCandidate("join-card", "sql-join", ["sql-select", "sql-where"], {
          curriculumOrder: 4,
        }),
      ],
      masteredConceptIds: ["sql-table-row-column", "sql-select"],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual(["where-card"]);
  });

  it("orders unlocked new cards by curriculum order before importance", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 20,
      reviewCandidates: [],
      newCandidates: [
        newCandidate("later-important", "c-array", [], {
          curriculumOrder: 2,
          importance: 5,
        }),
        newCandidate("first-normal", "c-control-flow", [], {
          curriculumOrder: 1,
          importance: 3,
        }),
      ],
      masteredConceptIds: [],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual([
      "first-normal",
      "later-important",
    ]);
  });

  it.each([
    [15, ["review"]],
    [45, ["review", "new", "application"]],
    [60, ["review", "new", "application"]],
  ] as const)("keeps the %i minute regression budget", (budget, expectedKinds) => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: budget,
      reviewCandidates: [
        reviewCandidate("due-review", { estimatedMinutes: 10 }),
      ],
      newCandidates: [
        newCandidate("new-card", "sql-where", ["sql-select"], {
          estimatedMinutes: 15,
        }),
      ],
      applicationCandidates: [
        applicationCandidate("apply-card", "sql-where", ["sql-select"], {
          estimatedMinutes: 20,
        }),
      ],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.kind)).toEqual(expectedKinds);
    expect(queue.usedMinutes).toBeLessThanOrEqual(budget);
    expect(queue.remainingMinutes).toBe(budget - queue.usedMinutes);
  });

  it("allows new learning after due review debt is completed", () => {
    const blocked = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 15,
      reviewCandidates: [
        reviewCandidate("too-long-review", { estimatedMinutes: 20 }),
      ],
      newCandidates: [newCandidate("new-card", "sql-where", ["sql-select"])],
      masteredConceptIds: ["sql-select"],
    });
    const afterReviewCompletion = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 15,
      reviewCandidates: [],
      newCandidates: [newCandidate("new-card", "sql-where", ["sql-select"])],
      masteredConceptIds: ["sql-select"],
    });

    expect(blocked.items).toEqual([]);
    expect(blocked.deferredDueReviewCount).toBe(1);
    expect(afterReviewCompletion.items.map((item) => item.kind)).toEqual(["new"]);
  });

  it("schedules application only after new learning when time remains", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 20,
      reviewCandidates: [],
      newCandidates: [
        newCandidate("new-card", "sql-where", ["sql-select"], {
          estimatedMinutes: 5,
        }),
      ],
      applicationCandidates: [
        applicationCandidate("apply-card", "sql-where", ["sql-select"], {
          estimatedMinutes: 10,
        }),
      ],
      masteredConceptIds: ["sql-select"],
    });

    expect(queue.items.map((item) => item.kind)).toEqual(["new", "application"]);
    expect(queue.usedMinutes).toBe(15);
  });

  it("never exceeds the time budget", () => {
    const queue = buildTodayQueue({
      now: "2026-09-02T03:00:00.000Z",
      timeBudgetMinutes: 7,
      reviewCandidates: [],
      newCandidates: [
        newCandidate("first", "c-control-flow", [], {
          curriculumOrder: 1,
          estimatedMinutes: 5,
        }),
        newCandidate("second", "c-array", [], {
          curriculumOrder: 2,
          estimatedMinutes: 5,
        }),
      ],
      masteredConceptIds: [],
    });

    expect(queue.items.map((item) => item.cardId)).toEqual(["first"]);
    expect(queue.usedMinutes).toBe(5);
    expect(queue.remainingMinutes).toBe(2);
  });

  it("rejects invalid review risk and mismatched memory card ids", () => {
    expect(() =>
      buildTodayQueue({
        now: "2026-09-02T03:00:00.000Z",
        timeBudgetMinutes: 10,
        reviewCandidates: [reviewCandidate("bad-risk", { memoryRisk: 1.1 })],
        newCandidates: [],
        masteredConceptIds: [],
      }),
    ).toThrow(/memoryRisk/);

    const mismatch = reviewCandidate("candidate-card");
    mismatch.memory = { ...mismatch.memory, cardId: "different-card" };

    expect(() =>
      buildTodayQueue({
        now: "2026-09-02T03:00:00.000Z",
        timeBudgetMinutes: 10,
        reviewCandidates: [mismatch],
        newCandidates: [],
        masteredConceptIds: [],
      }),
    ).toThrow(/must match memory cardId/);
  });
});

function reviewCandidate(
  cardId: string,
  overrides: Partial<ReviewQueueCandidate> & { dueAt?: string } = {},
): ReviewQueueCandidate {
  const { dueAt, ...candidateOverrides } = overrides;
  const defaultMemory: MemoryState = {
    cardId,
    dueAt: dueAt ?? "2026-09-02T01:00:00.000Z",
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
    ...candidateOverrides,
    memory: candidateOverrides.memory ?? defaultMemory,
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

function newCandidate(
  cardId: string,
  conceptId: string,
  prerequisites: readonly string[],
  overrides: Partial<NewQueueCandidate> = {},
): NewQueueCandidate {
  return {
    cardId,
    conceptId,
    prerequisites,
    estimatedMinutes: 5,
    importance: 3,
    curriculumOrder: 1,
    ...overrides,
  };
}
