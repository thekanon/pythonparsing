import { describe, expect, it } from "vitest";

// prettier-ignore
import {
  BASELINE_DIAGNOSTIC,
  FOLLOWUP_DIAGNOSTIC,
} from "./diagnostic-sets";
import {
  compareDiagnosticRuns,
  recordDiagnosticAttempt,
  summarizeDiagnosticRun,
  type DiagnosticAttemptRecord,
} from "./diagnostic-results";

// prettier-ignore
describe("exam coach diagnostic results", () => {
  it("records assessment events and multi-concept evidence without answer text", () => {
    const item = BASELINE_DIAGNOSTIC.items[0]!;
    const attempt = recordDiagnosticAttempt(
      item,
      item.answer,
      context("event-1"),
    );

    expect(attempt).toMatchObject({
      setId: "diagnostic.sql-c.2026",
      pairId: "sql-filter",
      form: "baseline",
      correct: true,
    });
    expect(attempt.event).toMatchObject({
      mode: "assessment",
      firstSubmission: true,
      rating: "Good",
    });
    expect(attempt.evidence.map((item) => item.conceptId)).toEqual([
      "sql-select",
      "sql-where",
    ]);
    expect(attempt.evidence.map((item) => item.evidenceId)).toEqual([
      "event-1:sql-select",
      "event-1:sql-where",
    ]);

    const serialized = JSON.stringify(attempt);
    expect(serialized).not.toContain('"submittedResponse"');
    expect(serialized).not.toContain(item.answer);
  });

  it("records wrong diagnostic answers as assessment Again events", () => {
    const attempt = recordDiagnosticAttempt(
      BASELINE_DIAGNOSTIC.items[0]!,
      "definitely wrong",
      context("event-wrong"),
    );

    expect(attempt.correct).toBe(false);
    expect(attempt.event.rating).toBe("Again");
    expect(attempt.evidence.every((item) => item.kind === "assessment")).toBe(
      true,
    );
  });

  it("summarizes partial diagnostic runs without pretending they are complete", () => {
    const first = recordDiagnosticAttempt(
      BASELINE_DIAGNOSTIC.items[0]!,
      BASELINE_DIAGNOSTIC.items[0]!.answer,
      context("partial-1", 1000),
    );
    const second = recordDiagnosticAttempt(
      BASELINE_DIAGNOSTIC.items[1]!,
      "wrong",
      context("partial-2", 2000),
    );

    const summary = summarizeDiagnosticRun(BASELINE_DIAGNOSTIC, [second, first]);

    expect(summary).toMatchObject({
      setId: "diagnostic.sql-c.2026",
      form: "baseline",
      expectedItemCount: 6,
      attemptedItemCount: 2,
      correctCount: 1,
      accuracy: 0.5,
      totalResponseTimeMs: 3000,
      completed: false,
    });
    expect(summary.pairResults.map((result) => result.pairId)).toEqual([
      "sql-filter",
      "sql-group",
    ]);
  });

  it("rejects duplicate skill-pair attempts in one run", () => {
    const attempt = recordDiagnosticAttempt(
      BASELINE_DIAGNOSTIC.items[0]!,
      BASELINE_DIAGNOSTIC.items[0]!.answer,
      context("duplicate"),
    );

    expect(() =>
      summarizeDiagnosticRun(BASELINE_DIAGNOSTIC, [attempt, attempt]),
    ).toThrow(/duplicate diagnostic pair attempt/);
  });

  it("compares complete baseline and followup runs by skill pair", () => {
    const baseline = summarizeDiagnosticRun(
      BASELINE_DIAGNOSTIC,
      BASELINE_DIAGNOSTIC.items.map((item, index) =>
        recordDiagnosticAttempt(
          item,
          "definitely wrong",
          context(`baseline-${index}`),
        ),
      ),
    );
    const followup = summarizeDiagnosticRun(
      FOLLOWUP_DIAGNOSTIC,
      FOLLOWUP_DIAGNOSTIC.items.map((item, index) =>
        recordDiagnosticAttempt(
          item,
          item.answer,
          context(`followup-${index}`),
        ),
      ),
    );

    const comparison = compareDiagnosticRuns(baseline, followup);

    expect(comparison).toMatchObject({
      setId: "diagnostic.sql-c.2026",
      baselineAccuracy: 0,
      followupAccuracy: 1,
      accuracyDelta: 1,
    });
    expect(comparison.pairChanges).toHaveLength(6);
    expect(
      comparison.pairChanges.every(
        (pair) => !pair.baselineCorrect && pair.followupCorrect,
      ),
    ).toBe(true);
  });

  it("requires complete runs before baseline-followup comparison", () => {
    const partial = summarizeDiagnosticRun(BASELINE_DIAGNOSTIC, []);
    const followup = summarizeDiagnosticRun(FOLLOWUP_DIAGNOSTIC, []);

    expect(() => compareDiagnosticRuns(partial, followup)).toThrow(
      /must be complete/,
    );
  });

  it("rejects attempts that do not belong to the supplied set", () => {
    const attempt = recordDiagnosticAttempt(
      BASELINE_DIAGNOSTIC.items[0]!,
      BASELINE_DIAGNOSTIC.items[0]!.answer,
      context("mismatch"),
    );
    const changed: DiagnosticAttemptRecord = {
      ...attempt,
      itemId: "different-item",
    };

    expect(() =>
      summarizeDiagnosticRun(BASELINE_DIAGNOSTIC, [changed]),
    ).toThrow(/does not match set item/);
  });
});

// prettier-ignore
function context(
  eventId: string,
  responseTimeMs = 1200,
) {
  return {
    eventId,
    learnerId: "guest-a",
    occurredAt: "2026-09-02T05:00:00.000Z",
    responseTimeMs,
    fsrsVersion: "fake-v1",
  };
}
