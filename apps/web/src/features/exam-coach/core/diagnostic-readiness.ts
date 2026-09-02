import { BASELINE_DIAGNOSTIC, FOLLOWUP_DIAGNOSTIC } from "./diagnostic-sets";
import {
  C_CONCEPTS,
  SQL_CONCEPTS,
  type LearningEvent,
} from "./learning-engine";
import {
  buildReadinessReport,
  canonicalizeMasteryEvidence,
  masteryEvidenceForConceptsFromLearningEvent,
  type MasteryEvidence,
  type ReadinessReport,
} from "./mastery";

export const EXAM_COACH_PILOT_CONCEPTS = [
  ...SQL_CONCEPTS,
  ...C_CONCEPTS,
] as const;

const DIAGNOSTIC_ITEMS = [
  ...BASELINE_DIAGNOSTIC.items,
  ...FOLLOWUP_DIAGNOSTIC.items,
];
const CONCEPT_IDS_BY_CONTENT_VERSION = new Map(
  DIAGNOSTIC_ITEMS.map((item) => [
    contentVersionKey(item.id, item.version),
    item.conceptIds,
  ]),
);

export function diagnosticMasteryEvidenceFromEvents(
  events: readonly LearningEvent[],
): readonly MasteryEvidence[] {
  const evidence = events.flatMap((event) => {
    if (event.mode !== "assessment") return [];
    const conceptIds = CONCEPT_IDS_BY_CONTENT_VERSION.get(
      contentVersionKey(event.contentId, event.contentVersion),
    );
    return conceptIds
      ? masteryEvidenceForConceptsFromLearningEvent(event, conceptIds)
      : [];
  });
  return canonicalizeMasteryEvidence(evidence);
}

export function buildDiagnosticReadinessReport(
  events: readonly LearningEvent[],
  generatedAt: string,
): ReadinessReport {
  return buildReadinessReport(
    EXAM_COACH_PILOT_CONCEPTS,
    diagnosticMasteryEvidenceFromEvents(events),
    [],
    generatedAt,
  );
}

function contentVersionKey(contentId: string, version: number): string {
  return `${contentId}@${version}`;
}
