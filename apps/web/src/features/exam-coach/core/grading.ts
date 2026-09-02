import {
  contentItemSchema,
  type ContentItem,
  validateContentItem,
} from "./content-schema";

export interface GradingResult {
  strategy: "exact" | "keywords" | "sql";
  correct: boolean;
  missingRequirements: readonly string[];
  forbiddenMatches: readonly string[];
}

export function gradeContentResponse(
  content: unknown,
  submittedResponse: string,
): GradingResult {
  const errors = validateContentItem(content);
  if (errors.length > 0) {
    throw new Error(`content is not gradeable: ${errors.join("; ")}`);
  }

  const item = contentItemSchema.parse(content);
  switch (item.grading.strategy) {
    case "exact":
      return gradeExact(item, submittedResponse);
    case "keywords":
      return gradeKeywords(item, submittedResponse);
    case "sql":
      return gradeSql(item, submittedResponse);
  }
}

function gradeExact(
  item: ContentItem,
  submittedResponse: string,
): GradingResult {
  const response = normalizePlainText(submittedResponse);
  const acceptedAnswers = item.grading.acceptedAnswers ?? [];
  const correct = acceptedAnswers.some(
    (answer) => normalizePlainText(answer) === response,
  );

  return {
    strategy: "exact",
    correct,
    missingRequirements: correct ? [] : ["accepted-answer"],
    forbiddenMatches: [],
  };
}

function gradeKeywords(
  item: ContentItem,
  submittedResponse: string,
): GradingResult {
  const response = normalizePlainText(submittedResponse);
  const requiredKeywords = item.grading.requiredKeywords ?? [];
  const missingRequirements = requiredKeywords.filter(
    (keyword) => !response.includes(normalizePlainText(keyword)),
  );

  return {
    strategy: "keywords",
    correct: missingRequirements.length === 0,
    missingRequirements,
    forbiddenMatches: [],
  };
}

function gradeSql(item: ContentItem, submittedResponse: string): GradingResult {
  const response = normalizeSql(submittedResponse);
  const requiredClauses = item.grading.requiredSqlClauses ?? [];
  const forbiddenTokens = item.grading.forbiddenSqlTokens ?? [];
  const missingRequirements = requiredClauses.filter(
    (clause) => !response.includes(normalizeSql(clause)),
  );
  const forbiddenMatches = forbiddenTokens.filter((token) =>
    containsSqlToken(response, token),
  );

  return {
    strategy: "sql",
    correct: missingRequirements.length === 0 && forbiddenMatches.length === 0,
    missingRequirements,
    forbiddenMatches,
  };
}

export function normalizeSql(value: string): string {
  const valueWithoutTerminator = value
    .normalize("NFKC")
    .trim()
    .replace(/;+\s*$/u, "");

  return splitSqlSegments(valueWithoutTerminator)
    .map(normalizeSqlSegment)
    .join("")
    .trim();
}

function normalizeSqlSegment(segment: SqlSegment): string {
  if (segment.quoted) return segment.text;

  return segment.text
    .replace(/\s+/gu, " ")
    .replace(/\s*([=(),])\s*/gu, "$1")
    .toUpperCase();
}

function normalizePlainText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

function containsSqlToken(sql: string, token: string): boolean {
  const normalizedToken = normalizeSql(token);
  const unquotedSql = splitSqlSegments(sql)
    .filter((segment) => !segment.quoted)
    .map((segment) => segment.text)
    .join(" ");
  const pattern = new RegExp(
    `(^|[^A-Z0-9_])${escapeRegExp(normalizedToken)}($|[^A-Z0-9_])`,
    "u",
  );
  return pattern.test(unquotedSql);
}

interface SqlSegment {
  quoted: boolean;
  text: string;
}

function splitSqlSegments(value: string): SqlSegment[] {
  const segments: SqlSegment[] = [];
  let quoted = false;
  let current = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    current += character;

    if (character !== "'") continue;
    if (quoted && value[index + 1] === "'") {
      current += value[index + 1];
      index += 1;
      continue;
    }

    segments.push({ quoted, text: current });
    current = "";
    quoted = !quoted;
  }

  if (current) segments.push({ quoted, text: current });
  return segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
