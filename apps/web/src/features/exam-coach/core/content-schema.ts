import { z } from "zod";

export const OFFICIAL_DOMAIN_IDS = [
  "requirements",
  "data-io",
  "integration",
  "server-programming",
  "interface",
  "screen-design",
  "application-testing",
  "sql",
  "software-security",
  "programming-language",
  "sw-foundation",
  "product-packaging",
] as const;

export const KNOWLEDGE_TYPES = [
  "definition",
  "comparison",
  "procedure",
  "code",
  "sql",
  "case",
  "assessment",
] as const;

export const REVIEW_STATUSES = [
  "draft",
  "reviewed",
  "suspended",
  "retired",
] as const;

export const MEMORY_INHERITANCE_VALUES = [
  "inherit",
  "reset",
  "undecided",
] as const;

export type OfficialDomainId = (typeof OFFICIAL_DOMAIN_IDS)[number];
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type MemoryInheritance = (typeof MEMORY_INHERITANCE_VALUES)[number];

const nonEmptyString = z.string().trim().min(1);
const nonEmptyStringArray = z.array(nonEmptyString).min(1);

export const sqlResultCellSchema = z.union([
  z.string(),
  z.number().int(),
  z.null(),
]);

export const sqlExpectedResultSchema = z
  .object({
    columns: nonEmptyStringArray,
    rows: z.array(z.array(sqlResultCellSchema)),
    ordered: z.boolean(),
  })
  .strict();

export const sqlDatasetSchema = z
  .object({
    datasetId: nonEmptyString,
    description: nonEmptyString,
    tables: z
      .array(
        z
          .object({
            name: nonEmptyString,
            columns: z
              .array(
                z
                  .object({
                    name: nonEmptyString,
                    type: z.enum(["integer", "text"]),
                  })
                  .strict(),
              )
              .min(1),
            rows: z.array(z.array(sqlResultCellSchema)),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type SqlResultCell = z.infer<typeof sqlResultCellSchema>;
export type SqlExpectedResult = z.infer<typeof sqlExpectedResultSchema>;
export type SqlDataset = z.infer<typeof sqlDatasetSchema>;

export const reviewChecklistSchema = z
  .object({
    answer: z.literal(true),
    explanation: z.literal(true),
    scope: z.literal(true),
    acceptedAnswers: z.literal(true),
    difficulty: z.literal(true),
  })
  .strict();

export const contentReviewSchema = z
  .object({
    reviewer: nonEmptyString,
    reviewedAt: nonEmptyString,
    reviewedVersion: z.number().int().positive(),
    checklist: reviewChecklistSchema,
  })
  .strict();

export const gradingSchema = z
  .object({
    strategy: z.enum(["exact", "keywords", "sql"]),
    acceptedAnswers: nonEmptyStringArray.optional(),
    requiredKeywords: nonEmptyStringArray.optional(),
    requiredSqlClauses: nonEmptyStringArray.optional(),
    forbiddenSqlTokens: nonEmptyStringArray.optional(),
    expectedResult: sqlExpectedResultSchema.optional(),
  })
  .strict();

export const assessmentMetadataSchema = z
  .object({
    setId: nonEmptyString,
    pairId: nonEmptyString,
    form: z.enum(["baseline", "followup"]),
  })
  .strict();

export const progressiveHintsSchema = z
  .object({
    conceptClue: nonEmptyString,
    structureHint: nonEmptyString,
    specificHint: nonEmptyString,
  })
  .strict();

export const contentItemSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: nonEmptyString,
    version: z.number().int().positive(),
    officialYear: z.number().int().positive(),
    domainId: z.enum(OFFICIAL_DOMAIN_IDS),
    conceptIds: nonEmptyStringArray,
    prerequisites: z.array(nonEmptyString),
    objective: nonEmptyString,
    knowledgeType: z.enum(KNOWLEDGE_TYPES),
    prompt: nonEmptyString,
    answer: nonEmptyString,
    explanation: nonEmptyString,
    datasetId: nonEmptyString.optional(),
    grading: gradingSchema,
    hints: progressiveHintsSchema.optional(),
    difficulty: z.number().int().min(1).max(5),
    estimatedMinutes: z.number().int().positive(),
    author: nonEmptyString,
    reviewStatus: z.enum(REVIEW_STATUSES),
    review: contentReviewSchema.optional(),
    rights: z
      .object({
        source: nonEmptyString,
        license: nonEmptyString,
        notes: nonEmptyString,
      })
      .strict(),
    changeReason: nonEmptyString,
    memoryInheritance: z.enum(MEMORY_INHERITANCE_VALUES),
    assessment: assessmentMetadataSchema.optional(),
  })
  .strict();

export type ContentItem = z.infer<typeof contentItemSchema>;
export type ContentReview = z.infer<typeof contentReviewSchema>;

export function getContentItemJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(contentItemSchema, { target: "draft-2020-12" });
}

export function validateContentItem(value: unknown): string[] {
  const result = contentItemSchema.safeParse(value);
  if (!result.success) {
    return result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
  }

  const item = result.data;
  const errors: string[] = [];

  if (item.reviewStatus === "reviewed") {
    if (!item.review) {
      errors.push("reviewed content requires review metadata");
    } else {
      if (item.review.reviewer === item.author) {
        errors.push("reviewer must be different from author");
      }
      if (item.review.reviewedVersion !== item.version) {
        errors.push("reviewedVersion must match content version");
      }
      if (Number.isNaN(Date.parse(item.review.reviewedAt))) {
        errors.push("reviewedAt must be a valid date-time");
      }
    }
  }

  if (item.reviewStatus === "draft" && item.review) {
    errors.push("draft content must not retain review metadata");
  }

  if (item.grading.strategy === "exact" && !item.grading.acceptedAnswers) {
    errors.push("exact grading requires acceptedAnswers");
  }
  if (item.grading.strategy === "keywords" && !item.grading.requiredKeywords) {
    errors.push("keyword grading requires requiredKeywords");
  }
  if (
    item.grading.strategy === "sql" &&
    !item.grading.requiredSqlClauses &&
    !item.grading.expectedResult
  ) {
    errors.push("sql grading requires requiredSqlClauses or expectedResult");
  }
  if (item.grading.strategy !== "sql" && item.grading.expectedResult) {
    errors.push("expectedResult is only supported for sql grading");
  }
  if (item.grading.expectedResult && !item.datasetId) {
    errors.push("expectedResult grading requires datasetId");
  }
  if (item.datasetId && item.domainId !== "sql") {
    errors.push("datasetId is only supported for sql content");
  }
  if (item.grading.expectedResult) {
    errors.push(...validateSqlResultRows(item.grading.expectedResult));
  }

  return errors;
}

export function validateSqlDataset(value: unknown): string[] {
  const result = sqlDatasetSchema.safeParse(value);
  if (!result.success) {
    return result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
  }

  const dataset = result.data;
  const errors: string[] = [];
  if (
    new Set(dataset.tables.map((table) => table.name)).size !==
    dataset.tables.length
  ) {
    errors.push(`${dataset.datasetId}: table names must be unique`);
  }

  for (const table of dataset.tables) {
    if (
      new Set(table.columns.map((column) => column.name)).size !==
      table.columns.length
    ) {
      errors.push(
        `${dataset.datasetId}.${table.name}: column names must be unique`,
      );
    }

    for (const [rowIndex, row] of table.rows.entries()) {
      if (row.length !== table.columns.length) {
        errors.push(
          `${dataset.datasetId}.${table.name}: row ${rowIndex + 1} must have ${table.columns.length} values`,
        );
        continue;
      }

      for (const [columnIndex, valueAtColumn] of row.entries()) {
        if (valueAtColumn === null) continue;
        const column = table.columns[columnIndex];
        if (!column) continue;
        if (column.type === "integer" && typeof valueAtColumn !== "number") {
          errors.push(
            `${dataset.datasetId}.${table.name}: row ${rowIndex + 1} column ${column.name} must be integer or null`,
          );
        }
        if (column.type === "text" && typeof valueAtColumn !== "string") {
          errors.push(
            `${dataset.datasetId}.${table.name}: row ${rowIndex + 1} column ${column.name} must be text or null`,
          );
        }
      }
    }
  }

  return [...new Set(errors)];
}

function validateSqlResultRows(result: SqlExpectedResult): string[] {
  const errors: string[] = [];
  for (const [rowIndex, row] of result.rows.entries()) {
    if (row.length !== result.columns.length) {
      errors.push(
        `expectedResult.rows.${rowIndex}: expected ${result.columns.length} values`,
      );
    }
  }
  return errors;
}

export function approveContent(
  value: unknown,
  reviewer: string,
  reviewedAt: string,
): ContentItem {
  const parsed = contentItemSchema.parse(value);
  const normalizedReviewer = reviewer.trim();

  if (!normalizedReviewer) throw new Error("reviewer is required");
  if (normalizedReviewer === parsed.author) {
    throw new Error("reviewer must be different from author");
  }
  if (Number.isNaN(Date.parse(reviewedAt))) {
    throw new Error("reviewedAt must be a valid date-time");
  }

  const reviewed: ContentItem = {
    ...parsed,
    reviewStatus: "reviewed",
    review: {
      reviewer: normalizedReviewer,
      reviewedAt,
      reviewedVersion: parsed.version,
      checklist: {
        answer: true,
        explanation: true,
        scope: true,
        acceptedAnswers: true,
        difficulty: true,
      },
    },
  };

  const errors = validateContentItem(reviewed);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return reviewed;
}

export function createContentRevision(
  value: unknown,
  changeReason: string,
): ContentItem {
  const parsed = contentItemSchema.parse(value);
  const normalizedReason = changeReason.trim();
  if (!normalizedReason) throw new Error("changeReason is required");

  const withoutReview = { ...parsed };
  delete withoutReview.review;
  return {
    ...withoutReview,
    version: parsed.version + 1,
    reviewStatus: "draft",
    changeReason: normalizedReason,
    memoryInheritance: "undecided",
  };
}
