import { filterEligibleCandidates } from "./history";
import type { RssCandidate } from "./types";

function candidate(externalId: string, sourceHash: string): RssCandidate {
  return {
    externalId,
    sourceHash,
    canonicalUrl: `https://www.bbc.com/news/${externalId}`,
    publishedAt: new Date("2026-08-26T00:00:00Z"),
    englishTitle: "Synthetic title",
    englishExcerpt: "A synthetic excerpt.",
  };
}

describe("ingestion history policy", () => {
  it("never republishes a withdrawn article even when its source changes", () => {
    const result = filterEligibleCandidates(
      [candidate("withdrawn", "new-hash"), candidate("fresh", "fresh-hash")],
      [
        {
          externalId: "withdrawn",
          withdrawnAt: new Date("2026-08-25T00:00:00Z"),
          sourceHash: "old-hash",
          revisionStatus: "withdrawn",
        },
      ],
    );

    expect(result.map((item) => item.externalId)).toEqual(["fresh"]);
  });

  it("allows a changed source revision for an active article", () => {
    const result = filterEligibleCandidates(
      [candidate("active", "new-hash")],
      [
        {
          externalId: "active",
          withdrawnAt: null,
          sourceHash: "old-hash",
          revisionStatus: "published",
        },
      ],
    );

    expect(result).toHaveLength(1);
  });
});
