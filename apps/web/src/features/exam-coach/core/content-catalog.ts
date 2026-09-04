import cControlFlowRaw from "../content/2026/c/control-flow.json";
import sqlSelectBasicsRaw from "../content/2026/sql/select-basics.json";
import {
  contentItemSchema,
  validateContentItem,
  type ContentItem,
} from "./content-schema";
import { C_CONCEPTS, SQL_CONCEPTS, type ConceptNode } from "./learning-engine";
import type { NewQueueCandidate } from "./today-queue";

export const LEARNING_CONTENT_CODES = [
  "sql-select-basics",
  "c-control-flow",
] as const;

export type LearningContentCode = (typeof LEARNING_CONTENT_CODES)[number];

const LEARNING_CONCEPTS: readonly ConceptNode[] = [
  ...SQL_CONCEPTS,
  ...C_CONCEPTS,
];
const CONCEPT_BY_ID = new Map(
  LEARNING_CONCEPTS.map((concept) => [concept.id, concept] as const),
);
const CURRICULUM_ORDER_BY_CONCEPT_ID = new Map(
  LEARNING_CONCEPTS.map((concept, index) => [concept.id, index + 1] as const),
);
const DEFAULT_NEW_CONTENT_IMPORTANCE = 3 as const;

export const LEARNING_CONTENT_CATALOG: Readonly<
  Record<LearningContentCode, ContentItem>
> = {
  "sql-select-basics": defineCatalogContent(sqlSelectBasicsRaw),
  "c-control-flow": defineCatalogContent(cControlFlowRaw),
};

export function getLearningContent(code: LearningContentCode): ContentItem {
  return LEARNING_CONTENT_CATALOG[code];
}

export function listLearningContent(): readonly ContentItem[] {
  return LEARNING_CONTENT_CODES.map((code) => LEARNING_CONTENT_CATALOG[code]);
}

export function validateCatalogContentItem(value: unknown): string[] {
  const schemaErrors = validateContentItem(value);
  const parsed = contentItemSchema.safeParse(value);
  if (!parsed.success) return schemaErrors;

  const item = parsed.data;
  const errors = [...schemaErrors];

  if (item.officialYear !== 2026) {
    errors.push("catalog content must use the 2026 official scope");
  }
  if (item.knowledgeType === "assessment") {
    errors.push("regular learning catalog must not contain assessment content");
  }
  if (!item.hints) {
    errors.push("regular learning catalog content requires progressive hints");
  }

  if (new Set(item.conceptIds).size !== item.conceptIds.length) {
    errors.push("conceptIds must be unique");
  }
  if (new Set(item.prerequisites).size !== item.prerequisites.length) {
    errors.push("prerequisites must be unique");
  }

  const concepts = item.conceptIds
    .map((conceptId) => CONCEPT_BY_ID.get(conceptId))
    .filter((concept): concept is ConceptNode => Boolean(concept));

  for (const conceptId of item.conceptIds) {
    if (!CONCEPT_BY_ID.has(conceptId)) {
      errors.push(`${item.id}: unknown concept ${conceptId}`);
    }
  }
  for (const concept of concepts) {
    if (concept.domainId !== item.domainId) {
      errors.push(
        `${item.id}: concept ${concept.id} belongs to ${concept.domainId}, not ${item.domainId}`,
      );
    }
  }

  const expectedPrerequisites = uniqueSorted(
    concepts.flatMap((concept) => concept.prerequisites),
  );
  const actualPrerequisites = uniqueSorted(item.prerequisites);
  if (!sameStringArray(expectedPrerequisites, actualPrerequisites)) {
    errors.push(
      `${item.id}: prerequisites must match concept graph (${expectedPrerequisites.join(", ") || "none"})`,
    );
  }

  return [...new Set(errors)];
}

export function listReviewedLearningContent(
  content: readonly ContentItem[] = listLearningContent(),
): readonly ContentItem[] {
  return content.filter((item) => {
    assertCatalogContent(item);
    return item.reviewStatus === "reviewed";
  });
}

export function buildRegularLearningNewQueueCandidates(
  content: readonly ContentItem[] = listLearningContent(),
): readonly NewQueueCandidate[] {
  return listReviewedLearningContent(content).map((item) => {
    const [conceptId] = item.conceptIds;
    if (!conceptId) {
      throw new Error(`${item.id}: at least one concept is required`);
    }
    const curriculumOrder = CURRICULUM_ORDER_BY_CONCEPT_ID.get(conceptId);
    if (!curriculumOrder) {
      throw new Error(
        `${item.id}: no curriculum order for concept ${conceptId}`,
      );
    }

    return {
      cardId: item.id,
      conceptId,
      prerequisites: item.prerequisites,
      estimatedMinutes: item.estimatedMinutes,
      importance: DEFAULT_NEW_CONTENT_IMPORTANCE,
      curriculumOrder,
    };
  });
}

function defineCatalogContent(value: unknown): ContentItem {
  const parsed = contentItemSchema.parse(value);
  assertCatalogContent(parsed);
  return parsed;
}

function assertCatalogContent(value: unknown): asserts value is ContentItem {
  const errors = validateCatalogContentItem(value);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
