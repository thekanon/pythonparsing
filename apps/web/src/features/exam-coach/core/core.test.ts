import { describe, expect, it } from "vitest";

import cSample from "../content/2026/c/control-flow.json";
import sqlSample from "../content/2026/sql/select-basics.json";
import {
  appendLearningEvent,
  DEFAULT_DESIRED_RETENTION,
  toFsrsReviewInput,
  validateContentItem,
} from "./engine";
import {
  C_CONCEPTS,
  SQL_CONCEPTS,
  validateConceptGraph,
} from "./learning-paths";
import { OFFICIAL_OBJECTIVES_2026 } from "./official-objectives";
import type { LearningEvent } from "./types";

describe("exam coach core contracts", () => {
  it("contains all 12 official 2026 domains in order", () => {
    expect(OFFICIAL_OBJECTIVES_2026).toHaveLength(12);
    expect(OFFICIAL_OBJECTIVES_2026.map((item) => item.order)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(new Set(OFFICIAL_OBJECTIVES_2026.map((item) => item.id)).size).toBe(
      12,
    );
  });

  it("keeps SQL and C prerequisite graphs valid", () => {
    expect(validateConceptGraph(SQL_CONCEPTS)).toEqual([]);
    expect(validateConceptGraph(C_CONCEPTS)).toEqual([]);
  });

  it("validates the checked-in SQL and C content samples", () => {
    expect(validateContentItem(sqlSample)).toEqual([]);
    expect(validateContentItem(cSample)).toEqual([]);
  });

  it("requires a reviewer before content is marked reviewed", () => {
    expect(
      validateContentItem({
        ...sqlSample,
        reviewStatus: "reviewed",
        reviewer: null,
      }),
    ).toContain("reviewed content requires reviewer");
  });

  it("stores duplicate event ids idempotently", () => {
    const event = makeEvent();
    const once = appendLearningEvent([], event);
    const twice = appendLearningEvent(once, event);

    expect(once).toHaveLength(1);
    expect(twice).toBe(once);
  });

  it("forces incorrect or helped recalls to Again", () => {
    expect(() =>
      appendLearningEvent([], makeEvent({ correct: false, rating: "Good" })),
    ).toThrow(/rated Again/);
    expect(() =>
      appendLearningEvent([], makeEvent({ helpLevel: 1, rating: "Good" })),
    ).toThrow(/rated Again/);
  });

  it("only converts first submissions into FSRS scheduling input", () => {
    expect(DEFAULT_DESIRED_RETENTION).toBe(0.9);
    expect(toFsrsReviewInput(makeEvent())).toEqual({
      reviewedAt: "2026-09-02T00:00:00.000Z",
      rating: "Good",
    });
    expect(() =>
      toFsrsReviewInput(makeEvent({ firstSubmission: false })),
    ).toThrow(/first submission/);
  });
});

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: "event-1",
    occurredAt: "2026-09-02T00:00:00.000Z",
    learnerId: "guest-1",
    contentId: "sql.select.001",
    contentVersion: 1,
    cardId: "card-1",
    correct: true,
    rating: "Good",
    responseTimeMs: 1200,
    helpLevel: 0,
    mode: "recall",
    firstSubmission: true,
    fsrsVersion: "pending-adapter",
    ...overrides,
  };
}
