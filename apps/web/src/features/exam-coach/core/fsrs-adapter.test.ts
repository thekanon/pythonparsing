import { FSRSVersion } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import {
  TS_FSRS_MAXIMUM_INTERVAL_DAYS,
  TS_FSRS_VERSION,
  createTsFsrsAdapter,
  resolveTsFsrsAdapter,
} from "./fsrs-adapter";
import type { LearningEvent } from "./learning-engine";
import { rebuildMemoryStateFromEvents } from "./memory-replay";

const REVIEWED_AT = "2026-09-02T01:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("exam coach ts-fsrs adapter", () => {
  it("pins the package implementation, retention, and maximum interval policy", () => {
    const adapter = createTsFsrsAdapter("card-1");

    expect(TS_FSRS_VERSION).toBe(FSRSVersion);
    expect(TS_FSRS_VERSION).toBe("v5.4.1 using FSRS-6.0");
    expect(adapter.version).toBe(TS_FSRS_VERSION);
    expect(adapter.desiredRetention).toBe(0.9);
    expect(adapter.maximumIntervalDays).toBe(TS_FSRS_MAXIMUM_INTERVAL_DAYS);
    expect(TS_FSRS_MAXIMUM_INTERVAL_DAYS).toBe(36_500);
  });

  it.each([
    ["Again", "2026-09-02T01:01:00.000Z", 0.212, 6.4133],
    ["Hard", "2026-09-02T01:06:00.000Z", 1.2931, 5.11217071],
    ["Good", "2026-09-02T01:10:00.000Z", 2.3065, 2.11810397],
    ["Easy", "2026-09-10T01:00:00.000Z", 8.2956, 1],
  ] as const)(
    "maps %s to the real FSRS rating and first-review state",
    (rating, dueAt, stability, difficulty) => {
      const state = createTsFsrsAdapter(`card-${rating}`).review(null, {
        reviewedAt: REVIEWED_AT,
        rating,
      });

      expect(state).toMatchObject({
        cardId: `card-${rating}`,
        dueAt,
        stability,
        difficulty,
        fsrsVersion: TS_FSRS_VERSION,
      });
      expect(state.fsrsState).toEqual(
        expect.objectContaining({
          kind: "ts-fsrs-card",
          schemaVersion: 1,
        }),
      );
    },
  );

  it("uses the persisted FSRS card state for the next review", () => {
    const adapter = createTsFsrsAdapter("card-1");
    const first = adapter.review(null, {
      reviewedAt: REVIEWED_AT,
      rating: "Good",
    });
    const second = adapter.review(first, {
      reviewedAt: first.dueAt,
      rating: "Good",
    });

    expect(first.dueAt).toBe("2026-09-02T01:10:00.000Z");
    expect(second).toMatchObject({
      cardId: "card-1",
      dueAt: "2026-09-04T01:10:00.000Z",
      stability: 2.3065,
      difficulty: 2.11121424,
      fsrsVersion: TS_FSRS_VERSION,
    });
    expect(second.dueAt).not.toBe(first.dueAt);
  });

  it("caps every scheduled interval at the adapter maximum", () => {
    const adapter = createTsFsrsAdapter("card-1");
    let state = adapter.review(null, {
      reviewedAt: REVIEWED_AT,
      rating: "Easy",
    });

    for (let review = 0; review < 20; review += 1) {
      const reviewedAt = state.dueAt;
      state = adapter.review(state, { reviewedAt, rating: "Easy" });
      const intervalDays =
        (Date.parse(state.dueAt) - Date.parse(reviewedAt)) / DAY_MS;

      expect(intervalDays).toBeLessThanOrEqual(TS_FSRS_MAXIMUM_INTERVAL_DAYS);
    }
  });

  it("replays real FSRS state deterministically while skipping ineligible events", () => {
    const first = makeEvent({
      eventId: "first",
      occurredAt: REVIEWED_AT,
      rating: "Good",
    });
    const second = makeEvent({
      eventId: "second",
      occurredAt: "2026-09-02T01:10:00.000Z",
      rating: "Good",
    });
    const assessment = makeEvent({
      eventId: "assessment",
      occurredAt: "2026-09-02T01:05:00.000Z",
      mode: "assessment",
    });
    const correction = makeEvent({
      eventId: "correction",
      occurredAt: "2026-09-02T01:07:00.000Z",
      firstSubmission: false,
    });

    const state = rebuildMemoryStateFromEvents(
      [second, assessment, first, correction, first],
      "card-1",
      resolveTsFsrsAdapter,
    );

    expect(state).toMatchObject({
      cardId: "card-1",
      dueAt: "2026-09-04T01:10:00.000Z",
      stability: 2.3065,
      difficulty: 2.11121424,
      fsrsVersion: TS_FSRS_VERSION,
    });
  });

  it("rejects version, card, date, and foreign-state mismatches", () => {
    const adapter = createTsFsrsAdapter("card-1");
    const first = adapter.review(null, {
      reviewedAt: REVIEWED_AT,
      rating: "Good",
    });

    expect(() => resolveTsFsrsAdapter("foreign-version", "card-1")).toThrow(
      /version mismatch/,
    );
    expect(() =>
      createTsFsrsAdapter("other-card").review(first, {
        reviewedAt: first.dueAt,
        rating: "Good",
      }),
    ).toThrow(/card ID mismatch/);
    expect(() =>
      adapter.review(
        { ...first, fsrsVersion: "foreign-version" },
        { reviewedAt: first.dueAt, rating: "Good" },
      ),
    ).toThrow(/version mismatch/);
    expect(() =>
      adapter.review(
        { ...first, dueAt: "not-a-date" },
        { reviewedAt: first.dueAt, rating: "Good" },
      ),
    ).toThrow(/valid date-time/);
    expect(() =>
      adapter.review(
        { ...first, fsrsState: { kind: "foreign" } },
        { reviewedAt: first.dueAt, rating: "Good" },
      ),
    ).toThrow(/invalid or foreign FSRS state/);
    expect(() =>
      adapter.review(null, { reviewedAt: "not-a-date", rating: "Good" }),
    ).toThrow(/valid date-time/);
  });
});

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: "event-1",
    occurredAt: REVIEWED_AT,
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
    fsrsVersion: TS_FSRS_VERSION,
    ...overrides,
  };
}
