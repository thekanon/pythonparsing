import type { GradeResult } from "@/features/lessons/types";

import {
  ANONYMOUS_PROGRESS_STORAGE_KEY,
  clearAnonymousProgress,
  getAnonymousProgressSnapshot,
  markAnonymousHelped,
  recordAnonymousAttempt,
} from "./storage";
import { progressKey } from "./types";

const incorrect: GradeResult = {
  complete: false,
  score: 40,
  incorrectPositions: [0],
};

describe("anonymous progress storage", () => {
  beforeEach(() => clearAnonymousProgress());

  it("unlocks help after recorded attempts and marks a helped completion without content", () => {
    for (let index = 0; index < 3; index += 1) {
      recordAnonymousAttempt("lesson-1", "title", incorrect);
    }
    markAnonymousHelped("lesson-1", "title");

    const stage =
      getAnonymousProgressSnapshot().stages[progressKey("lesson-1", "title")];
    expect(stage).toMatchObject({ attempts: 3, bestScore: 100, helped: true });
    expect(stage?.completedAt).not.toBeNull();

    const stored = localStorage.getItem(ANONYMOUS_PROGRESS_STORAGE_KEY)!;
    expect(stored).not.toContain("tokenIds");
    expect(stored).not.toContain("english");
    expect(stored).not.toContain("korean");
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem(ANONYMOUS_PROGRESS_STORAGE_KEY, "not-json");
    expect(getAnonymousProgressSnapshot()).toEqual({ version: 1, stages: {} });
  });
});
