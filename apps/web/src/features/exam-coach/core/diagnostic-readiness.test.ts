import { describe, expect, it } from "vitest";

import { BASELINE_DIAGNOSTIC } from "./diagnostic-sets";
import { recordDiagnosticAttempt } from "./diagnostic-results";
import {
  buildDiagnosticReadinessReport,
  diagnosticMasteryEvidenceFromEvents,
} from "./diagnostic-readiness";
import type { LearningEvent } from "./learning-engine";

// prettier-ignore
describe("exam coach diagnostic readiness", () => {
  it("expands current diagnostic events into concept evidence", () => {
    const item = BASELINE_DIAGNOSTIC.items[0]!;
    const attempt = recordDiagnosticAttempt(item, item.answer, {
      eventId: "baseline-1",
      learnerId: "guest-a",
      occurredAt: "2026-09-02T01:00:00.000Z",
      responseTimeMs: 1200,
      fsrsVersion: "pending-adapter",
    });

    const evidence = diagnosticMasteryEvidenceFromEvents([attempt.event]);
    expect(evidence.map((entry) => entry.conceptId)).toEqual([
      "sql-select",
      "sql-where",
    ]);
    expect(evidence.every((entry) => entry.kind === "assessment")).toBe(true);
  });

  it("ignores assessment events outside the current diagnostic mapping", () => {
    const event: LearningEvent = {
      eventId: "other-assessment",
      occurredAt: "2026-09-02T01:00:00.000Z",
      learnerId: "guest-a",
      contentId: "future-assessment.001",
      contentVersion: 1,
      cardId: "assessment:future:item-1",
      correct: true,
      rating: "Good",
      responseTimeMs: 500,
      helpLevel: 0,
      mode: "assessment",
      firstSubmission: true,
      fsrsVersion: "pending-adapter",
    };

    expect(diagnosticMasteryEvidenceFromEvents([event])).toEqual([]);
  });

  it("ignores a different version of a known diagnostic item", () => {
    const item = BASELINE_DIAGNOSTIC.items[0]!;
    const attempt = recordDiagnosticAttempt(item, item.answer, {
      eventId: "baseline-wrong-version",
      learnerId: "guest-a",
      occurredAt: "2026-09-02T01:00:00.000Z",
      responseTimeMs: 1200,
      fsrsVersion: "pending-adapter",
    });
    const wrongVersionEvent: LearningEvent = {
      ...attempt.event,
      contentVersion: item.version + 1,
    };

    expect(diagnosticMasteryEvidenceFromEvents([wrongVersionEvent])).toEqual([]);
  });

  it("reports diagnostic evidence without inventing recall or memory results", () => {
    const item = BASELINE_DIAGNOSTIC.items[0]!;
    const attempt = recordDiagnosticAttempt(item, item.answer, {
      eventId: "baseline-1",
      learnerId: "guest-a",
      occurredAt: "2026-09-02T01:00:00.000Z",
      responseTimeMs: 1200,
      fsrsVersion: "pending-adapter",
    });

    const report = buildDiagnosticReadinessReport(
      [attempt.event],
      "2026-09-02T02:00:00.000Z",
    );
    expect(report).toMatchObject({
      conceptCount: 10,
      conceptsWithEvidence: 2,
      evidenceCoverageRate: 0.2,
      independentRecall: { attempts: 0, correct: 0, rate: null },
      independentApplication: { attempts: 0, correct: 0, rate: null },
      dueReviewCount: 0,
    });
    expect(report.assessment).toEqual({ attempts: 2, correct: 2, rate: 1 });
  });
});
