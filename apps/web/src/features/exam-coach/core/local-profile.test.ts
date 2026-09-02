import { describe, expect, it } from "vitest";

import type { DiagnosticRunSummary } from "./diagnostic-results";
import {
  EXAM_COACH_PROFILE_STORAGE_KEYS,
  appendLocalDiagnosticRun,
  loadLocalDiagnosticRuns,
  loadLocalStudySettings,
  resetLocalProfileData,
  saveLocalStudySettings,
} from "./local-profile";
import { EXAM_COACH_STORAGE_KEYS, type StorageLike } from "./local-store";
import { resetAllLocalGuestData } from "./local-data-reset";

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

// prettier-ignore
describe("exam coach local profile", () => {
  it("persists and reloads study settings for the same learner", () => {
    const storage = new MemoryStorage();
    const saved = saveLocalStudySettings(storage, "guest-a", {
      examDate: "2026-11-15",
      dailyMinutes: 45,
      updatedAt: "2026-09-02T06:00:00.000Z",
    });

    expect(saved).toEqual({
      schemaVersion: 1,
      learnerId: "guest-a",
      examDate: "2026-11-15",
      dailyMinutes: 45,
      updatedAt: "2026-09-02T06:00:00.000Z",
    });
    expect(loadLocalStudySettings(storage, "guest-a")).toEqual(saved);
  });

  it("rejects invalid settings and cross-learner reads", () => {
    const storage = new MemoryStorage();

    expect(() =>
      saveLocalStudySettings(storage, "guest-a", {
        examDate: "2026-02-30",
        dailyMinutes: 45,
        updatedAt: "2026-09-02T06:00:00.000Z",
      }),
    ).toThrow(/valid calendar date/);

    expect(() =>
      saveLocalStudySettings(storage, "guest-a", {
        examDate: "2026-11-15",
        dailyMinutes: 0,
        updatedAt: "2026-09-02T06:00:00.000Z",
      }),
    ).toThrow(/positive integer/);

    saveLocalStudySettings(storage, "guest-a", {
      examDate: "2026-11-15",
      dailyMinutes: 45,
      updatedAt: "2026-09-02T06:00:00.000Z",
    });
    expect(() => loadLocalStudySettings(storage, "guest-b")).toThrow(
      /different learner/,
    );
  });

  it("persists completed diagnostic summaries in completion order", () => {
    const storage = new MemoryStorage();
    const later = completedSummary("followup", 5);
    const earlier = completedSummary("baseline", 3);

    appendLocalDiagnosticRun(
      storage,
      "guest-a",
      "run-later",
      "2026-11-01T09:00:00.000Z",
      later,
    );
    appendLocalDiagnosticRun(
      storage,
      "guest-a",
      "run-earlier",
      "2026-09-02T09:00:00.000Z",
      earlier,
    );

    const runs = loadLocalDiagnosticRuns(storage, "guest-a");
    expect(runs.map((run) => run.runId)).toEqual([
      "run-earlier",
      "run-later",
    ]);
    expect(runs[0]?.summary.correctCount).toBe(3);

    const serialized = storage.getItem(
      EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns,
    );
    expect(serialized).not.toContain("submittedResponse");
    expect(serialized).not.toContain("answer");
  });

  it("keeps identical diagnostic run retries idempotent", () => {
    const storage = new MemoryStorage();
    const summary = completedSummary("baseline", 3);

    const once = appendLocalDiagnosticRun(
      storage,
      "guest-a",
      "run-1",
      "2026-09-02T09:00:00.000Z",
      summary,
    );
    const twice = appendLocalDiagnosticRun(
      storage,
      "guest-a",
      "run-1",
      "2026-09-02T09:00:00.000Z",
      summary,
    );

    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(1);
  });

  it("rejects conflicting duplicate runs and incomplete summaries", () => {
    const storage = new MemoryStorage();
    appendLocalDiagnosticRun(
      storage,
      "guest-a",
      "run-1",
      "2026-09-02T09:00:00.000Z",
      completedSummary("baseline", 3),
    );

    expect(() =>
      appendLocalDiagnosticRun(
        storage,
        "guest-a",
        "run-1",
        "2026-09-02T09:00:00.000Z",
        completedSummary("baseline", 4),
      ),
    ).toThrow(/conflicting payload/);

    expect(() =>
      appendLocalDiagnosticRun(
        storage,
        "guest-a",
        "partial",
        "2026-09-02T10:00:00.000Z",
        {
          ...completedSummary("baseline", 3),
          attemptedItemCount: 5,
          completed: false,
        },
      ),
    ).toThrow(/only completed diagnostic runs/);
  });

  it("rejects corrupt and cross-learner diagnostic storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns,
      JSON.stringify({
        schemaVersion: 1,
        learnerId: "guest-b",
        runs: [],
      }),
    );

    expect(() => loadLocalDiagnosticRuns(storage, "guest-a")).toThrow(
      /different learner/,
    );

    storage.setItem(
      EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns,
      "{not-json",
    );
    expect(() => loadLocalDiagnosticRuns(storage, "guest-a")).toThrow(
      /not valid JSON/,
    );
  });

  it("can clear profile-only data without deleting learning events", () => {
    const storage = seededStorage();

    resetLocalProfileData(storage);

    expect(
      storage.getItem(EXAM_COACH_PROFILE_STORAGE_KEYS.settings),
    ).toBeNull();
    expect(
      storage.getItem(EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns),
    ).toBeNull();
    expect(storage.getItem(EXAM_COACH_STORAGE_KEYS.guestId)).not.toBeNull();
    expect(
      storage.getItem(EXAM_COACH_STORAGE_KEYS.learningEvents),
    ).not.toBeNull();
  });

  it("clears every local guest namespace through the integrated reset", () => {
    const storage = seededStorage();

    resetAllLocalGuestData(storage);

    expect(storage.getItem(EXAM_COACH_STORAGE_KEYS.guestId)).toBeNull();
    expect(storage.getItem(EXAM_COACH_STORAGE_KEYS.learningEvents)).toBeNull();
    expect(storage.getItem(EXAM_COACH_PROFILE_STORAGE_KEYS.settings)).toBeNull();
    expect(
      storage.getItem(EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns),
    ).toBeNull();
  });
});

function completedSummary(
  form: "baseline" | "followup",
  correctCount: number,
): DiagnosticRunSummary {
  const pairResults = Array.from({ length: 6 }, (_, index) => ({
    pairId: `pair-${index + 1}`,
    correct: index < correctCount,
  }));

  return {
    setId: "diagnostic.sql-c.2026",
    form,
    expectedItemCount: 6,
    attemptedItemCount: 6,
    correctCount,
    accuracy: correctCount / 6,
    totalResponseTimeMs: 180000,
    completed: true,
    pairResults,
  };
}

function seededStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(EXAM_COACH_STORAGE_KEYS.guestId, "guest-a");
  storage.setItem(EXAM_COACH_STORAGE_KEYS.learningEvents, "events");
  storage.setItem(EXAM_COACH_PROFILE_STORAGE_KEYS.settings, "settings");
  storage.setItem(EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns, "runs");
  return storage;
}
