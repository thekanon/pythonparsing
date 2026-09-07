import { describe, expect, it } from "vitest";

import { LEARNING_CONTENT_CATALOG } from "./content-catalog";
import {
  contentItemSchema,
  type ContentItem,
  type SqlExpectedResult,
} from "./content-schema";
import {
  compareSqlResultTables,
  gradeContentResponse,
  normalizeSql,
  parseSqlResultTable,
} from "./grading";

const baseContent = contentItemSchema.parse(
  LEARNING_CONTENT_CATALOG["sql-select-basics"],
);

describe("exam coach grading", () => {
  it("normalizes exact answers without storing submitted text", () => {
    const result = gradeContentResponse(baseContent, "  select   절  ");

    expect(result).toEqual({
      strategy: "exact",
      correct: true,
      missingRequirements: [],
      forbiddenMatches: [],
      errorKinds: [],
    });
    expect(result).not.toHaveProperty("submittedResponse");
  });

  it("does not expose accepted answers on exact failure", () => {
    const result = gradeContentResponse(baseContent, "FROM");

    expect(result.correct).toBe(false);
    expect(result.missingRequirements).toEqual(["accepted-answer"]);
    expect(JSON.stringify(result)).not.toContain("SELECT 절");
  });

  it("requires every configured keyword", () => {
    const item = withGrading({
      strategy: "keywords",
      requiredKeywords: ["정규화", "함수 종속"],
    });
    const correct = gradeContentResponse(
      item,
      "정규화 과정에서는 함수   종속을 확인한다.",
    );
    const failed = gradeContentResponse(item, "정규화만 설명한다.");

    expect(correct.correct).toBe(true);
    expect(failed.missingRequirements).toEqual(["함수 종속"]);
  });

  it("normalizes SQL but preserves quoted literal case", () => {
    const normalized = normalizeSql(
      " select name from employees where dept = 'Qa Team'; ",
    );
    const result = gradeContentResponse(
      sqlContent(),
      "select name from employees where dept='개발';",
    );

    expect(normalized).toBe("SELECT NAME FROM EMPLOYEES WHERE DEPT='Qa Team'");
    expect(result.correct).toBe(true);
  });

  it("rejects missing SQL semantics and forbidden tokens", () => {
    const wrongValue = gradeContentResponse(
      sqlContent(),
      "SELECT name FROM employees WHERE dept='영업'",
    );
    const mutation = gradeContentResponse(
      sqlContent(),
      "SELECT name FROM employees WHERE dept='개발'; UPDATE employees SET name='x'",
    );

    expect(wrongValue.correct).toBe(false);
    expect(wrongValue.missingRequirements).toEqual(["WHERE dept = '개발'"]);
    expect(wrongValue.errorKinds).toEqual(["condition"]);
    expect(mutation.correct).toBe(false);
    expect(mutation.forbiddenMatches).toEqual(["UPDATE"]);
    expect(mutation.errorKinds).toEqual(["forbidden"]);
  });

  it("classifies missing SQL scope, join, and aggregate requirements", () => {
    const scope = gradeContentResponse(
      withGrading({
        strategy: "sql",
        requiredSqlClauses: ["SELECT name", "FROM employees"],
      }),
      "SELECT name",
    );
    const join = gradeContentResponse(
      withGrading({
        strategy: "sql",
        requiredSqlClauses: [
          "SELECT orders.id",
          "FROM orders",
          "JOIN customers",
          "ON orders.customer_id = customers.id",
        ],
      }),
      "SELECT orders.id FROM orders",
    );
    const aggregate = gradeContentResponse(
      withGrading({
        strategy: "sql",
        requiredSqlClauses: [
          "SELECT customer_id, COUNT(*)",
          "FROM orders",
          "GROUP BY customer_id",
        ],
      }),
      "SELECT customer_id FROM orders",
    );

    expect(scope.errorKinds).toEqual(["scope"]);
    expect(join.errorKinds).toEqual(["join"]);
    expect(aggregate.errorKinds).toEqual(["aggregate"]);
  });

  it("compares unordered result rows as a multiset and preserves duplicate counts", () => {
    const expected: SqlExpectedResult = {
      columns: ["name", "count"],
      rows: [
        ["개발", 2],
        ["기획", 1],
        ["개발", 2],
      ],
      ordered: false,
    };
    const reordered = parseSqlResultTable(
      '{"columns":["name","count"],"rows":[["개발","2"],["개발",2],["기획",1]]}',
    );
    const missingDuplicate = parseSqlResultTable(
      '{"columns":["name","count"],"rows":[["개발",2],["기획",1]]}',
    );

    expect(reordered).not.toBeNull();
    expect(compareSqlResultTables(expected, reordered!).equivalent).toBe(true);
    expect(missingDuplicate).not.toBeNull();
    expect(compareSqlResultTables(expected, missingDuplicate!).equivalent).toBe(
      false,
    );
  });

  it("fails ordered result comparison when row order changes", () => {
    const expected: SqlExpectedResult = {
      columns: ["id"],
      rows: [[1], [2]],
      ordered: true,
    };
    const actual = parseSqlResultTable('{"columns":["id"],"rows":[[2],[1]]}');

    expect(actual).not.toBeNull();
    expect(compareSqlResultTables(expected, actual!)).toEqual({
      equivalent: false,
      mismatch: "rows",
    });
  });

  it("fails on column order mismatch and compares null as a value", () => {
    const expected: SqlExpectedResult = {
      columns: ["id", "department"],
      rows: [[4, null]],
      ordered: false,
    };
    const wrongColumns = parseSqlResultTable(
      '{"columns":["department","id"],"rows":[[null,4]]}',
    );
    const sameNull = parseSqlResultTable(
      '{"columns":["id","department"],"rows":[["4",null]]}',
    );

    expect(wrongColumns).not.toBeNull();
    expect(compareSqlResultTables(expected, wrongColumns!)).toEqual({
      equivalent: false,
      mismatch: "columns",
    });
    expect(sameNull).not.toBeNull();
    expect(compareSqlResultTables(expected, sameNull!).equivalent).toBe(true);
  });

  it("grades expected result tables and classifies parse and table mismatches", () => {
    const item = withGrading({
      strategy: "sql",
      expectedResult: {
        columns: ["name"],
        rows: [["김민수"], ["박지훈"]],
        ordered: false,
      },
    });

    const correct = gradeContentResponse(
      item,
      '{"columns":["name"],"rows":[["박지훈"],["김민수"]]}',
    );
    const syntax = gradeContentResponse(item, "name=김민수");
    const wrongColumns = gradeContentResponse(
      item,
      '{"columns":["employee_name"],"rows":[["김민수"],["박지훈"]]}',
    );
    const wrongRows = gradeContentResponse(
      item,
      '{"columns":["name"],"rows":[["김민수"]]}',
    );

    expect(correct.correct).toBe(true);
    expect(correct.errorKinds).toEqual([]);
    expect(syntax.errorKinds).toEqual(["syntax"]);
    expect(wrongColumns.errorKinds).toEqual(["scope"]);
    expect(wrongRows.errorKinds).toEqual(["condition"]);
  });

  it("matches forbidden SQL only as executable tokens", () => {
    const identifierRule = withGrading({
      strategy: "sql",
      requiredSqlClauses: ["SELECT last_update_at", "FROM employees"],
      forbiddenSqlTokens: ["UPDATE"],
    });
    const literalRule = withGrading({
      strategy: "sql",
      requiredSqlClauses: ["SELECT 'UPDATE'", "FROM employees"],
      forbiddenSqlTokens: ["UPDATE"],
    });

    const identifier = gradeContentResponse(
      identifierRule,
      "SELECT last_update_at FROM employees;",
    );
    const quotedLiteral = gradeContentResponse(
      literalRule,
      "SELECT 'UPDATE' FROM employees;",
    );

    expect(identifier.correct).toBe(true);
    expect(identifier.forbiddenMatches).toEqual([]);
    expect(quotedLiteral.correct).toBe(true);
    expect(quotedLiteral.forbiddenMatches).toEqual([]);
  });

  it("refuses content with an invalid grading contract", () => {
    const invalid = { ...baseContent, grading: { strategy: "exact" as const } };

    expect(() => gradeContentResponse(invalid, "SELECT")).toThrow(
      /content is not gradeable/,
    );
  });
});

function sqlContent(): ContentItem {
  return withGrading({
    strategy: "sql",
    requiredSqlClauses: [
      "SELECT name",
      "FROM employees",
      "WHERE dept = '개발'",
    ],
    forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
  });
}

function withGrading(grading: ContentItem["grading"]): ContentItem {
  return {
    ...baseContent,
    id: `test.${grading.strategy}`,
    ...(grading.expectedResult ? { datasetId: "sql-test-v1" } : {}),
    grading,
  };
}
