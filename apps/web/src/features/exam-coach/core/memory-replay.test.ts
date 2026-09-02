import { describe, expect, it } from "vitest";

import type {
  FsrsAdapter,
  FsrsReviewInput,
  LearningEvent,
  MemoryState,
} from "./learning-engine";
import {
  canonicalizeLearningEvents,
  rebuildMemoryStateFromEvents,
} from "./memory-replay";

describe("exam coach memory replay", () => {
  it("replays first submissions in occurredAt order", () => {
    const calls: FsrsReviewInput[] = [];
    const resolveAdapter = () => makeAdapter("fake-v1", "card-1", calls);

    const state = rebuildMemoryStateFromEvents(
      [
        makeEvent({
          eventId: "later",
          occurredAt: "2026-09-02T02:00:00.000Z",
          rating: "Good",
        }),
        makeEvent({
          eventId: "correction",
          occurredAt: "2026-09-02T01:30:00.000Z",
          firstSubmission: false,
          rating: "Good",
        }),
        makeEvent({
          eventId: "earlier",
          occurredAt: "2026-09-02T01:00:00.000Z",
          correct: false,
          rating: "Again",
        }),
      ],
      "card-1",
      resolveAdapter,
    );

    expect(calls.map((input) => input.rating)).toEqual(["Again", "Good"]);
    expect(state).toMatchObject({
      cardId: "card-1",
      stability: 2,
      fsrsVersion: "fake-v1",
    });
  });

  it("deduplicates exact event retries before replay", () => {
    const event = makeEvent();
    const canonical = canonicalizeLearningEvents([event, event]);

    expect(canonical).toHaveLength(1);
  });

  it("rejects conflicting retries that reuse an event id", () => {
    expect(() =>
      canonicalizeLearningEvents([
        makeEvent(),
        makeEvent({ responseTimeMs: 9999 }),
      ]),
    ).toThrow(/conflicting payload/);
  });

  it("requires the resolver to return the recorded FSRS version", () => {
    const resolveAdapter = () => makeAdapter("other-version", "card-1", []);

    expect(() =>
      rebuildMemoryStateFromEvents(
        [makeEvent({ fsrsVersion: "fake-v1" })],
        "card-1",
        resolveAdapter,
      ),
    ).toThrow(/version does not match event version/);
  });

  it("rejects adapters that return state for another card", () => {
    const adapter: FsrsAdapter = {
      version: "fake-v1",
      desiredRetention: 0.9,
      review() {
        return {
          cardId: "wrong-card",
          dueAt: "2026-09-03T01:00:00.000Z",
          stability: 1,
          difficulty: 5,
          fsrsVersion: "fake-v1",
        };
      },
    };

    expect(() =>
      rebuildMemoryStateFromEvents([makeEvent()], "card-1", () => adapter),
    ).toThrow(/different card/);
  });

  it("returns null when a card has no first-submission events", () => {
    const state = rebuildMemoryStateFromEvents(
      [makeEvent({ cardId: "other-card" })],
      "card-1",
      () => makeAdapter("fake-v1", "card-1", []),
    );

    expect(state).toBeNull();
  });
});

function makeAdapter(
  version: string,
  cardId: string,
  calls: FsrsReviewInput[],
): FsrsAdapter {
  return {
    version,
    desiredRetention: 0.9,
    review(previous, input): MemoryState {
      calls.push(input);
      return {
        cardId,
        dueAt: input.reviewedAt,
        stability: (previous?.stability ?? 0) + 1,
        difficulty: previous?.difficulty ?? 5,
        fsrsVersion: version,
      };
    },
  };
}

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: "event-1",
    occurredAt: "2026-09-02T01:00:00.000Z",
    learnerId: "guest-a",
    contentId: "sql.select.001",
    contentVersion: 1,
    cardId: "card-1",
    correct: true,
    rating: "Good",
    responseTimeMs: 1200,
    helpLevel: 0,
    mode: "recall",
    firstSubmission: true,
    fsrsVersion: "fake-v1",
    ...overrides,
  };
}
