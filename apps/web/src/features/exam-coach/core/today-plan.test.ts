import { describe, expect, it } from "vitest";

import { LEARNING_CONTENT_CATALOG } from "./content-catalog";
import type { ContentItem } from "./content-schema";
import type {
  FsrsAdapter,
  LearningEvent,
  MemoryState,
} from "./learning-engine";
import {
  buildActualTodayPlan,
  deriveMasteredConceptIds,
} from "./today-plan";

const sqlSample = LEARNING_CONTENT_CATALOG["sql-select-basics"];
const prerequisiteSample = makePrerequisiteSample(sqlSample);
const testContent = [prerequisiteSample, sqlSample] as const;

describe("exam coach actual today plan", () => {
  it("derives mastery only from independent correct current regular-learning evidence", () => {
    const mastered = deriveMasteredConceptIds(
      [
        learningEvent(prerequisiteSample, {
          eventId: "mastered",
          correct: true,
          rating: "Good",
        }),
        learningEvent(sqlSample, {
          eventId: "assessment",
          mode: "assessment",
          correct: true,
          rating: "Good",
        }),
        learningEvent(sqlSample, {
          eventId: "helped",
          correct: false,
          rating: "Again",
          helpLevel: 1,
        }),
        learningEvent(sqlSample, {
          eventId: "stale",
          correct: true,
          rating: "Good",
          contentVersion: sqlSample.version + 1,
        }),
      ],
      testContent,
    );

    expect(mastered).toEqual(["sql-table-row-column"]);
  });

  it("rebuilds due memory from events, schedules review first, then unlocked unstudied reviewed content", () => {
    const plan = buildActualTodayPlan({
      events: [
        learningEvent(prerequisiteSample, {
          eventId: "review-root",
          occurredAt: "2026-09-01T00:00:00.000Z",
          correct: true,
          rating: "Good",
        }),
      ],
      now: "2026-09-04T00:00:00.000Z",
      dailyMinutes: 15,
      content: testContent,
      resolveAdapter: fakeResolver,
    });

    expect(plan.masteredConceptIds).toEqual(["sql-table-row-column"]);
    expect(plan.items.map((item) => item.kind)).toEqual(["review", "new"]);
    expect(plan.items.map((item) => item.cardId)).toEqual([
      prerequisiteSample.id,
      sqlSample.id,
    ]);
    expect(plan.queue).toMatchObject({
      usedMinutes: 10,
      remainingMinutes: 5,
      dueReviewCount: 1,
      deferredDueReviewCount: 0,
    });
    expect(plan.items[1]?.href).toBe("/exam-coach/learn?unit=sql");
  });

  it("keeps application empty when no reviewed application content contract exists", () => {
    const plan = buildActualTodayPlan({
      events: [],
      now: "2026-09-04T00:00:00.000Z",
      dailyMinutes: 45,
      content: [prerequisiteSample],
      resolveAdapter: fakeResolver,
    });

    expect(plan.items.some((item) => item.kind === "application")).toBe(false);
    expect(plan.queue.usedMinutes).toBeLessThanOrEqual(45);
  });
});

function fakeResolver(version: string, cardId: string): FsrsAdapter {
  return {
    version,
    desiredRetention: 0.9,
    review(_previous, input): MemoryState {
      return {
        cardId,
        dueAt: new Date(Date.parse(input.reviewedAt) + 86_400_000).toISOString(),
        stability: 2,
        difficulty: 5,
        fsrsVersion: version,
      };
    },
  };
}

function learningEvent(
  item: ContentItem,
  overrides: Partial<LearningEvent> & Pick<LearningEvent, "eventId">,
): LearningEvent {
  return {
    eventId: overrides.eventId,
    occurredAt: overrides.occurredAt ?? "2026-09-03T00:00:00.000Z",
    learnerId: "guest-test",
    contentId: item.id,
    contentVersion: overrides.contentVersion ?? item.version,
    cardId: item.id,
    correct: overrides.correct ?? true,
    rating: overrides.rating ?? "Good",
    responseTimeMs: 1000,
    helpLevel: overrides.helpLevel ?? 0,
    mode: overrides.mode ?? "recall",
    firstSubmission: overrides.firstSubmission ?? true,
    fsrsVersion: "fake-v1",
  };
}

function makePrerequisiteSample(base: ContentItem): ContentItem {
  return {
    ...base,
    id: "sql.table-row-column.001",
    conceptIds: ["sql-table-row-column"],
    prerequisites: [],
    objective: "테이블·행·열의 역할을 구분한다.",
    prompt: "테이블의 한 가로 묶음을 무엇이라 하는가?",
    answer: "행",
    explanation: "행은 한 레코드에 해당한다.",
    grading: { strategy: "exact", acceptedAnswers: ["행"] },
    estimatedMinutes: 5,
  };
}
