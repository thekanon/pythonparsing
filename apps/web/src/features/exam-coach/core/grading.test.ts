import { describe, expect, it } from "vitest";

import { LEARNING_CONTENT_CATALOG } from "./content-catalog";
import { contentItemSchema, type ContentItem } from "./content-schema";
import { gradeContentResponse, normalizeSql } from "./grading";

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
    expect(mutation.correct).toBe(false);
    expect(mutation.forbiddenMatches).toEqual(["UPDATE"]);
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
  return { ...baseContent, id: `test.${grading.strategy}`, grading };
}
