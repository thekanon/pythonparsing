import {
  contentItemSchema,
  type ContentItem,
  type SqlExpectedResult,
  type SqlResultCell,
  validateContentItem,
} from "./content-schema";
import { SQL_ERROR_KINDS, type SqlErrorKind } from "./learning-engine";

export interface SqlResultTable {
  columns: readonly string[];
  rows: readonly (readonly SqlResultCell[])[];
}

export interface SqlResultTableComparison {
  equivalent: boolean;
  mismatch: "columns" | "rows" | null;
}

export interface GradingResult {
  strategy: "exact" | "keywords" | "sql";
  correct: boolean;
  missingRequirements: readonly string[];
  forbiddenMatches: readonly string[];
  errorKinds: readonly SqlErrorKind[];
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
    errorKinds: [],
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
    errorKinds: [],
  };
}

function gradeSql(item: ContentItem, submittedResponse: string): GradingResult {
  if (item.grading.expectedResult) {
    return gradeSqlExpectedResult(
      item.grading.expectedResult,
      submittedResponse,
    );
  }

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
    errorKinds: deriveSqlErrorKinds(missingRequirements, forbiddenMatches),
  };
}

function gradeSqlExpectedResult(
  expected: SqlExpectedResult,
  submittedResponse: string,
): GradingResult {
  const submitted = parseSqlResultTable(submittedResponse);
  if (!submitted) {
    return {
      strategy: "sql",
      correct: false,
      missingRequirements: ["result-table-syntax"],
      forbiddenMatches: [],
      errorKinds: ["syntax"],
    };
  }

  const comparison = compareSqlResultTables(expected, submitted);
  if (comparison.equivalent) {
    return {
      strategy: "sql",
      correct: true,
      missingRequirements: [],
      forbiddenMatches: [],
      errorKinds: [],
    };
  }

  const mismatch = comparison.mismatch ?? "rows";
  return {
    strategy: "sql",
    correct: false,
    missingRequirements: [
      mismatch === "columns" ? "result-columns" : "result-rows",
    ],
    forbiddenMatches: [],
    errorKinds: [mismatch === "columns" ? "scope" : "condition"],
  };
}

export function parseSqlResultTable(value: string): SqlResultTable | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  const keys = Object.keys(parsed).sort((left, right) =>
    left.localeCompare(right),
  );
  if (keys.length !== 2 || keys[0] !== "columns" || keys[1] !== "rows") {
    return null;
  }
  if (
    !Array.isArray(parsed.columns) ||
    parsed.columns.length === 0 ||
    parsed.columns.some(
      (column) => typeof column !== "string" || !column.trim(),
    )
  ) {
    return null;
  }
  if (!Array.isArray(parsed.rows)) return null;

  const rows: SqlResultCell[][] = [];
  for (const row of parsed.rows) {
    if (!Array.isArray(row) || row.length !== parsed.columns.length) {
      return null;
    }
    const parsedRow: SqlResultCell[] = [];
    for (const cell of row) {
      if (!isSqlResultCell(cell)) return null;
      parsedRow.push(cell);
    }
    rows.push(parsedRow);
  }

  return {
    columns: [...parsed.columns] as string[],
    rows,
  };
}

export function compareSqlResultTables(
  expected: SqlExpectedResult,
  actual: SqlResultTable,
): SqlResultTableComparison {
  if (!sameExactColumns(expected.columns, actual.columns)) {
    return { equivalent: false, mismatch: "columns" };
  }

  const expectedRows = expected.rows.map(canonicalResultRow);
  const actualRows = actual.rows.map(canonicalResultRow);

  if (expected.ordered) {
    const equivalent =
      expectedRows.length === actualRows.length &&
      expectedRows.every((row, index) => row === actualRows[index]);
    return { equivalent, mismatch: equivalent ? null : "rows" };
  }

  const equivalent = sameRowMultiset(expectedRows, actualRows);
  return { equivalent, mismatch: equivalent ? null : "rows" };
}

function deriveSqlErrorKinds(
  missingRequirements: readonly string[],
  forbiddenMatches: readonly string[],
): readonly SqlErrorKind[] {
  const kinds = new Set<SqlErrorKind>();

  for (const requirement of missingRequirements) {
    const normalized = normalizeSql(requirement);
    let classified = false;

    if (hasSqlKeyword(normalized, "WHERE")) {
      kinds.add("condition");
      classified = true;
    }
    if (hasSqlKeyword(normalized, "JOIN") || hasSqlKeyword(normalized, "ON")) {
      kinds.add("join");
      classified = true;
    }
    if (
      hasSqlKeyword(normalized, "GROUP") ||
      hasSqlKeyword(normalized, "HAVING") ||
      /\b(?:COUNT|SUM|AVG|MIN|MAX)\s*\(/u.test(normalized)
    ) {
      kinds.add("aggregate");
      classified = true;
    }

    if (!classified) kinds.add("scope");
  }

  if (forbiddenMatches.length > 0) kinds.add("forbidden");
  return SQL_ERROR_KINDS.filter((kind) => kinds.has(kind));
}

function hasSqlKeyword(sql: string, keyword: string): boolean {
  return new RegExp(`(^|[^A-Z0-9_])${keyword}($|[^A-Z0-9_])`, "u").test(sql);
}

function sameExactColumns(
  expected: readonly string[],
  actual: readonly string[],
): boolean {
  return (
    expected.length === actual.length &&
    expected.every((column, index) => column === actual[index])
  );
}

function canonicalResultRow(row: readonly SqlResultCell[]): string {
  return JSON.stringify(row.map(normalizeResultCell));
}

function normalizeResultCell(value: SqlResultCell): string {
  if (value === null) return "null:";
  if (typeof value === "number") return `number:${String(value)}`;

  const normalized = value.normalize("NFKC").trim();
  if (/^-?\d+$/u.test(normalized)) {
    try {
      return `number:${BigInt(normalized).toString()}`;
    } catch {
      // Fall through to string comparison for values outside BigInt syntax.
    }
  }
  return `string:${normalized}`;
}

function sameRowMultiset(
  expectedRows: readonly string[],
  actualRows: readonly string[],
): boolean {
  if (expectedRows.length !== actualRows.length) return false;
  const counts = new Map<string, number>();
  for (const row of expectedRows) {
    counts.set(row, (counts.get(row) ?? 0) + 1);
  }
  for (const row of actualRows) {
    const count = counts.get(row);
    if (!count) return false;
    if (count === 1) counts.delete(row);
    else counts.set(row, count - 1);
  }
  return counts.size === 0;
}

function isSqlResultCell(value: unknown): value is SqlResultCell {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      Number.isInteger(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
