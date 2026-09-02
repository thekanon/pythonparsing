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
  if (item.grading.strategy === "sql" && !item.grading.requiredSqlClauses) {
    errors.push("sql grading requires requiredSqlClauses");
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
