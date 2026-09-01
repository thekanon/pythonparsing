import {
  chunkAnonymousProgress,
  mergeAnonymousProgress,
  mergeProgressStage,
} from "./merge";
import type { ProgressStage } from "./types";

const earlier: ProgressStage = {
  attempts: 9_999,
  bestScore: 70,
  completedAt: "2026-08-20T00:00:00.000Z",
  helped: false,
  lastAttemptAt: "2026-08-21T00:00:00.000Z",
};

const later: ProgressStage = {
  attempts: 50,
  bestScore: 95,
  completedAt: "2026-08-22T00:00:00.000Z",
  helped: true,
  lastAttemptAt: "2026-08-23T00:00:00.000Z",
};

describe("progress merging", () => {
  it("merges full snapshots idempotently and keeps the best outcome", () => {
    expect(mergeProgressStage(earlier, later)).toEqual({
      attempts: 9_999,
      bestScore: 95,
      completedAt: earlier.completedAt,
      helped: true,
      lastAttemptAt: later.lastAttemptAt,
    });
  });

  it("chunks long-lived browser progress without dropping stages", () => {
    const progress = {
      version: 1 as const,
      stages: Object.fromEntries(
        Array.from({ length: 85 }, (_, index) => [
          `lesson-${index}:title`,
          earlier,
        ]),
      ),
    };

    const chunks = chunkAnonymousProgress(progress, 40);
    expect(chunks.map((chunk) => Object.keys(chunk.stages).length)).toEqual([
      40, 40, 5,
    ]);
    expect(
      new Set(chunks.flatMap((chunk) => Object.keys(chunk.stages))).size,
    ).toBe(85);
  });

  it("unions stage keys from local and remote snapshots", () => {
    const merged = mergeAnonymousProgress(
      { version: 1, stages: { "lesson-a:title": earlier } },
      { version: 1, stages: { "lesson-b:excerpt": later } },
    );
    expect(Object.keys(merged.stages).toSorted()).toEqual([
      "lesson-a:title",
      "lesson-b:excerpt",
    ]);
  });
});
