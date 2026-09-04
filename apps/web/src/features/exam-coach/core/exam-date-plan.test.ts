import { describe, expect, it } from "vitest";

import { LEARNING_CONTENT_CATALOG } from "./content-catalog";
import type { ContentItem } from "./content-schema";
import type {
  FsrsAdapter,
  LearningEvent,
  MemoryState,
} from "./learning-engine";
import { buildExamDatePlan } from "./exam-date-plan";

const sqlSample = LEARNING_CONTENT_CATALOG["sql-select-basics"];

describe("exam coach exam-date plan", () => {
  it("computes calendar days, available time, reviewed coverage, due debt, budgets, and a capped 7-day preview", () => {
    const studied = cloneContent(sqlSample, "sql.select.studied.001");
    const remaining = cloneContent(sqlSample, "sql.select.remaining.001");

    const plan = buildExamDatePlan({
      events: [
        learningEvent(studied, {
          eventId: "studied",
          occurredAt: "2026-09-01T00:00:00.000Z",
        }),
      ],
      now: "2026-09-03T16:30:00.000Z",
      examDate: "2026-09-14",
      dailyMinutes: 45,
      settingsUpdatedAt: "2026-09-03T00:00:00.000Z",
      timeZoneOffsetMinutes: 540,
      content: [studied, remaining],
      resolveAdapter: fakeResolver,
    });

    expect(plan.status).toBe("ready");
    if (plan.status !== "ready") return;

    expect(plan).toMatchObject({
      currentDate: "2026-09-04",
      daysRemaining: 10,
      totalAvailableMinutes: 450,
      reviewedContentCount: 2,
      studiedReviewedContentCount: 1,
      reviewedCoveragePercent: 50,
      remainingNewContentCount: 1,
      remainingNewConceptCount: 1,
      remainingNewMinutes: 5,
      dueReviewDebtCount: 1,
      dueReviewDebtMinutes: 5,
      reviewBudgetPercent: 55,
    });
    expect(plan.reviewBudgetMinutes + plan.newLearningBudgetMinutes).toBe(450);
    expect(plan.preview).toHaveLength(7);
    expect(plan.preview[0]).toMatchObject({
      date: "2026-09-04",
      label: "9/4 (금)",
      debtRecoveryMinutes: 5,
      remainingDueDebtMinutes: 0,
    });
    expect(plan.preview.every((day) => day.totalMinutes <= 45)).toBe(true);
  });

  it("flags invalid and past exam dates instead of producing a negative plan", () => {
    const base = {
      events: [] as readonly LearningEvent[],
      now: "2026-09-04T00:00:00.000Z",
      dailyMinutes: 45,
      settingsUpdatedAt: "2026-09-01T00:00:00.000Z",
      content: [sqlSample] as readonly ContentItem[],
      resolveAdapter: fakeResolver,
    };

    const invalid = buildExamDatePlan({ ...base, examDate: "2026-02-31" });
    const past = buildExamDatePlan({ ...base, examDate: "2026-09-03" });

    expect(invalid).toMatchObject({
      status: "invalid-exam-date",
      currentDate: "2026-09-04",
    });
    expect(past).toMatchObject({
      status: "past-exam-date",
      currentDate: "2026-09-04",
      examDate: "2026-09-03",
    });
    expect("daysRemaining" in invalid).toBe(false);
    expect("daysRemaining" in past).toBe(false);
  });

  it("infers fully elapsed inactive study days from local evidence and clears due debt before new learning without exceeding the daily cap", () => {
    const studied = [0, 1, 2, 3].map((index) =>
      cloneContent(sqlSample, `sql.select.review-${index}.001`),
    );
    const remaining = cloneContent(sqlSample, "sql.select.new.001");
    const events = studied.map((item, index) =>
      learningEvent(item, {
        eventId: `review-${index}`,
        occurredAt: `2026-09-01T0${index}:00:00.000Z`,
      }),
    );

    const plan = buildExamDatePlan({
      events,
      now: "2026-09-04T12:00:00.000Z",
      examDate: "2026-10-04",
      dailyMinutes: 15,
      settingsUpdatedAt: "2026-09-01T00:00:00.000Z",
      content: [...studied, remaining],
      resolveAdapter: fakeResolver,
    });

    expect(plan.status).toBe("ready");
    if (plan.status !== "ready") return;

    expect(plan).toMatchObject({
      missedStudyDays: 2,
      evidenceWindowDays: 3,
      dueReviewDebtCount: 4,
      dueReviewDebtMinutes: 20,
      remainingNewMinutes: 5,
    });
    expect(plan.preview[0]).toMatchObject({
      reviewMinutes: 15,
      newLearningMinutes: 0,
      debtRecoveryMinutes: 15,
      remainingDueDebtMinutes: 5,
      totalMinutes: 15,
    });
    expect(plan.preview[1]).toMatchObject({
      debtRecoveryMinutes: 5,
      remainingDueDebtMinutes: 0,
      newLearningMinutes: 5,
    });
    expect(plan.preview[0]?.recoveryNote).toContain("다음 날로 이월");
    expect(plan.preview[1]?.recoveryNote).toContain("미수행 추정 2일");
    expect(plan.preview.every((day) => day.totalMinutes <= 15)).toBe(true);
  });

  it("raises the review budget share as the exam approaches without inventing application work", () => {
    const studied = cloneContent(sqlSample, "sql.select.reviewed.001");
    const remaining = cloneContent(sqlSample, "sql.select.pending.001");
    const events = [
      learningEvent(studied, {
        eventId: "reviewed",
        occurredAt: "2026-09-03T00:00:00.000Z",
      }),
    ];
    const common = {
      events,
      now: "2026-09-04T00:00:00.000Z",
      dailyMinutes: 45,
      settingsUpdatedAt: "2026-09-04T00:00:00.000Z",
      content: [studied, remaining] as readonly ContentItem[],
      resolveAdapter: fakeResolver,
    };

    const far = buildExamDatePlan({ ...common, examDate: "2026-10-04" });
    const near = buildExamDatePlan({ ...common, examDate: "2026-09-07" });

    expect(far.status).toBe("ready");
    expect(near.status).toBe("ready");
    if (far.status !== "ready" || near.status !== "ready") return;

    expect(far.reviewBudgetPercent).toBe(40);
    expect(near.reviewBudgetPercent).toBe(80);
    expect(near.reviewBudgetPercent).toBeGreaterThan(far.reviewBudgetPercent);
    expect(near.preview.every((day) => day.totalMinutes <= 45)).toBe(true);
  });
});

function fakeResolver(version: string, cardId: string): FsrsAdapter {
  return {
    version,
    desiredRetention: 0.9,
    review(_previous, input): MemoryState {
      return {
        cardId,
        dueAt: new Date(
          Date.parse(input.reviewedAt) + 86_400_000,
        ).toISOString(),
        stability: 2,
        difficulty: 5,
        fsrsVersion: version,
      };
    },
  };
}

function learningEvent(
  item: ContentItem,
  overrides: Pick<LearningEvent, "eventId" | "occurredAt">,
): LearningEvent {
  return {
    eventId: overrides.eventId,
    occurredAt: overrides.occurredAt,
    learnerId: "guest-test",
    contentId: item.id,
    contentVersion: item.version,
    cardId: item.id,
    correct: true,
    rating: "Good",
    responseTimeMs: 1000,
    helpLevel: 0,
    mode: "recall",
    firstSubmission: true,
    fsrsVersion: "fake-v1",
  };
}

function cloneContent(base: ContentItem, id: string): ContentItem {
  return {
    ...base,
    id,
  };
}
