import type { RssCandidate } from "./types";

type ExistingContent = {
  externalId: string;
  withdrawnAt: Date | null;
  sourceHash: string;
  revisionStatus: string;
};

export function filterEligibleCandidates(
  candidates: readonly RssCandidate[],
  existing: readonly ExistingContent[],
): RssCandidate[] {
  const withdrawnExternalIds = new Set(
    existing
      .filter((row) => row.withdrawnAt !== null)
      .map((row) => row.externalId),
  );
  const publishedRevisions = new Set(
    existing
      .filter((row) => row.revisionStatus === "published")
      .map((row) => `${row.externalId}:${row.sourceHash}`),
  );

  return candidates.filter(
    (candidate) =>
      !withdrawnExternalIds.has(candidate.externalId) &&
      !publishedRevisions.has(
        `${candidate.externalId}:${candidate.sourceHash}`,
      ),
  );
}
