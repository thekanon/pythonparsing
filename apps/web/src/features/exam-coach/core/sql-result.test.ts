import { describe, expect, it } from "vitest";

import sqlSample from "../content/2026/sql/select-basics.json";
// prettier-ignore
import {
  startPracticeSession,
  submitFirstResponse,
} from "./feedback-flow";
import {
  assertSqlExecutionAllowed,
  compareSqlResults,
  type SqlResultSet,
} from "./sql-result";

const expected: SqlResultSet = {
  columns: ["id", "name"],
  rows: [
    [1, "Kim"],
    [2, "Lee"],
  ],
};

// prettier-ignore
describe("exam coach SQL result comparison", () => {
  it("blocks SQL execution before the first submission", () => {
    const session = startPracticeSession(sqlSample, "sql-card");

    expect(() => assertSqlExecutionAllowed(session)).toThrow(
      /only after the first submission/,
    );

    const submitted = submitFirstResponse(
      session,
      sqlSample,
      "SELECT",
      "2026-09-02T07:00:00.000Z",
      1200,
    );
    expect(() => assertSqlExecutionAllowed(submitted)).not.toThrow();
  });

  it("accepts identical ordered rows and columns", () => {
    const result = compareSqlResults(expected, expected, {
      rowOrder: "ordered",
      columnOrder: "ordered",
    });

    expect(result).toEqual({
      equivalent: true,
      mismatch: null,
      expectedRowCount: 2,
      actualRowCount: 2,
    });
  });

  it("accepts different row order when order is irrelevant", () => {
    const actual: SqlResultSet = {
      columns: ["id", "name"],
      rows: [
        [2, "Lee"],
        [1, "Kim"],
      ],
    };

    expect(
      compareSqlResults(actual, expected, {
        rowOrder: "unordered",
        columnOrder: "ordered",
      }),
    ).toMatchObject({ equivalent: true, mismatch: null });
  });

  it("reports row-order mismatch when order is required", () => {
    const actual: SqlResultSet = {
      columns: ["id", "name"],
      rows: [
        [2, "Lee"],
        [1, "Kim"],
      ],
    };

    expect(
      compareSqlResults(actual, expected, {
        rowOrder: "ordered",
        columnOrder: "ordered",
      }),
    ).toMatchObject({ equivalent: false, mismatch: "row-order" });
  });

  it("preserves duplicate row multiplicity for unordered comparison", () => {
    const duplicatedExpected: SqlResultSet = {
      columns: ["value"],
      rows: [[1], [1], [2]],
    };
    const actual: SqlResultSet = {
      columns: ["value"],
      rows: [[2], [1], [1]],
    };
    const missingDuplicate: SqlResultSet = {
      columns: ["value"],
      rows: [[2], [1], [2]],
    };

    expect(
      compareSqlResults(actual, duplicatedExpected, {
        rowOrder: "unordered",
        columnOrder: "ordered",
      }).equivalent,
    ).toBe(true);
    expect(
      compareSqlResults(missingDuplicate, duplicatedExpected, {
        rowOrder: "unordered",
        columnOrder: "ordered",
      }),
    ).toMatchObject({ equivalent: false, mismatch: "values" });
  });

  it("can align columns by name without making column names case-sensitive", () => {
    const actual: SqlResultSet = {
      columns: ["NAME", "ID"],
      rows: [
        ["Kim", 1],
        ["Lee", 2],
      ],
    };

    expect(
      compareSqlResults(actual, expected, {
        rowOrder: "ordered",
        columnOrder: "by-name",
      }).equivalent,
    ).toBe(true);
  });

  it("reports column and row-count mismatches separately", () => {
    const wrongColumns: SqlResultSet = {
      columns: ["id", "nickname"],
      rows: [
        [1, "Kim"],
        [2, "Lee"],
      ],
    };
    const oneRow: SqlResultSet = {
      columns: ["id", "name"],
      rows: [[1, "Kim"]],
    };

    expect(
      compareSqlResults(wrongColumns, expected, {
        rowOrder: "ordered",
        columnOrder: "ordered",
      }).mismatch,
    ).toBe("columns");
    expect(
      compareSqlResults(oneRow, expected, {
        rowOrder: "ordered",
        columnOrder: "ordered",
      }).mismatch,
    ).toBe("row-count");
  });

  it("keeps SQL cell types and values significant", () => {
    const stringId: SqlResultSet = {
      columns: ["id", "name"],
      rows: [
        ["1", "Kim"],
        [2, "Lee"],
      ],
    };
    const wrongValue: SqlResultSet = {
      columns: ["id", "name"],
      rows: [
        [1, "kim"],
        [2, "Lee"],
      ],
    };

    for (const actual of [stringId, wrongValue]) {
      expect(
        compareSqlResults(actual, expected, {
          rowOrder: "ordered",
          columnOrder: "ordered",
        }),
      ).toMatchObject({ equivalent: false, mismatch: "values" });
    }
  });

  it("supports an explicit numeric tolerance", () => {
    const actual: SqlResultSet = {
      columns: ["score"],
      rows: [[0.3000001]],
    };
    const target: SqlResultSet = {
      columns: ["score"],
      rows: [[0.3]],
    };

    expect(
      compareSqlResults(actual, target, {
        rowOrder: "ordered",
        columnOrder: "ordered",
        numericTolerance: 0.001,
      }).equivalent,
    ).toBe(true);
    expect(() =>
      compareSqlResults(actual, target, {
        rowOrder: "ordered",
        columnOrder: "ordered",
        numericTolerance: -1,
      }),
    ).toThrow(/numericTolerance/);
  });

  it("rejects malformed result sets before comparison", () => {
    expect(() =>
      compareSqlResults(
        { columns: ["id", "ID"], rows: [[1, 2]] },
        expected,
        { rowOrder: "ordered", columnOrder: "ordered" },
      ),
    ).toThrow(/duplicate column names/);

    expect(() =>
      compareSqlResults(
        { columns: ["id", "name"], rows: [[1]] },
        expected,
        { rowOrder: "ordered", columnOrder: "ordered" },
      ),
    ).toThrow(/row width/);
  });
});
