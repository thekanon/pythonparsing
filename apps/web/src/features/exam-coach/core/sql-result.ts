import type { PracticeSession } from "./feedback-flow";

export type SqlCell = string | number | boolean | null;

// prettier-ignore
export interface SqlResultSet {
  columns: readonly string[];
  rows: readonly (readonly SqlCell[])[];
}

// prettier-ignore
export interface SqlResultComparisonOptions {
  rowOrder: "ordered" | "unordered";
  columnOrder: "ordered" | "by-name";
  columnNameCaseSensitive?: boolean;
  numericTolerance?: number;
}

// prettier-ignore
export type SqlResultMismatchKind =
  | "columns"
  | "row-count"
  | "row-order"
  | "values";

// prettier-ignore
export interface SqlResultComparison {
  equivalent: boolean;
  mismatch: SqlResultMismatchKind | null;
  expectedRowCount: number;
  actualRowCount: number;
}

// prettier-ignore
interface PreparedResult {
  columns: readonly string[];
  rows: readonly (readonly SqlCell[])[];
}

export function assertSqlExecutionAllowed(session: PracticeSession): void {
  if (!session.firstSubmission) {
    throw new Error(
      "SQL execution is available only after the first submission",
    );
  }
}

// prettier-ignore
export function compareSqlResults(
  actualValue: SqlResultSet,
  expectedValue: SqlResultSet,
  options: SqlResultComparisonOptions,
): SqlResultComparison {
  const numericTolerance = options.numericTolerance ?? 0;
  if (!Number.isFinite(numericTolerance) || numericTolerance < 0) {
    throw new Error("numericTolerance must be a non-negative finite number");
  }

  const actual = validateResultSet(actualValue, "actual");
  const expected = validateResultSet(expectedValue, "expected");
  const prepared = prepareColumns(actual, expected, options);
  if (!prepared) {
    return comparison(false, "columns", actual, expected);
  }

  if (prepared.actual.rows.length !== prepared.expected.rows.length) {
    return comparison(false, "row-count", prepared.actual, prepared.expected);
  }

  if (options.rowOrder === "ordered") {
    if (rowsEqualInOrder(prepared.actual.rows, prepared.expected.rows, numericTolerance)) {
      return comparison(true, null, prepared.actual, prepared.expected);
    }
    if (rowsEqualUnordered(prepared.actual.rows, prepared.expected.rows, numericTolerance)) {
      return comparison(false, "row-order", prepared.actual, prepared.expected);
    }
    return comparison(false, "values", prepared.actual, prepared.expected);
  }

  const equivalent = rowsEqualUnordered(
    prepared.actual.rows,
    prepared.expected.rows,
    numericTolerance,
  );
  return comparison(
    equivalent,
    equivalent ? null : "values",
    prepared.actual,
    prepared.expected,
  );
}

// prettier-ignore
function prepareColumns(
  actual: PreparedResult,
  expected: PreparedResult,
  options: SqlResultComparisonOptions,
): { actual: PreparedResult; expected: PreparedResult } | null {
  const caseSensitive = options.columnNameCaseSensitive ?? false;
  const actualNames = actual.columns.map((name) =>
    normalizeColumnName(name, caseSensitive),
  );
  const expectedNames = expected.columns.map((name) =>
    normalizeColumnName(name, caseSensitive),
  );

  if (options.columnOrder === "ordered") {
    if (!sameStrings(actualNames, expectedNames)) return null;
    return { actual, expected };
  }

  if (!sameStringSet(actualNames, expectedNames)) return null;
  const actualIndexes = expectedNames.map((name) => actualNames.indexOf(name));
  return {
    actual: {
      columns: expected.columns,
      rows: actual.rows.map((row) => actualIndexes.map((index) => row[index]!)),
    },
    expected,
  };
}

// prettier-ignore
function validateResultSet(value: SqlResultSet, label: string): PreparedResult {
  if (!value || !Array.isArray(value.columns) || !Array.isArray(value.rows)) {
    throw new Error(`${label} SQL result must contain columns and rows`);
  }
  if (value.columns.length === 0) {
    throw new Error(`${label} SQL result must contain at least one column`);
  }

  const columns = value.columns.map((column) => {
    if (typeof column !== "string" || !column.trim()) {
      throw new Error(`${label} SQL result has an invalid column name`);
    }
    return column.trim();
  });
  const normalizedColumns = columns.map((column) => column.toLocaleLowerCase());
  if (new Set(normalizedColumns).size !== normalizedColumns.length) {
    throw new Error(`${label} SQL result has duplicate column names`);
  }

  const rows = value.rows.map((row) => {
    if (!Array.isArray(row) || row.length !== columns.length) {
      throw new Error(`${label} SQL result row width does not match columns`);
    }
    return row.map((cell) => validateCell(cell, label));
  });

  return { columns, rows };
}

// prettier-ignore
function validateCell(cell: SqlCell, label: string): SqlCell {
  if (cell === null) return null;
  if (typeof cell === "string" || typeof cell === "boolean") return cell;
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  throw new Error(`${label} SQL result contains an unsupported cell value`);
}

// prettier-ignore
function rowsEqualInOrder(
  actual: readonly (readonly SqlCell[])[],
  expected: readonly (readonly SqlCell[])[],
  numericTolerance: number,
): boolean {
  return actual.every((row, index) =>
    rowsEqual(row, expected[index]!, numericTolerance),
  );
}

// prettier-ignore
function rowsEqualUnordered(
  actual: readonly (readonly SqlCell[])[],
  expected: readonly (readonly SqlCell[])[],
  numericTolerance: number,
): boolean {
  const matchedActualByExpected = new Array<number>(expected.length).fill(-1);

  for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
    const visitedExpected = new Set<number>();
    if (
      !findRowMatch(
        actualIndex,
        actual,
        expected,
        numericTolerance,
        matchedActualByExpected,
        visitedExpected,
      )
    ) {
      return false;
    }
  }

  return true;
}

// prettier-ignore
function findRowMatch(
  actualIndex: number,
  actual: readonly (readonly SqlCell[])[],
  expected: readonly (readonly SqlCell[])[],
  numericTolerance: number,
  matchedActualByExpected: number[],
  visitedExpected: Set<number>,
): boolean {
  for (
    let expectedIndex = 0;
    expectedIndex < expected.length;
    expectedIndex += 1
  ) {
    if (visitedExpected.has(expectedIndex)) continue;
    if (
      !rowsEqual(
        actual[actualIndex]!,
        expected[expectedIndex]!,
        numericTolerance,
      )
    ) {
      continue;
    }

    visitedExpected.add(expectedIndex);
    const previousActualIndex = matchedActualByExpected[expectedIndex]!;
    if (
      previousActualIndex < 0 ||
      findRowMatch(
        previousActualIndex,
        actual,
        expected,
        numericTolerance,
        matchedActualByExpected,
        visitedExpected,
      )
    ) {
      matchedActualByExpected[expectedIndex] = actualIndex;
      return true;
    }
  }

  return false;
}

// prettier-ignore
function rowsEqual(
  left: readonly SqlCell[],
  right: readonly SqlCell[],
  numericTolerance: number,
): boolean {
  return left.every((cell, index) =>
    cellsEqual(cell, right[index]!, numericTolerance),
  );
}

// prettier-ignore
function cellsEqual(
  left: SqlCell,
  right: SqlCell,
  numericTolerance: number,
): boolean {
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right) <= numericTolerance;
  }
  return left === right;
}

// prettier-ignore
function normalizeColumnName(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLocaleLowerCase();
}

// prettier-ignore
function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

// prettier-ignore
function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

// prettier-ignore
function comparison(
  equivalent: boolean,
  mismatch: SqlResultMismatchKind | null,
  actual: PreparedResult,
  expected: PreparedResult,
): SqlResultComparison {
  return {
    equivalent,
    mismatch,
    expectedRowCount: expected.rows.length,
    actualRowCount: actual.rows.length,
  };
}
