import { describe, expect, it } from "vitest";

import baselineJson from "../content/2026/diagnostic/sql-c-baseline.json";
import followupJson from "../content/2026/diagnostic/sql-c-followup.json";
import {
  validateDiagnosticAssessmentSet,
  validateIsomorphicAssessmentSets,
} from "./diagnostics";
import {
  OFFICIAL_OBJECTIVES_2026,
  OFFICIAL_SCOPE_SOURCE_2026,
} from "./official-objectives";
import type { DiagnosticAssessmentSet } from "./types";

const baselineSet = baselineJson as DiagnosticAssessmentSet;
const followupSet = followupJson as DiagnosticAssessmentSet;

describe("exam coach official scope and diagnostics", () => {
  it("pins the 2026 Q-Net scope source and detail topics", () => {
    expect(OFFICIAL_SCOPE_SOURCE_2026.validFrom).toBe("2026-01-01");
    expect(OFFICIAL_SCOPE_SOURCE_2026.validTo).toBe("2026-12-31");
    expect(OFFICIAL_SCOPE_SOURCE_2026.checkedAt).toBe("2026-09-02");
    expect(
      OFFICIAL_OBJECTIVES_2026.every(
        (objective) =>
          objective.sourceId === OFFICIAL_SCOPE_SOURCE_2026.id &&
          objective.detailTopics.length > 0,
      ),
    ).toBe(true);
  });

  it("validates both 18-minute SQL/C diagnostic forms", () => {
    expect(validateDiagnosticAssessmentSet(baselineSet)).toEqual([]);
    expect(validateDiagnosticAssessmentSet(followupSet)).toEqual([]);
    expect(baselineSet.estimatedMinutes).toBe(18);
    expect(followupSet.estimatedMinutes).toBe(18);
    expect(baselineSet.items).toHaveLength(6);
    expect(followupSet.items).toHaveLength(6);
  });

  it("keeps baseline and followup items isomorphic by skill", () => {
    expect(validateIsomorphicAssessmentSets(baselineSet, followupSet)).toEqual(
      [],
    );
  });

  it("covers three SQL and three C skill pairs", () => {
    const domains = baselineSet.items.map((item) => item.domainId);
    expect(domains.filter((domain) => domain === "sql")).toHaveLength(3);
    expect(
      domains.filter((domain) => domain === "programming-language"),
    ).toHaveLength(3);
  });

  it("rejects a followup form whose paired difficulty drifts", () => {
    const changedFollowup: DiagnosticAssessmentSet = {
      ...followupSet,
      items: followupSet.items.map((item) =>
        item.assessment?.pairId === "sql-filter"
          ? { ...item, difficulty: 3 }
          : item,
      ),
    };

    expect(
      validateIsomorphicAssessmentSets(baselineSet, changedFollowup),
    ).toContain("sql-filter: difficulty must match");
  });
});
