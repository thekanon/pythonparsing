import cArrayIndexRaw from "../content/2026/c/array-index.json";
import cArraySumRaw from "../content/2026/c/array-sum.json";
import cControlFlowLoopRaw from "../content/2026/c/control-flow-loop.json";
import cControlFlowRaw from "../content/2026/c/control-flow.json";
import cOperatorArithmeticRaw from "../content/2026/c/operator-arithmetic.json";
import cOperatorRemainderRaw from "../content/2026/c/operator-remainder.json";
import cPointerArrayStepRaw from "../content/2026/c/pointer-array-step.json";
import cPointerDereferenceRaw from "../content/2026/c/pointer-dereference.json";
import cValueTypeAssignmentRaw from "../content/2026/c/value-type-assignment.json";
import cValueTypeMeaningRaw from "../content/2026/c/value-type-meaning.json";
import sqlEmployeesDatasetRaw from "../content/2026/sql/datasets/employees-v1.json";
import sqlGroupClauseRaw from "../content/2026/sql/group-clause.json";
import sqlGroupCountRaw from "../content/2026/sql/group-count.json";
import sqlJoinConceptRaw from "../content/2026/sql/join-concept.json";
import sqlJoinOrdersCustomersRaw from "../content/2026/sql/join-orders-customers.json";
import sqlSelectBasicsRaw from "../content/2026/sql/select-basics.json";
import sqlSelectColumnsRaw from "../content/2026/sql/select-columns.json";
import sqlTableRowColumnMeaningRaw from "../content/2026/sql/table-row-column-meaning.json";
import sqlTableRowColumnRowRaw from "../content/2026/sql/table-row-column-row.json";
import sqlWhereClauseRaw from "../content/2026/sql/where-clause.json";
import sqlWhereFilterRaw from "../content/2026/sql/where-filter.json";
import {
  contentItemSchema,
  sqlDatasetSchema,
  validateContentItem,
  validateSqlDataset,
  type ContentItem,
  type SqlDataset,
} from "./content-schema";
import { C_CONCEPTS, SQL_CONCEPTS, type ConceptNode } from "./learning-engine";
import type { NewQueueCandidate } from "./today-queue";

export const LEARNING_CONTENT_CODES = [
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

const SQL_DATASETS = [defineSqlDataset(sqlEmployeesDatasetRaw)] as const;
export const SQL_DATASET_CATALOG: ReadonlyMap<string, SqlDataset> = new Map(
  SQL_DATASETS.map((dataset) => [dataset.datasetId, dataset] as const),
);
if (SQL_DATASET_CATALOG.size !== SQL_DATASETS.length) {
  throw new Error("SQL dataset ids must be unique");
}

export const LEARNING_CONTENT_CATALOG: Readonly<
  Record<LearningContentCode, ContentItem>
> = {
  "sql-table-row-column-row": defineCatalogContent(sqlTableRowColumnRowRaw),
  "sql-table-row-column-meaning": defineCatalogContent(
    sqlTableRowColumnMeaningRaw,
  ),
  "sql-select-basics": defineCatalogContent(sqlSelectBasicsRaw),
  "sql-select-columns": defineCatalogContent(sqlSelectColumnsRaw),
  "sql-where-clause": defineCatalogContent(sqlWhereClauseRaw),
  "sql-where-filter": defineCatalogContent(sqlWhereFilterRaw),
  "sql-group-clause": defineCatalogContent(sqlGroupClauseRaw),
  "sql-group-count": defineCatalogContent(sqlGroupCountRaw),
  "sql-join-concept": defineCatalogContent(sqlJoinConceptRaw),
  "sql-join-orders-customers": defineCatalogContent(sqlJoinOrdersCustomersRaw),
  "c-value-type-meaning": defineCatalogContent(cValueTypeMeaningRaw),
  "c-value-type-assignment": defineCatalogContent(cValueTypeAssignmentRaw),
  "c-operator-arithmetic": defineCatalogContent(cOperatorArithmeticRaw),
  "c-operator-remainder": defineCatalogContent(cOperatorRemainderRaw),
  "c-control-flow": defineCatalogContent(cControlFlowRaw),
  "c-control-flow-loop": defineCatalogContent(cControlFlowLoopRaw),
  "c-array-index": defineCatalogContent(cArrayIndexRaw),
  "c-array-sum": defineCatalogContent(cArraySumRaw),
  "c-pointer-dereference": defineCatalogContent(cPointerDereferenceRaw),
  "c-pointer-array-step": defineCatalogContent(cPointerArrayStepRaw),
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
  if (item.datasetId && !SQL_DATASET_CATALOG.has(item.datasetId)) {
    errors.push(`${item.id}: unknown SQL dataset ${item.datasetId}`);
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

function defineSqlDataset(value: unknown): SqlDataset {
  const errors = validateSqlDataset(value);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  return sqlDatasetSchema.parse(value);
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
