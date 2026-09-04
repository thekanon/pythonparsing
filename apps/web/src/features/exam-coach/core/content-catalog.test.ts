import { describe, expect, it } from "vitest";

import {
  LEARNING_CONTENT_CATALOG,
  LEARNING_CONTENT_CODES,
  SQL_DATASET_CATALOG,
  buildRegularLearningNewQueueCandidates,
  getLearningContent,
  listLearningContent,
  listReviewedLearningContent,
  validateCatalogContentItem,
} from "./content-catalog";
import { validateContentItem, type ContentItem } from "./content-schema";
import { gradeContentResponse } from "./grading";
import { C_CONCEPTS, SQL_CONCEPTS } from "./learning-engine";
import { buildTodayQueue } from "./today-queue";

describe("exam coach learning content catalog", () => {
  it("catalogs the checked-in SQL and C content by code and validates their learning contracts", () => {
    expect(Object.keys(LEARNING_CONTENT_CATALOG)).toEqual([
      "sql-table-row-column-row",
      "sql-table-row-column-meaning",
      "sql-select-basics",
      "sql-select-columns",
      "sql-where-clause",
      "sql-where-filter",
      "sql-group-clause",
      "sql-group-count",
      "sql-join-concept",
      "sql-join-orders-customers",
      "c-value-type-meaning",
      "c-value-type-assignment",
      "c-operator-arithmetic",
      "c-operator-remainder",
      "c-control-flow",
      "c-control-flow-loop",
      "c-array-index",
      "c-array-sum",
      "c-pointer-dereference",
      "c-pointer-array-step",
    ]);
    expect(listLearningContent()).toHaveLength(20);

    for (const code of LEARNING_CONTENT_CODES) {
      const item = getLearningContent(code);
      expect(validateCatalogContentItem(item)).toEqual([]);
      expect(item.explanation.length).toBeGreaterThan(0);
      expect(item.hints).toBeDefined();
      expect(["exact", "keywords", "sql"]).toContain(item.grading.strategy);
    }
  });

  it("keeps at least two reviewed regular learning items for every SQL concept", () => {
    const reviewedSql = listReviewedLearningContent().filter(
      (item) => item.domainId === "sql",
    );

    expect(reviewedSql).toHaveLength(10);
    expect(new Set(reviewedSql.map((item) => item.grading.strategy))).toEqual(
      new Set(["exact", "keywords", "sql"]),
    );

    for (const concept of SQL_CONCEPTS) {
      const conceptItems = reviewedSql.filter((item) =>
        item.conceptIds.includes(concept.id),
      );
      expect(conceptItems.length, concept.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("grades every reviewed SQL canonical answer as correct", () => {
    const reviewedSql = listReviewedLearningContent().filter(
      (item) => item.domainId === "sql",
    );

    for (const item of reviewedSql) {
      expect(gradeContentResponse(item, item.answer).correct, item.id).toBe(
        true,
      );
    }
  });

  it("keeps at least two reviewed regular learning items for every C concept", () => {
    const reviewedC = listReviewedLearningContent().filter(
      (item) => item.domainId === "programming-language",
    );

    expect(reviewedC).toHaveLength(10);
    expect(new Set(reviewedC.map((item) => item.grading.strategy))).toEqual(
      new Set(["exact", "keywords"]),
    );

    for (const concept of C_CONCEPTS) {
      const conceptItems = reviewedC.filter((item) =>
        item.conceptIds.includes(concept.id),
      );
      expect(conceptItems.length, concept.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("grades every reviewed C canonical answer as correct", () => {
    const reviewedC = listReviewedLearningContent().filter(
      (item) => item.domainId === "programming-language",
    );

    for (const item of reviewedC) {
      expect(gradeContentResponse(item, item.answer).correct, item.id).toBe(
        true,
      );
    }
  });

  it("keeps reviewed samples tied to a different reviewer and their exact content version", () => {
    for (const item of listLearningContent()) {
      expect(item.reviewStatus).toBe("reviewed");
      expect(item.review).toBeDefined();
      expect(item.review?.reviewer).not.toBe(item.author);
      expect(item.review?.reviewedVersion).toBe(item.version);
      expect(Object.values(item.review?.checklist ?? {})).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(validateContentItem(item)).toEqual([]);
    }
  });

  it("rejects catalog metadata that drifts from the official concept graph", () => {
    const sql = getLearningContent("sql-select-basics");
    const cPointer = getLearningContent("c-pointer-dereference");
    const wrongPrerequisite = { ...sql, prerequisites: [] };
    const wrongCPrerequisite = {
      ...cPointer,
      prerequisites: ["c-control-flow"],
    };
    const wrongDomain = { ...sql, domainId: "programming-language" as const };

    expect(validateCatalogContentItem(wrongPrerequisite)).toContain(
      "sql.select.001: prerequisites must match concept graph (sql-table-row-column)",
    );
    expect(validateCatalogContentItem(wrongCPrerequisite)).toContain(
      "c.pointer.001: prerequisites must match concept graph (c-array)",
    );
    expect(validateCatalogContentItem(wrongDomain)).toContain(
      "sql.select.001: concept sql-select belongs to sql, not programming-language",
    );
  });

  it("resolves checked-in SQL datasets and rejects unknown dataset references", () => {
    const resultPrediction = getLearningContent("sql-where-filter");

    expect(resultPrediction.datasetId).toBe("sql-employees-v1");
    expect(resultPrediction.grading.expectedResult).toEqual({
      columns: ["name"],
      rows: [["김민수"], ["박지훈"]],
      ordered: false,
    });
    expect(SQL_DATASET_CATALOG.get("sql-employees-v1")?.tables[0]?.name).toBe(
      "employees",
    );

    const unknownDataset = {
      ...resultPrediction,
      datasetId: "sql-missing-v1",
    };
    expect(validateCatalogContentItem(unknownDataset)).toContain(
      "sql.where.002: unknown SQL dataset sql-missing-v1",
    );
  });

  it("keeps draft content schema-valid but excludes it from regular learning and today's queue", () => {
    const draft = asDraft(getLearningContent("sql-select-basics"));

    expect("review" in draft).toBe(false);
    expect(validateContentItem(draft)).toEqual([]);
    expect(validateCatalogContentItem(draft)).toEqual([]);
    expect(listReviewedLearningContent([draft])).toEqual([]);

    const newCandidates = buildRegularLearningNewQueueCandidates([draft]);
    expect(newCandidates).toEqual([]);

    const queue = buildTodayQueue({
      now: "2026-09-04T05:28:00.000Z",
      timeBudgetMinutes: 15,
      reviewCandidates: [],
      newCandidates,
      masteredConceptIds: ["sql-table-row-column"],
    });

    expect(queue.items).toEqual([]);
  });

  it("includes reviewed C content but excludes draft C content from regular new-queue candidates", () => {
    const reviewedC = getLearningContent("c-value-type-meaning");
    const draftC = asDraft(getLearningContent("c-value-type-assignment"));
    const candidates = buildRegularLearningNewQueueCandidates([
      reviewedC,
      draftC,
    ]);

    expect(candidates.map((candidate) => candidate.cardId)).toEqual([
      reviewedC.id,
    ]);
    expect(candidates.some((candidate) => candidate.cardId === draftC.id)).toBe(
      false,
    );
  });

  it("constructs regular new-queue candidates from every reviewed catalog item", () => {
    const candidates = buildRegularLearningNewQueueCandidates();

    expect(candidates.map((candidate) => candidate.cardId)).toEqual(
      listReviewedLearningContent().map((item) => item.id),
    );
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: "sql.table-row-column.001",
          conceptId: "sql-table-row-column",
          prerequisites: [],
        }),
        expect.objectContaining({
          cardId: "sql.select.002",
          conceptId: "sql-select",
          prerequisites: ["sql-table-row-column"],
        }),
        expect.objectContaining({
          cardId: "sql.where.002",
          conceptId: "sql-where",
          prerequisites: ["sql-select"],
        }),
        expect.objectContaining({
          cardId: "sql.group.002",
          conceptId: "sql-group",
          prerequisites: ["sql-where"],
        }),
        expect.objectContaining({
          cardId: "sql.join.002",
          conceptId: "sql-join",
          prerequisites: ["sql-select"],
        }),
        expect.objectContaining({
          cardId: "c.control-flow.001",
          conceptId: "c-control-flow",
          prerequisites: ["c-operator"],
        }),
      ]),
    );
  });
});

function asDraft(item: ContentItem): ContentItem {
  const draft: ContentItem = { ...item, reviewStatus: "draft" };
  delete draft.review;
  return draft;
}
