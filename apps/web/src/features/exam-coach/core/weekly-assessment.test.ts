import { describe, expect, it, vi } from "vitest";

import {
  appendLocalDiagnosticRun,
  loadLocalDiagnosticRuns,
} from "./local-profile";
import { appendLocalLearningEvent, type StorageLike } from "./local-store";
import {
  recordDiagnosticAttempt,
  summarizeDiagnosticRun,
} from "./diagnostic-results";
import { rebuildMemoryStateFromEvents } from "./memory-replay";
import {
  WEEKLY_ASSESSMENT,
  validateWeeklyAssessmentSet,
} from "./weekly-assessment";

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

describe("exam coach weekly assessment", () => {
  it("defines one deterministic 25-minute item for every SQL/C concept", () => {
    expect(validateWeeklyAssessmentSet(WEEKLY_ASSESSMENT)).toEqual([]);
    expect(WEEKLY_ASSESSMENT).toMatchObject({
      id: "weekly.sql-c.2026.v1",
      form: "weekly",
      estimatedMinutes: 25,
    });
    expect(WEEKLY_ASSESSMENT.items).toHaveLength(10);
    expect(new Set(WEEKLY_ASSESSMENT.items.map((item) => item.id)).size).toBe(
      10,
    );
  });

  it("builds and idempotently persists a private per-concept summary", () => {
    const storage = new MemoryStorage();
    const learnerId = "guest-weekly";
    const attempts = WEEKLY_ASSESSMENT.items.map((item, index) =>
      recordDiagnosticAttempt(item, item.answer, {
        eventId: `weekly-event-${index}`,
        learnerId,
        occurredAt: `2026-09-${String(index + 1).padStart(2, "0")}T01:00:00.000Z`,
        responseTimeMs: 60_000 + index,
        fsrsVersion: "ts-fsrs@5.4.1",
      }),
    );
    for (const attempt of attempts) {
      appendLocalLearningEvent(storage, learnerId, attempt.event);
    }

    const summary = summarizeDiagnosticRun(WEEKLY_ASSESSMENT, attempts);
    expect(summary).toMatchObject({
      form: "weekly",
      expectedItemCount: 10,
      attemptedItemCount: 10,
      correctCount: 10,
      completed: true,
    });
    if (summary.form !== "weekly") throw new Error("weekly summary expected");
    expect(summary.conceptResults).toHaveLength(10);
    expect(summary.conceptResults[0]).toMatchObject({
      conceptId: "sql-table-row-column",
      domainId: "sql",
      attemptedItemCount: 1,
      correctCount: 1,
    });

    const once = appendLocalDiagnosticRun(
      storage,
      learnerId,
      "weekly-run-1",
      "2026-09-11T01:00:00.000Z",
      summary,
    );
    const twice = appendLocalDiagnosticRun(
      storage,
      learnerId,
      "weekly-run-1",
      "2026-09-11T01:00:00.000Z",
      summary,
    );
    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(1);
    expect(() => loadLocalDiagnosticRuns(storage, "guest-other")).toThrow(
      /different learner/,
    );

    const serialized = JSON.stringify({ attempts, runs: twice });
    expect(serialized).not.toContain("submittedResponse");
    expect(serialized).not.toContain('"prompt"');
    expect(serialized).not.toContain('"answer"');
    expect(serialized).not.toContain('"explanation"');
  });

  it("keeps every weekly event outside regular FSRS memory replay", () => {
    const attempts = WEEKLY_ASSESSMENT.items.map((item, index) =>
      recordDiagnosticAttempt(item, "wrong", {
        eventId: `isolation-${index}`,
        learnerId: "guest-weekly",
        occurredAt: `2026-09-${String(index + 1).padStart(2, "0")}T02:00:00.000Z`,
        responseTimeMs: 1000,
        fsrsVersion: "ts-fsrs@5.4.1",
      }),
    );
    const resolveAdapter = vi.fn(() => {
      throw new Error("weekly assessment must not resolve an FSRS adapter");
    });

    expect(
      rebuildMemoryStateFromEvents(
        attempts.map((attempt) => attempt.event),
        attempts[0]!.event.cardId,
        resolveAdapter,
      ),
    ).toBeNull();
    expect(resolveAdapter).not.toHaveBeenCalled();
  });
});
