import { describe, expect, it } from "vitest";

import {
  C_CONCEPTS,
  SQL_CONCEPTS,
  type LearningEvent,
  type MemoryState,
} from "./learning-engine";
import {
  buildConceptMasterySummary,
  buildReadinessReport,
  canonicalizeMasteryEvidence,
  masteryEvidenceForConceptsFromLearningEvent,
  masteryEvidenceFromLearningEvent,
  type ConceptCardMemory,
  type MasteryEvidence,
} from "./mastery";

// prettier-ignore
describe("exam coach mastery evidence", () => {
  it("converts learning events without treating helped work as independent", () => {
    const independent = masteryEvidenceFromLearningEvent(
      makeEvent({ eventId: "independent", correct: true, rating: "Good" }),
      "sql-select",
    );
    const helped = masteryEvidenceFromLearningEvent(
      makeEvent({
        eventId: "helped",
        correct: false,
        rating: "Again",
        helpLevel: 2,
      }),
      "sql-select",
    );

    expect(independent).toMatchObject({
      kind: "recall",
      correct: true,
      independent: true,
    });
    expect(helped).toMatchObject({
      kind: "recall",
      correct: false,
      independent: false,
    });
  });

  it("expands one learning event across multiple concepts without id collisions", () => {
    const evidence = masteryEvidenceForConceptsFromLearningEvent(
      makeEvent(),
      ["sql-select", "sql-where", "sql-select"],
    );

    expect(evidence.map((item) => item.evidenceId)).toEqual([
      "event-1:sql-select",
      "event-1:sql-where",
    ]);
    expect(evidence.map((item) => item.conceptId)).toEqual([
      "sql-select",
      "sql-where",
    ]);
    expect(canonicalizeMasteryEvidence(evidence)).toHaveLength(2);
  });

  it("deduplicates exact evidence retries and rejects conflicts", () => {
    const evidence = makeEvidence({ evidenceId: "same" });

    expect(canonicalizeMasteryEvidence([evidence, evidence])).toHaveLength(1);
    expect(() =>
      canonicalizeMasteryEvidence([
        evidence,
        { ...evidence, correct: !evidence.correct },
      ]),
    ).toThrow(/conflicting payload/);
  });

  it("keeps memory state separate from evidence performance", () => {
    const summary = buildConceptMasterySummary(
      "sql-select",
      [
        makeEvidence({
          evidenceId: "recall-1",
          kind: "recall",
          correct: true,
          independent: true,
        }),
        makeEvidence({
          evidenceId: "application-1",
          kind: "application",
          correct: false,
          independent: true,
        }),
      ],
      [conceptMemory("sql-select", "card-a", "2026-09-02T01:00:00.000Z")],
      "2026-09-02T02:00:00.000Z",
    );

    expect(summary.recall).toMatchObject({
      independentAttempts: 1,
      independentCorrect: 1,
      independentSuccessRate: 1,
    });
    expect(summary.application).toMatchObject({
      independentAttempts: 1,
      independentCorrect: 0,
      independentSuccessRate: 0,
    });
    expect(summary.memory).toEqual({
      cardCount: 1,
      dueCount: 1,
      nextDueAt: "2026-09-02T01:00:00.000Z",
    });
    expect(summary.evidenceCoverage).toBe(2);
  });

  it("surfaces repeated failures, assistance dependence, and review debt", () => {
    const evidence: MasteryEvidence[] = [
      makeEvidence({
        evidenceId: "recall-fail-1",
        kind: "recall",
        correct: false,
        independent: true,
      }),
      makeEvidence({
        evidenceId: "recall-fail-2",
        occurredAt: "2026-09-02T01:10:00.000Z",
        kind: "recall",
        correct: false,
        independent: true,
      }),
      makeEvidence({
        evidenceId: "application-fail-1",
        occurredAt: "2026-09-02T01:20:00.000Z",
        kind: "application",
        correct: false,
        independent: true,
      }),
      makeEvidence({
        evidenceId: "application-fail-2",
        occurredAt: "2026-09-02T01:30:00.000Z",
        kind: "application",
        correct: false,
        independent: true,
      }),
      makeEvidence({
        evidenceId: "help-1",
        occurredAt: "2026-09-02T01:40:00.000Z",
        kind: "recall",
        correct: false,
        independent: false,
      }),
      makeEvidence({
        evidenceId: "help-2",
        occurredAt: "2026-09-02T01:50:00.000Z",
        kind: "application",
        correct: false,
        independent: false,
      }),
    ];

    const summary = buildConceptMasterySummary(
      "sql-select",
      evidence,
      [conceptMemory("sql-select", "card-a", "2026-09-01T00:00:00.000Z")],
      "2026-09-02T02:00:00.000Z",
    );

    expect(summary.weaknesses.map((signal) => signal.kind)).toEqual([
      "repeated-recall-failure",
      "assistance-dependence",
      "application-failure",
      "review-debt",
    ]);
  });

  it("aggregates readiness by domain without inventing a pass probability", () => {
    const concepts = [SQL_CONCEPTS[0]!, SQL_CONCEPTS[1]!, C_CONCEPTS[0]!];
    const evidence = [
      makeEvidence({
        evidenceId: "sql-recall",
        conceptId: "sql-table-row-column",
        kind: "recall",
        correct: true,
        independent: true,
      }),
      makeEvidence({
        evidenceId: "sql-application",
        conceptId: "sql-select",
        kind: "application",
        correct: false,
        independent: true,
      }),
      makeEvidence({
        evidenceId: "c-assessment",
        conceptId: "c-value-type",
        kind: "assessment",
        correct: true,
        independent: true,
      }),
    ];
    const memories = [
      conceptMemory(
        "sql-table-row-column",
        "sql-card",
        "2026-09-01T00:00:00.000Z",
      ),
      conceptMemory(
        "c-value-type",
        "c-card",
        "2026-09-03T00:00:00.000Z",
      ),
    ];

    const report = buildReadinessReport(
      concepts,
      evidence,
      memories,
      "2026-09-02T02:00:00.000Z",
    );

    expect(report).toMatchObject({
      conceptCount: 3,
      conceptsWithEvidence: 3,
      evidenceCoverageRate: 1,
      independentRecall: { attempts: 1, correct: 1, rate: 1 },
      independentApplication: { attempts: 1, correct: 0, rate: 0 },
      assessment: { attempts: 1, correct: 1, rate: 1 },
      dueReviewCount: 1,
    });
    expect(report.domains.map((domain) => domain.domainId)).toEqual([
      "sql",
      "programming-language",
    ]);
    expect(report).not.toHaveProperty("passProbability");
    expect(JSON.stringify(report)).not.toContain("passProbability");
  });

  it("ignores evidence from concepts outside the current curriculum", () => {
    const report = buildReadinessReport(
      [SQL_CONCEPTS[0]!],
      [
        makeEvidence({
          evidenceId: "known",
          conceptId: "sql-table-row-column",
          kind: "recall",
          correct: true,
        }),
        makeEvidence({
          evidenceId: "unknown",
          conceptId: "not-in-curriculum",
          kind: "recall",
          correct: false,
        }),
      ],
      [],
      "2026-09-02T02:00:00.000Z",
    );

    expect(report.independentRecall).toEqual({
      attempts: 1,
      correct: 1,
      rate: 1,
    });
  });

  it("returns null rates when there is no evidence instead of guessing", () => {
    const report = buildReadinessReport(
      [SQL_CONCEPTS[0]!],
      [],
      [],
      "2026-09-02T02:00:00.000Z",
    );

    expect(report.evidenceCoverageRate).toBe(0);
    expect(report.independentRecall.rate).toBeNull();
    expect(report.independentApplication.rate).toBeNull();
    expect(report.assessment.rate).toBeNull();
  });
});

function makeEvidence(
  overrides: Partial<MasteryEvidence> = {},
): MasteryEvidence {
  return {
    evidenceId: "evidence-1",
    occurredAt: "2026-09-02T01:00:00.000Z",
    conceptId: "sql-select",
    kind: "understanding",
    correct: true,
    independent: true,
    responseTimeMs: 1000,
    sourceId: "content-1",
    ...overrides,
  };
}

function conceptMemory(
  conceptId: string,
  cardId: string,
  dueAt: string,
): ConceptCardMemory {
  const memory: MemoryState = {
    cardId,
    dueAt,
    stability: 3,
    difficulty: 5,
    fsrsVersion: "fake-v1",
  };
  return { conceptId, memory };
}

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: "event-1",
    occurredAt: "2026-09-02T01:00:00.000Z",
    learnerId: "guest-a",
    contentId: "sql.select.001",
    contentVersion: 1,
    cardId: "card-a",
    correct: true,
    rating: "Good",
    responseTimeMs: 1000,
    helpLevel: 0,
    mode: "recall",
    firstSubmission: true,
    fsrsVersion: "fake-v1",
    ...overrides,
  };
}
