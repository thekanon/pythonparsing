import { describe, expect, it } from "vitest";

import committedSchema from "../content/schema/content-item.schema.json";
import { LEARNING_CONTENT_CATALOG } from "./content-catalog";
import {
  approveContent,
  createContentRevision,
  getContentItemJsonSchema,
  validateContentItem,
} from "./content-schema";
import { BASELINE_DIAGNOSTIC, FOLLOWUP_DIAGNOSTIC } from "./diagnostic-sets";
import {
  validateDiagnosticAssessmentSet,
  validateIsomorphicAssessmentSets,
} from "./diagnostics";
import {
  appendLearningEvent,
  C_CONCEPTS,
  DEFAULT_DESIRED_RETENTION,
  SQL_CONCEPTS,
  toFsrsReviewInput,
  validateConceptGraph,
} from "./learning-engine";
import {
  OFFICIAL_OBJECTIVES_2026,
  OFFICIAL_SCOPE_SOURCE_2026,
} from "./official-scope";
import type { LearningEvent } from "./learning-engine";

interface JsonSchemaShape {
  $schema?: string;
  required?: string[];
  properties?: Record<string, unknown>;
}

function enumValues(value: unknown): unknown[] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as { enum?: unknown }).enum;
  return Array.isArray(candidate) ? candidate : undefined;
}

const sqlSample = LEARNING_CONTENT_CATALOG["sql-select-basics"];
const cSample = LEARNING_CONTENT_CATALOG["c-control-flow"];

describe("information-processing practical coach core", () => {
  it("pins all 12 official 2026 domains to the checked Q-Net source", () => {
    expect(OFFICIAL_OBJECTIVES_2026).toHaveLength(12);
    expect(OFFICIAL_SCOPE_SOURCE_2026.validFrom).toBe("2026-01-01");
    expect(OFFICIAL_SCOPE_SOURCE_2026.validTo).toBe("2026-12-31");
    expect(
      OFFICIAL_OBJECTIVES_2026.every(
        (objective) =>
          objective.sourceId === OFFICIAL_SCOPE_SOURCE_2026.id &&
          objective.detailTopics.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps checked-in SQL and C content structurally valid", () => {
    expect(validateContentItem(sqlSample)).toEqual([]);
    expect(validateContentItem(cSample)).toEqual([]);
  });

  it("keeps the committed JSON Schema aligned with the Zod structure", () => {
    const generated = getContentItemJsonSchema() as JsonSchemaShape;
    const committed = committedSchema as JsonSchemaShape;

    expect(committed.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(committed.required).toEqual(generated.required);
    expect(Object.keys(committed.properties ?? {}).sort()).toEqual(
      Object.keys(generated.properties ?? {}).sort(),
    );

    for (const property of [
      "domainId",
      "knowledgeType",
      "reviewStatus",
      "memoryInheritance",
    ]) {
      expect(enumValues(committed.properties?.[property])).toEqual(
        enumValues(generated.properties?.[property]),
      );
    }

    expect(committedSchema.allOf).toHaveLength(2);
    expect(committedSchema.$defs.grading.allOf).toHaveLength(3);
  });

  it("rejects self-review and approves only a different reviewer", () => {
    expect(() =>
      approveContent(sqlSample, "doo-study", "2026-09-02T01:00:00+09:00"),
    ).toThrow(/different from author/);

    const approved = approveContent(
      sqlSample,
      "reviewer-a",
      "2026-09-02T01:00:00+09:00",
    );

    expect(approved.reviewStatus).toBe("reviewed");
    expect(approved.review?.reviewer).toBe("reviewer-a");
    expect(approved.review?.reviewedVersion).toBe(approved.version);
    expect(Object.values(approved.review?.checklist ?? {})).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(validateContentItem(approved)).toEqual([]);
  });

  it("rejects stale review metadata after a content version changes", () => {
    const approved = approveContent(
      sqlSample,
      "reviewer-a",
      "2026-09-02T01:00:00+09:00",
    );
    const stale = { ...approved, version: approved.version + 1 };

    expect(validateContentItem(stale)).toContain(
      "reviewedVersion must match content version",
    );
  });

  it("resets review approval when a new content revision is created", () => {
    const approved = approveContent(
      sqlSample,
      "reviewer-a",
      "2026-09-02T01:00:00+09:00",
    );
    const revision = createContentRevision(approved, "허용 답안 범위 수정");

    expect(revision.version).toBe(approved.version + 1);
    expect(revision.reviewStatus).toBe("draft");
    expect("review" in revision).toBe(false);
    expect(revision.memoryInheritance).toBe("undecided");
    expect(validateContentItem(revision)).toEqual([]);
  });

  it("keeps the SQL and C prerequisite graphs valid", () => {
    expect(validateConceptGraph(SQL_CONCEPTS)).toEqual([]);
    expect(validateConceptGraph(C_CONCEPTS)).toEqual([]);
  });

  it("keeps the baseline and follow-up diagnostics isomorphic", () => {
    expect(validateDiagnosticAssessmentSet(BASELINE_DIAGNOSTIC)).toEqual([]);
    expect(validateDiagnosticAssessmentSet(FOLLOWUP_DIAGNOSTIC)).toEqual([]);
    expect(
      validateIsomorphicAssessmentSets(
        BASELINE_DIAGNOSTIC,
        FOLLOWUP_DIAGNOSTIC,
      ),
    ).toEqual([]);
    expect(BASELINE_DIAGNOSTIC.items).toHaveLength(6);
    expect(FOLLOWUP_DIAGNOSTIC.items).toHaveLength(6);
  });

  it("stores learning events idempotently and forces failures to Again", () => {
    const event = makeEvent();
    const once = appendLearningEvent([], event);
    const twice = appendLearningEvent(once, event);

    expect(once).toHaveLength(1);
    expect(twice).toBe(once);
    expect(() =>
      appendLearningEvent([], makeEvent({ correct: false, rating: "Good" })),
    ).toThrow(/rated Again/);
    expect(() =>
      appendLearningEvent([], makeEvent({ helpLevel: 1, rating: "Good" })),
    ).toThrow(/rated Again/);
  });

  it("uses 90% desired retention and only schedules the first submission", () => {
    expect(DEFAULT_DESIRED_RETENTION).toBe(0.9);
    expect(toFsrsReviewInput(makeEvent())).toEqual({
      reviewedAt: "2026-09-02T00:00:00.000Z",
      rating: "Good",
    });
    expect(() =>
      toFsrsReviewInput(makeEvent({ firstSubmission: false })),
    ).toThrow(/first submission/);
  });
});

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: "event-1",
    occurredAt: "2026-09-02T00:00:00.000Z",
    learnerId: "guest-1",
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
