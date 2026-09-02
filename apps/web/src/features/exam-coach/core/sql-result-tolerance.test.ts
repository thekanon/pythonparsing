import { describe, expect, it } from "vitest";

// prettier-ignore
import {
  compareSqlResults,
  type SqlResultSet,
} from "./sql-result";

// prettier-ignore
describe("exam coach SQL tolerance matching", () => {
  it("finds a complete unordered matching when tolerance overlaps", () => {
    const actual: SqlResultSet = {
      columns: ["score"],
      rows: [[0], [0.1]],
    };
    const expected: SqlResultSet = {
      columns: ["score"],
      rows: [[0.05], [-0.05]],
    };

    const result = compareSqlResults(actual, expected, {
      rowOrder: "unordered",
      columnOrder: "ordered",
      numericTolerance: 0.06,
    });

    expect(result).toMatchObject({
      equivalent: true,
      mismatch: null,
    });
  });
});
