import { describe, expect, it } from "vitest";

import { LEARNING_CONTENT_CATALOG } from "./content-catalog";
import type { ContentItem } from "./content-schema";
import { BASELINE_DIAGNOSTIC } from "./diagnostic-sets";
import type {
  FsrsAdapter,
  LearningEvent,
  MemoryState,
} from "./learning-engine";
import type { FsrsAdapterResolver } from "./memory-replay";
import {
  buildWeaknessBoard,
  type ConceptWeaknessEntry,
  type WeaknessBoard,
} from "./weakness";

const NOW = "2026-09-04T00:00:00.000Z";
const sqlSample = LEARNING_CONTENT_CATALOG["sql-select-basics"];
const prerequisiteSample = makePrerequisiteSample(sqlSample);

describe("exam coach weakness board", () => {
  it("keeps all ten concepts unmeasured and signal-free when there are no events", () => {
    const board = buildWeaknessBoard({
      events: [],
      now: NOW,
      resolveAdapter: unexpectedResolver,
    });

    expect(board).toMatchObject({
      generatedAt: NOW,
      conceptCount: 10,
      conceptsWithEvidence: 0,
    });
    expect(board.entries).toHaveLength(10);
    expect(board.entries.every((entry) => !entry.hasEvidence)).toBe(true);
    expect(board.entries.every((entry) => entry.signals.length === 0)).toBe(
      true,
    );
  });

  it("emits repeated recall failure only after two independent failures", () => {
    const firstFailure = learningEvent(sqlSample, {
      eventId: "recall-fail-1",
      occurredAt: "2026-09-01T00:00:00.000Z",
      correct: false,
      rating: "Again",
    });
    const secondFailure = learningEvent(sqlSample, {
      eventId: "recall-fail-2",
      occurredAt: "2026-09-02T00:00:00.000Z",
      correct: false,
      rating: "Again",
    });

    const once = buildWeaknessBoard({
      events: [firstFailure],
      now: NOW,
      content: [sqlSample],
      resolveAdapter: resolverWithDueOffset(10),
    });
    const twice = buildWeaknessBoard({
      events: [firstFailure, secondFailure],
      now: NOW,
      content: [sqlSample],
      resolveAdapter: resolverWithDueOffset(10),
    });

    expect(signal(entry(once, "sql-select"), "repeated-recall-failure")).toBe(
      undefined,
    );
    expect(
      signal(entry(twice, "sql-select"), "repeated-recall-failure"),
    ).toEqual({
      kind: "repeated-recall-failure",
      count: 2,
      latestAt: "2026-09-02T00:00:00.000Z",
    });
  });

  it("counts assistance dependence only from first-submission regular events with helpLevel > 0, not corrections", () => {
    const assistedFirstSubmissions = [
      learningEvent(sqlSample, {
        eventId: "help-first-1",
        occurredAt: "2026-09-01T00:00:00.000Z",
        correct: false,
        rating: "Again",
        helpLevel: 1,
      }),
      learningEvent(sqlSample, {
        eventId: "help-first-2",
        occurredAt: "2026-09-02T00:00:00.000Z",
        correct: false,
        rating: "Again",
        helpLevel: 2,
      }),
    ];
    const correctionOnly = [
      learningEvent(sqlSample, {
        eventId: "help-correction-1",
        occurredAt: "2026-09-01T00:00:00.000Z",
        correct: false,
        rating: "Again",
        helpLevel: 2,
        firstSubmission: false,
      }),
      learningEvent(sqlSample, {
        eventId: "help-correction-2",
        occurredAt: "2026-09-02T00:00:00.000Z",
        correct: false,
        rating: "Again",
        helpLevel: 3,
        firstSubmission: false,
      }),
    ];

    const assisted = buildWeaknessBoard({
      events: assistedFirstSubmissions,
      now: NOW,
      content: [sqlSample],
      resolveAdapter: resolverWithDueOffset(10),
    });
    const corrected = buildWeaknessBoard({
      events: correctionOnly,
      now: NOW,
      content: [sqlSample],
      resolveAdapter: resolverWithDueOffset(10),
    });

    expect(
      signal(entry(assisted, "sql-select"), "assistance-dependence"),
    ).toEqual({
      kind: "assistance-dependence",
      count: 2,
      latestAt: "2026-09-02T00:00:00.000Z",
    });
    expect(
      signal(entry(corrected, "sql-select"), "assistance-dependence"),
    ).toBeUndefined();
  });

  it("emits review debt with the matching due card ids", () => {
    const board = buildWeaknessBoard({
      events: [
        learningEvent(sqlSample, {
          eventId: "due-card",
          occurredAt: "2026-09-01T00:00:00.000Z",
        }),
      ],
      now: NOW,
      content: [sqlSample],
      resolveAdapter: resolverWithDueOffset(0),
    });
    const sqlSelect = entry(board, "sql-select");

    expect(sqlSelect.dueCardIds).toEqual([sqlSample.id]);
    expect(signal(sqlSelect, "review-debt")).toEqual({
      kind: "review-debt",
      count: 1,
      latestAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("does not resolve adapters or create review debt from assessment-only events", () => {
    const diagnosticItem = BASELINE_DIAGNOSTIC.items[0]!;
    let resolveCalls = 0;
    const resolveAdapter: FsrsAdapterResolver = () => {
      resolveCalls += 1;
      throw new Error("assessment events must not resolve FSRS adapters");
    };

    const board = buildWeaknessBoard({
      events: [
        learningEvent(diagnosticItem, {
          eventId: "assessment-only",
          cardId: sqlSample.id,
          mode: "assessment",
          fsrsVersion: "pending-adapter",
        }),
      ],
      now: NOW,
      content: [sqlSample],
      resolveAdapter,
    });

    expect(resolveCalls).toBe(0);
    expect(
      board.entries.some((item) => signal(item, "review-debt") !== undefined),
    ).toBe(false);
    expect(entry(board, "sql-select").hasEvidence).toBe(true);
  });

  it("excludes regular evidence whose content version does not match the catalog", () => {
    const board = buildWeaknessBoard({
      events: [
        learningEvent(sqlSample, {
          eventId: "stale-content",
          contentVersion: sqlSample.version + 1,
          correct: false,
          rating: "Again",
        }),
      ],
      now: NOW,
      content: [sqlSample],
      resolveAdapter: resolverWithDueOffset(10),
    });
    const sqlSelect = entry(board, "sql-select");

    expect(sqlSelect.hasEvidence).toBe(false);
    expect(sqlSelect.latestEvidenceAt).toBeNull();
    expect(sqlSelect.signals).toEqual([]);
  });

  it("maps one current learning event to every concept on multi-concept content", () => {
    const multiConcept = makeMultiConceptSample(sqlSample);
    const board = buildWeaknessBoard({
      events: [
        learningEvent(multiConcept, {
          eventId: "multi-concept",
          correct: false,
          rating: "Again",
        }),
      ],
      now: NOW,
      content: [multiConcept],
      resolveAdapter: resolverWithDueOffset(10),
    });

    expect(entry(board, "sql-table-row-column")).toMatchObject({
      hasEvidence: true,
      latestEvidenceAt: "2026-09-03T00:00:00.000Z",
    });
    expect(entry(board, "sql-select")).toMatchObject({
      hasEvidence: true,
      latestEvidenceAt: "2026-09-03T00:00:00.000Z",
    });
  });

  it("removes a prerequisite gap after the prerequisite is mastered", () => {
    const before = buildWeaknessBoard({
      events: [],
      now: NOW,
      content: [prerequisiteSample, sqlSample],
      resolveAdapter: unexpectedResolver,
    });
    const after = buildWeaknessBoard({
      events: [
        learningEvent(prerequisiteSample, {
          eventId: "master-prerequisite",
          correct: true,
          rating: "Good",
        }),
      ],
      now: NOW,
      content: [prerequisiteSample, sqlSample],
      resolveAdapter: resolverWithDueOffset(10),
    });

    expect(entry(before, "sql-select").prerequisiteGapConceptIds).toEqual([
      "sql-table-row-column",
    ]);
    expect(entry(after, "sql-select").prerequisiteGapConceptIds).toEqual([]);
  });
});

function entry(board: WeaknessBoard, conceptId: string): ConceptWeaknessEntry {
  const value = board.entries.find((item) => item.conceptId === conceptId);
  if (!value) throw new Error(`missing weakness entry for ${conceptId}`);
  return value;
}

function signal(
  weaknessEntry: ConceptWeaknessEntry,
  kind: ConceptWeaknessEntry["signals"][number]["kind"],
): ConceptWeaknessEntry["signals"][number] | undefined {
  return weaknessEntry.signals.find((item) => item.kind === kind);
}

function resolverWithDueOffset(days: number): FsrsAdapterResolver {
  return (version: string, cardId: string): FsrsAdapter => ({
    version,
    desiredRetention: 0.9,
    review(_previous, input): MemoryState {
      return {
        cardId,
        dueAt: new Date(
          Date.parse(input.reviewedAt) + days * 86_400_000,
        ).toISOString(),
        stability: 2,
        difficulty: 5,
        fsrsVersion: version,
      };
    },
  });
}

function unexpectedResolver(): FsrsAdapter {
  throw new Error("adapter resolution was not expected");
}

function learningEvent(
  item: ContentItem,
  overrides: Partial<LearningEvent> & Pick<LearningEvent, "eventId">,
): LearningEvent {
  const correct = overrides.correct ?? true;
  const helpLevel = overrides.helpLevel ?? 0;
  const rating: LearningEvent["rating"] =
    overrides.rating ?? (!correct || helpLevel > 0 ? "Again" : "Good");

  return {
    eventId: overrides.eventId,
    occurredAt: overrides.occurredAt ?? "2026-09-03T00:00:00.000Z",
    learnerId: "guest-test",
    contentId: overrides.contentId ?? item.id,
    contentVersion: overrides.contentVersion ?? item.version,
    cardId: overrides.cardId ?? item.id,
    correct,
    rating,
    responseTimeMs: overrides.responseTimeMs ?? 1000,
    helpLevel,
    mode: overrides.mode ?? "recall",
    firstSubmission: overrides.firstSubmission ?? true,
    fsrsVersion: overrides.fsrsVersion ?? "fake-v1",
  };
}

function makePrerequisiteSample(base: ContentItem): ContentItem {
  return {
    ...base,
    id: "sql.table-row-column.001",
    conceptIds: ["sql-table-row-column"],
    prerequisites: [],
    objective: "테이블·행·열의 역할을 구분한다.",
    prompt: "테이블의 한 가로 묶음을 무엇이라 하는가?",
    answer: "행",
    explanation: "행은 한 레코드에 해당한다.",
    grading: { strategy: "exact", acceptedAnswers: ["행"] },
    estimatedMinutes: 5,
  };
}

function makeMultiConceptSample(base: ContentItem): ContentItem {
  return {
    ...base,
    id: "sql.multi-concept.001",
    conceptIds: ["sql-table-row-column", "sql-select"],
    prerequisites: ["sql-table-row-column"],
    objective: "테이블 구조와 SELECT를 함께 확인한다.",
  };
}
