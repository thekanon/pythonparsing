import { describe, expect, it } from "vitest";

import {
  toFsrsReviewInput,
  type FsrsAdapter,
  type FsrsReviewInput,
  type LearningEvent,
  type MemoryState,
} from "./learning-engine";
import { rebuildMemoryStateFromEvents } from "./memory-replay";

// prettier-ignore
describe("exam coach assessment scheduling isolation", () => {
  it("keeps assessment events out of regular memory replay", () => {
    const calls: FsrsReviewInput[] = [];
    const state = rebuildMemoryStateFromEvents(
      [
        makeEvent({
          eventId: "assessment",
          occurredAt: "2026-09-02T01:00:00.000Z",
          mode: "assessment",
        }),
        makeEvent({
          eventId: "recall",
          occurredAt: "2026-09-02T02:00:00.000Z",
          mode: "recall",
        }),
      ],
      "card-1",
      () => makeAdapter(calls),
    );

    expect(calls).toEqual([
      { reviewedAt: "2026-09-02T02:00:00.000Z", rating: "Good" },
    ]);
    expect(state?.stability).toBe(1);
  });

  it("rejects assessment events at the direct FSRS input boundary", () => {
    expect(() =>
      toFsrsReviewInput(makeEvent({ mode: "assessment" })),
    ).toThrow(/assessment events cannot update memory scheduling/);
  });
});

function makeAdapter(calls: FsrsReviewInput[]): FsrsAdapter {
  return {
    version: "fake-v1",
    desiredRetention: 0.9,
    review(previous, input): MemoryState {
      calls.push(input);
      return {
        cardId: "card-1",
        dueAt: input.reviewedAt,
        stability: (previous?.stability ?? 0) + 1,
        difficulty: 5,
        fsrsVersion: "fake-v1",
      };
    },
  };
}

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: "event-1",
    occurredAt: "2026-09-02T01:00:00.000Z",
    learnerId: "guest-a",
    contentId: "diagnostic.sql-c.2026.baseline.sql-filter",
    contentVersion: 1,
    cardId: "card-1",
    correct: true,
    rating: "Good",
    responseTimeMs: 1200,
    helpLevel: 0,
    mode: "assessment",
    firstSubmission: true,
    fsrsVersion: "fake-v1",
    ...overrides,
  };
}
