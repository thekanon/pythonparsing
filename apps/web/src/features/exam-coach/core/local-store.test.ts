import { describe, expect, it } from "vitest";

import type { LearningEvent } from "./learning-engine";
import {
  EXAM_COACH_STORAGE_KEYS,
  appendLocalLearningEvent,
  getOrCreateGuestId,
  loadLocalLearningEvents,
  resetGuestLearningData,
  type StorageLike,
} from "./local-store";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("exam coach guest local event store", () => {
  it("creates one stable namespaced guest id", () => {
    const storage = new MemoryStorage();
    let factoryCalls = 0;
    const createId = () => {
      factoryCalls += 1;
      return "fixed-id";
    };

    expect(getOrCreateGuestId(storage, createId)).toBe("guest-fixed-id");
    expect(getOrCreateGuestId(storage, createId)).toBe("guest-fixed-id");
    expect(factoryCalls).toBe(1);
    expect(storage.getItem(EXAM_COACH_STORAGE_KEYS.guestId)).toBe(
      "guest-fixed-id",
    );
  });

  it("persists events without storing submitted answer text", () => {
    const storage = new MemoryStorage();
    const learnerId = "guest-a";

    appendLocalLearningEvent(storage, learnerId, makeEvent());

    const raw = storage.getItem(EXAM_COACH_STORAGE_KEYS.learningEvents);
    expect(raw).toContain('"schemaVersion":1');
    expect(raw).toContain('"learnerId":"guest-a"');
    expect(raw).not.toContain('"answer"');
    expect(raw).not.toContain("SELECT secret");
  });

  it("replays persisted events in occurredAt order", () => {
    const storage = new MemoryStorage();
    const learnerId = "guest-a";

    appendLocalLearningEvent(
      storage,
      learnerId,
      makeEvent({
        eventId: "event-late",
        occurredAt: "2026-09-02T02:00:00.000Z",
      }),
    );
    appendLocalLearningEvent(
      storage,
      learnerId,
      makeEvent({
        eventId: "event-early",
        occurredAt: "2026-09-02T01:00:00.000Z",
      }),
    );

    const replayed = loadLocalLearningEvents(storage, learnerId);
    const eventIds = replayed.map((event) => event.eventId);
    expect(eventIds).toEqual(["event-early", "event-late"]);
  });

  it("keeps exact duplicate events idempotent", () => {
    const storage = new MemoryStorage();
    const learnerId = "guest-a";
    const event = makeEvent();

    const once = appendLocalLearningEvent(storage, learnerId, event);
    const twice = appendLocalLearningEvent(storage, learnerId, event);

    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(1);
    expect(loadLocalLearningEvents(storage, learnerId)).toHaveLength(1);
  });

  it("rejects conflicting payloads that reuse an event id", () => {
    const storage = new MemoryStorage();
    const learnerId = "guest-a";
    appendLocalLearningEvent(storage, learnerId, makeEvent());

    expect(() =>
      appendLocalLearningEvent(
        storage,
        learnerId,
        makeEvent({ responseTimeMs: 9999 }),
      ),
    ).toThrow(/conflicting payload/);
  });

  it("rejects events belonging to a different guest", () => {
    const storage = new MemoryStorage();

    expect(() =>
      appendLocalLearningEvent(
        storage,
        "guest-a",
        makeEvent({ learnerId: "guest-b" }),
      ),
    ).toThrow(/does not match guest learner/);
  });

  it("rejects corrupt persisted events instead of trusting them", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      EXAM_COACH_STORAGE_KEYS.learningEvents,
      JSON.stringify({
        schemaVersion: 1,
        learnerId: "guest-a",
        events: [{ eventId: "broken" }],
      }),
    );

    expect(() => loadLocalLearningEvents(storage, "guest-a")).toThrow(
      /invalid occurredAt/,
    );
  });

  it("clears guest identity and learning events together", () => {
    const storage = new MemoryStorage();
    const learnerId = getOrCreateGuestId(storage, () => "reset-me");
    appendLocalLearningEvent(storage, learnerId, makeEvent({ learnerId }));

    resetGuestLearningData(storage);

    expect(storage.getItem(EXAM_COACH_STORAGE_KEYS.guestId)).toBeNull();
    expect(storage.getItem(EXAM_COACH_STORAGE_KEYS.learningEvents)).toBeNull();
  });
});

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
    fsrsVersion: "pending-adapter",
    ...overrides,
  };
}
