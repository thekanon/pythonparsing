import { describe, expect, it } from "vitest";

import {
  LEARNING_CONTENT_CATALOG,
  LEARNING_CONTENT_CODES,
  buildRegularLearningNewQueueCandidates,
  getLearningContent,
  listLearningContent,
  listReviewedLearningContent,
  validateCatalogContentItem,
} from "./content-catalog";
import { validateContentItem, type ContentItem } from "./content-schema";
import { buildTodayQueue } from "./today-queue";

describe("exam coach learning content catalog", () => {
  it("catalogs the checked-in SQL and C samples by code and validates their learning contracts", () => {
    expect(Object.keys(LEARNING_CONTENT_CATALOG)).toEqual([
      "sql-select-basics",
      "c-control-flow",
    ]);
    expect(listLearningContent()).toHaveLength(2);

    for (const code of LEARNING_CONTENT_CODES) {
      const item = getLearningContent(code);
      expect(validateCatalogContentItem(item)).toEqual([]);
      expect(item.explanation.length).toBeGreaterThan(0);
      expect(item.hints).toBeDefined();
      expect(item.grading.strategy).toBe("exact");
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
    const wrongPrerequisite = { ...sql, prerequisites: [] };
    const wrongDomain = { ...sql, domainId: "programming-language" as const };

    expect(validateCatalogContentItem(wrongPrerequisite)).toContain(
      "sql.select.001: prerequisites must match concept graph (sql-table-row-column)",
    );
    expect(validateCatalogContentItem(wrongDomain)).toContain(
      "sql.select.001: concept sql-select belongs to sql, not programming-language",
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

  it("constructs regular new-queue candidates only from reviewed catalog content", () => {
    const candidates = buildRegularLearningNewQueueCandidates();

    expect(candidates.map((candidate) => candidate.cardId)).toEqual([
      "sql.select.001",
      "c.control-flow.001",
    ]);
    expect(candidates).toEqual([
      expect.objectContaining({
        cardId: "sql.select.001",
        conceptId: "sql-select",
        prerequisites: ["sql-table-row-column"],
      }),
      expect.objectContaining({
        cardId: "c.control-flow.001",
        conceptId: "c-control-flow",
        prerequisites: ["c-operator"],
      }),
    ]);
  });
});

function asDraft(item: ContentItem): ContentItem {
  const draft: ContentItem = { ...item, reviewStatus: "draft" };
  delete draft.review;
  return draft;
}
