import type { OfficialDomainId } from "./content-schema";
import type {
  ConceptNode,
  LearningEvent,
  MemoryState,
} from "./learning-engine";
import { validateLearningEvent } from "./learning-engine";

export const MASTERY_EVIDENCE_KINDS = [
  "understanding",
  "recall",
  "application",
  "assessment",
] as const;

export type MasteryEvidenceKind = (typeof MASTERY_EVIDENCE_KINDS)[number];

export interface MasteryEvidence {
  evidenceId: string;
  occurredAt: string;
  conceptId: string;
  kind: MasteryEvidenceKind;
  correct: boolean;
  independent: boolean;
  responseTimeMs: number;
  sourceId: string;
}

export interface ConceptCardMemory {
  conceptId: string;
  memory: MemoryState;
}

export interface EvidenceDimensionSummary {
  attempts: number;
  correct: number;
  independentAttempts: number;
  independentCorrect: number;
  independentSuccessRate: number | null;
  latestEvidenceAt: string | null;
  latestIndependentCorrectAt: string | null;
}

export interface ConceptMemorySummary {
  cardCount: number;
  dueCount: number;
  nextDueAt: string | null;
}

export type WeaknessKind =
  | "repeated-recall-failure"
  | "assistance-dependence"
  | "application-failure"
  | "review-debt";

export interface WeaknessSignal {
  kind: WeaknessKind;
  count: number;
  latestAt: string | null;
}

export interface ConceptMasterySummary {
  conceptId: string;
  latestEvidenceAt: string | null;
  evidenceCoverage: number;
  understanding: EvidenceDimensionSummary;
  recall: EvidenceDimensionSummary;
  application: EvidenceDimensionSummary;
  assessment: EvidenceDimensionSummary;
  memory: ConceptMemorySummary;
  weaknesses: readonly WeaknessSignal[];
}

export interface ReadinessMetric {
  attempts: number;
  correct: number;
  rate: number | null;
}

export interface DomainReadinessSummary {
  domainId: OfficialDomainId;
  conceptCount: number;
  conceptsWithEvidence: number;
  evidenceCoverageRate: number | null;
  independentRecall: ReadinessMetric;
  independentApplication: ReadinessMetric;
  assessment: ReadinessMetric;
  dueReviewCount: number;
  latestIndependentEvidenceAt: string | null;
}

export interface ReadinessReport {
  generatedAt: string;
  conceptCount: number;
  conceptsWithEvidence: number;
  evidenceCoverageRate: number | null;
  independentRecall: ReadinessMetric;
  independentApplication: ReadinessMetric;
  assessment: ReadinessMetric;
  dueReviewCount: number;
  domains: readonly DomainReadinessSummary[];
}

export function masteryEvidenceFromLearningEvent(
  event: LearningEvent,
  conceptId: string,
): MasteryEvidence {
  const errors = validateLearningEvent(event);
  if (errors.length > 0) throw new Error(errors.join("; "));

  return {
    evidenceId: event.eventId,
    occurredAt: event.occurredAt,
    conceptId: normalizeId(conceptId, "conceptId"),
    kind: event.mode,
    correct: event.correct,
    independent: event.firstSubmission && event.helpLevel === 0,
    responseTimeMs: event.responseTimeMs,
    sourceId: event.contentId,
  };
}

export function canonicalizeMasteryEvidence(
  evidence: readonly MasteryEvidence[],
): readonly MasteryEvidence[] {
  const byId = new Map<string, MasteryEvidence>();

  for (const item of evidence) {
    const validated = validateMasteryEvidence(item);
    const existing = byId.get(validated.evidenceId);
    if (existing && !sameEvidence(existing, validated)) {
      throw new Error("duplicate evidenceId has conflicting payload");
    }
    byId.set(validated.evidenceId, existing ?? validated);
  }

  return [...byId.values()].sort(compareEvidence);
}

// prettier-ignore
export function buildConceptMasterySummary(
  conceptId: string,
  evidence: readonly MasteryEvidence[],
  cardMemories: readonly ConceptCardMemory[],
  now: string,
): ConceptMasterySummary {
  const normalizedConceptId = normalizeId(conceptId, "conceptId");
  const nowTimestamp = parseDateTime(now, "now");
  const conceptEvidence = canonicalizeMasteryEvidence(evidence).filter(
    (item) => item.conceptId === normalizedConceptId,
  );
  const memories = cardMemories
    .map(validateConceptCardMemory)
    .filter((item) => item.conceptId === normalizedConceptId);

  const understanding = summarizeDimension(conceptEvidence, "understanding");
  const recall = summarizeDimension(conceptEvidence, "recall");
  const application = summarizeDimension(conceptEvidence, "application");
  const assessment = summarizeDimension(conceptEvidence, "assessment");
  const memory = summarizeMemory(memories, nowTimestamp);

  return {
    conceptId: normalizedConceptId,
    latestEvidenceAt: latestDate(conceptEvidence.map((item) => item.occurredAt)),
    evidenceCoverage: [understanding, recall, application, assessment].filter(
      (summary) => summary.attempts > 0,
    ).length,
    understanding,
    recall,
    application,
    assessment,
    memory,
    weaknesses: buildWeaknessSignals(
      conceptEvidence,
      recall,
      application,
      memory,
    ),
  };
}

// prettier-ignore
export function buildReadinessReport(
  concepts: readonly ConceptNode[],
  evidence: readonly MasteryEvidence[],
  cardMemories: readonly ConceptCardMemory[],
  now: string,
): ReadinessReport {
  parseDateTime(now, "now");
  const canonicalEvidence = canonicalizeMasteryEvidence(evidence);
  const validatedMemories = cardMemories.map(validateConceptCardMemory);
  const conceptIds = new Set<string>();

  for (const concept of concepts) {
    const conceptId = normalizeId(concept.id, "concept.id");
    if (conceptIds.has(conceptId)) {
      throw new Error(`duplicate concept id: ${conceptId}`);
    }
    conceptIds.add(conceptId);
  }

  const knownEvidence = canonicalEvidence.filter((item) =>
    conceptIds.has(item.conceptId),
  );
  const knownMemories = validatedMemories.filter((item) =>
    conceptIds.has(item.conceptId),
  );
  const summaries = concepts.map((concept) =>
    buildConceptMasterySummary(
      concept.id,
      knownEvidence,
      knownMemories,
      now,
    ),
  );
  const conceptsWithEvidence = summaries.filter(
    (summary) => summary.latestEvidenceAt !== null,
  ).length;
  const domains = [...new Set(concepts.map((concept) => concept.domainId))].map(
    (domainId) =>
      buildDomainReadiness(
        domainId,
        concepts,
        knownEvidence,
        summaries,
      ),
  );

  return {
    generatedAt: now,
    conceptCount: concepts.length,
    conceptsWithEvidence,
    evidenceCoverageRate: rate(conceptsWithEvidence, concepts.length),
    independentRecall: metricFor(knownEvidence, "recall", true),
    independentApplication: metricFor(knownEvidence, "application", true),
    assessment: metricFor(knownEvidence, "assessment", false),
    dueReviewCount: summaries.reduce(
      (total, summary) => total + summary.memory.dueCount,
      0,
    ),
    domains,
  };
}

// prettier-ignore
function buildDomainReadiness(
  domainId: OfficialDomainId,
  concepts: readonly ConceptNode[],
  evidence: readonly MasteryEvidence[],
  summaries: readonly ConceptMasterySummary[],
): DomainReadinessSummary {
  const domainConcepts = concepts.filter(
    (concept) => concept.domainId === domainId,
  );
  const conceptIds = new Set(domainConcepts.map((concept) => concept.id));
  const domainEvidence = evidence.filter((item) =>
    conceptIds.has(item.conceptId),
  );
  const domainSummaries = summaries.filter((summary) =>
    conceptIds.has(summary.conceptId),
  );
  const conceptsWithEvidence = domainSummaries.filter(
    (summary) => summary.latestEvidenceAt !== null,
  ).length;
  const independentEvidence = domainEvidence.filter((item) => item.independent);

  return {
    domainId,
    conceptCount: domainConcepts.length,
    conceptsWithEvidence,
    evidenceCoverageRate: rate(conceptsWithEvidence, domainConcepts.length),
    independentRecall: metricFor(domainEvidence, "recall", true),
    independentApplication: metricFor(domainEvidence, "application", true),
    assessment: metricFor(domainEvidence, "assessment", false),
    dueReviewCount: domainSummaries.reduce(
      (total, summary) => total + summary.memory.dueCount,
      0,
    ),
    latestIndependentEvidenceAt: latestDate(
      independentEvidence.map((item) => item.occurredAt),
    ),
  };
}

function summarizeDimension(
  evidence: readonly MasteryEvidence[],
  kind: MasteryEvidenceKind,
): EvidenceDimensionSummary {
  const attempts = evidence.filter((item) => item.kind === kind);
  const independent = attempts.filter((item) => item.independent);
  const independentCorrect = independent.filter((item) => item.correct);

  return {
    attempts: attempts.length,
    correct: attempts.filter((item) => item.correct).length,
    independentAttempts: independent.length,
    independentCorrect: independentCorrect.length,
    independentSuccessRate: rate(independentCorrect.length, independent.length),
    latestEvidenceAt: latestDate(attempts.map((item) => item.occurredAt)),
    latestIndependentCorrectAt: latestDate(
      independentCorrect.map((item) => item.occurredAt),
    ),
  };
}

function summarizeMemory(
  memories: readonly ConceptCardMemory[],
  nowTimestamp: number,
): ConceptMemorySummary {
  return {
    cardCount: memories.length,
    dueCount: memories.filter(
      (item) => Date.parse(item.memory.dueAt) <= nowTimestamp,
    ).length,
    nextDueAt: earliestDate(memories.map((item) => item.memory.dueAt)),
  };
}

// prettier-ignore
function buildWeaknessSignals(
  evidence: readonly MasteryEvidence[],
  recall: EvidenceDimensionSummary,
  application: EvidenceDimensionSummary,
  memory: ConceptMemorySummary,
): readonly WeaknessSignal[] {
  const signals: WeaknessSignal[] = [];
  const recallFailures = recall.independentAttempts - recall.independentCorrect;
  const applicationFailures =
    application.independentAttempts - application.independentCorrect;
  const assisted = evidence.filter((item) => !item.independent);

  if (recallFailures >= 2) {
    signals.push({
      kind: "repeated-recall-failure",
      count: recallFailures,
      latestAt: latestDate(
        evidence
          .filter(
            (item) =>
              item.kind === "recall" && item.independent && !item.correct,
          )
          .map((item) => item.occurredAt),
      ),
    });
  }
  if (assisted.length >= 2) {
    signals.push({
      kind: "assistance-dependence",
      count: assisted.length,
      latestAt: latestDate(assisted.map((item) => item.occurredAt)),
    });
  }
  if (applicationFailures >= 2) {
    signals.push({
      kind: "application-failure",
      count: applicationFailures,
      latestAt: latestDate(
        evidence
          .filter(
            (item) =>
              item.kind === "application" && item.independent && !item.correct,
          )
          .map((item) => item.occurredAt),
      ),
    });
  }
  if (memory.dueCount > 0) {
    signals.push({
      kind: "review-debt",
      count: memory.dueCount,
      latestAt: memory.nextDueAt,
    });
  }

  return signals;
}

function metricFor(
  evidence: readonly MasteryEvidence[],
  kind: MasteryEvidenceKind,
  independentOnly: boolean,
): ReadinessMetric {
  const attempts = evidence.filter(
    (item) => item.kind === kind && (!independentOnly || item.independent),
  );
  const correct = attempts.filter((item) => item.correct).length;
  return {
    attempts: attempts.length,
    correct,
    rate: rate(correct, attempts.length),
  };
}

function validateMasteryEvidence(item: MasteryEvidence): MasteryEvidence {
  const evidenceId = normalizeId(item.evidenceId, "evidenceId");
  const conceptId = normalizeId(item.conceptId, "conceptId");
  const sourceId = normalizeId(item.sourceId, "sourceId");
  parseDateTime(item.occurredAt, "occurredAt");

  if (!MASTERY_EVIDENCE_KINDS.includes(item.kind)) {
    throw new Error("invalid mastery evidence kind");
  }
  if (!Number.isFinite(item.responseTimeMs) || item.responseTimeMs < 0) {
    throw new Error("responseTimeMs must be non-negative");
  }
  return { ...item, evidenceId, conceptId, sourceId };
}

function validateConceptCardMemory(item: ConceptCardMemory): ConceptCardMemory {
  const conceptId = normalizeId(item.conceptId, "conceptId");
  normalizeId(item.memory.cardId, "memory.cardId");
  normalizeId(item.memory.fsrsVersion, "memory.fsrsVersion");
  parseDateTime(item.memory.dueAt, "memory.dueAt");
  return { ...item, conceptId };
}

function sameEvidence(left: MasteryEvidence, right: MasteryEvidence): boolean {
  return (
    left.evidenceId === right.evidenceId &&
    left.occurredAt === right.occurredAt &&
    left.conceptId === right.conceptId &&
    left.kind === right.kind &&
    left.correct === right.correct &&
    left.independent === right.independent &&
    left.responseTimeMs === right.responseTimeMs &&
    left.sourceId === right.sourceId
  );
}

// prettier-ignore
function compareEvidence(left: MasteryEvidence, right: MasteryEvidence): number {
  const timeDifference =
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
  return timeDifference || left.evidenceId.localeCompare(right.evidenceId);
}

// prettier-ignore
function latestDate(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  return [...values].sort(
    (left, right) => Date.parse(right) - Date.parse(left),
  )[0] ?? null;
}

// prettier-ignore
function earliestDate(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  return [...values].sort(
    (left, right) => Date.parse(left) - Date.parse(right),
  )[0] ?? null;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function normalizeId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function parseDateTime(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${field} must be a valid date-time`);
  }
  return timestamp;
}
