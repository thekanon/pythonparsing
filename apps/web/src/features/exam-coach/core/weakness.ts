import { listLearningContent } from "./content-catalog";
import type { ContentItem, OfficialDomainId } from "./content-schema";
import { diagnosticMasteryEvidenceFromEvents } from "./diagnostic-readiness";
import { resolveTsFsrsAdapter } from "./fsrs-adapter";
import {
  C_CONCEPTS,
  SQL_CONCEPTS,
  type LearningEvent,
} from "./learning-engine";
import {
  buildConceptMasterySummary,
  canonicalizeMasteryEvidence,
  masteryEvidenceForConceptsFromLearningEvent,
  type ConceptCardMemory,
  type WeaknessKind,
  type WeaknessSignal,
} from "./mastery";
import {
  canonicalizeLearningEvents,
  rebuildMemoryStateFromEvents,
  type FsrsAdapterResolver,
} from "./memory-replay";
import { deriveMasteredConceptIds } from "./today-plan";

const WEAKNESS_CONCEPTS = [...SQL_CONCEPTS, ...C_CONCEPTS] as const;
const CURRICULUM_ORDER_BY_CONCEPT_ID = new Map(
  WEAKNESS_CONCEPTS.map((concept, index) => [concept.id, index] as const),
);
const SIGNAL_ORDER: readonly WeaknessKind[] = [
  "repeated-recall-failure",
  "assistance-dependence",
  "application-failure",
  "review-debt",
];

export interface ConceptWeaknessEntry {
  conceptId: string;
  conceptTitle: string;
  domainId: OfficialDomainId;
  signals: readonly WeaknessSignal[];
  hasEvidence: boolean;
  latestEvidenceAt: string | null;
  dueCardIds: readonly string[];
  prerequisiteGapConceptIds: readonly string[];
}

export interface WeaknessBoard {
  generatedAt: string;
  conceptCount: number;
  conceptsWithEvidence: number;
  entries: readonly ConceptWeaknessEntry[];
}

export interface BuildWeaknessBoardInput {
  events: readonly LearningEvent[];
  now: string;
  content?: readonly ContentItem[];
  resolveAdapter?: FsrsAdapterResolver;
}

interface AssistanceEvidenceSummary {
  count: number;
  latestAt: string | null;
}

export function buildWeaknessBoard(
  input: BuildWeaknessBoardInput,
): WeaknessBoard {
  const nowTimestamp = Date.parse(input.now);
  if (Number.isNaN(nowTimestamp)) {
    throw new Error("now must be a valid date-time");
  }

  const content = input.content ?? listLearningContent();
  const resolveAdapter = input.resolveAdapter ?? resolveTsFsrsAdapter;
  const canonicalEvents = canonicalizeLearningEvents(input.events);
  const regularEvents = canonicalEvents.filter(
    (event) => event.mode !== "assessment",
  );
  const contentById = new Map(content.map((item) => [item.id, item] as const));

  const regularEvidence = regularEvents.flatMap((event) => {
    const item = contentById.get(event.contentId);
    if (
      !item ||
      event.cardId !== item.id ||
      event.contentVersion !== item.version
    ) {
      return [];
    }
    return masteryEvidenceForConceptsFromLearningEvent(event, item.conceptIds);
  });
  const evidence = canonicalizeMasteryEvidence([
    ...regularEvidence,
    ...diagnosticMasteryEvidenceFromEvents(canonicalEvents),
  ]);

  const cardMemories: ConceptCardMemory[] = [];
  for (const item of content) {
    const memory = rebuildMemoryStateFromEvents(
      regularEvents,
      item.id,
      resolveAdapter,
    );
    if (!memory) continue;

    for (const conceptId of new Set(item.conceptIds)) {
      cardMemories.push({ conceptId, memory });
    }
  }

  const assistanceByConceptId = buildAssistanceEvidenceByConcept(
    regularEvents,
    contentById,
  );
  const masteredConceptIds = new Set(
    deriveMasteredConceptIds(canonicalEvents, content),
  );

  const entries = WEAKNESS_CONCEPTS.map((concept) => {
    const summary = buildConceptMasterySummary(
      concept.id,
      evidence,
      cardMemories,
      input.now,
    );
    const dueCardIds = uniqueStrings(
      cardMemories
        .filter(
          (item) =>
            item.conceptId === concept.id &&
            Date.parse(item.memory.dueAt) <= nowTimestamp,
        )
        .map((item) => item.memory.cardId),
    );

    return {
      conceptId: concept.id,
      conceptTitle: concept.title,
      domainId: concept.domainId,
      signals: replaceAssistanceDependenceSignal(
        summary.weaknesses,
        assistanceByConceptId.get(concept.id),
      ),
      hasEvidence: summary.latestEvidenceAt !== null,
      latestEvidenceAt: summary.latestEvidenceAt,
      dueCardIds,
      prerequisiteGapConceptIds: concept.prerequisites.filter(
        (conceptId) => !masteredConceptIds.has(conceptId),
      ),
    } satisfies ConceptWeaknessEntry;
  }).sort(compareWeaknessEntries);

  return {
    generatedAt: input.now,
    conceptCount: WEAKNESS_CONCEPTS.length,
    conceptsWithEvidence: entries.filter((entry) => entry.hasEvidence).length,
    entries,
  };
}

function buildAssistanceEvidenceByConcept(
  events: readonly LearningEvent[],
  contentById: ReadonlyMap<string, ContentItem>,
): ReadonlyMap<string, AssistanceEvidenceSummary> {
  const timestampsByConceptId = new Map<string, string[]>();

  for (const event of events) {
    if (!event.firstSubmission || event.helpLevel === 0) continue;

    const item = contentById.get(event.contentId);
    if (
      !item ||
      event.cardId !== item.id ||
      event.contentVersion !== item.version
    ) {
      continue;
    }

    for (const conceptId of new Set(item.conceptIds)) {
      const timestamps = timestampsByConceptId.get(conceptId) ?? [];
      timestamps.push(event.occurredAt);
      timestampsByConceptId.set(conceptId, timestamps);
    }
  }

  return new Map(
    [...timestampsByConceptId].map(([conceptId, timestamps]) => [
      conceptId,
      {
        count: timestamps.length,
        latestAt: latestDate(timestamps),
      },
    ]),
  );
}

function replaceAssistanceDependenceSignal(
  signals: readonly WeaknessSignal[],
  assistance: AssistanceEvidenceSummary | undefined,
): readonly WeaknessSignal[] {
  const byKind = new Map(
    signals
      .filter((signal) => signal.kind !== "assistance-dependence")
      .map((signal) => [signal.kind, signal] as const),
  );

  // One assisted first submission is a normal learning step. Only repeated
  // first-submission help use (>= 2) signals dependence; corrections do not.
  if (assistance && assistance.count >= 2) {
    byKind.set("assistance-dependence", {
      kind: "assistance-dependence",
      count: assistance.count,
      latestAt: assistance.latestAt,
    });
  }

  return SIGNAL_ORDER.flatMap((kind) => {
    const signal = byKind.get(kind);
    return signal ? [signal] : [];
  });
}

function compareWeaknessEntries(
  left: ConceptWeaknessEntry,
  right: ConceptWeaknessEntry,
): number {
  for (const kind of [
    "review-debt",
    "repeated-recall-failure",
    "application-failure",
    "assistance-dependence",
  ] as const) {
    const difference = signalCount(right, kind) - signalCount(left, kind);
    if (difference !== 0) return difference;
  }

  return curriculumOrder(left.conceptId) - curriculumOrder(right.conceptId);
}

function signalCount(entry: ConceptWeaknessEntry, kind: WeaknessKind): number {
  return entry.signals.find((signal) => signal.kind === kind)?.count ?? 0;
}

function curriculumOrder(conceptId: string): number {
  return (
    CURRICULUM_ORDER_BY_CONCEPT_ID.get(conceptId) ?? Number.MAX_SAFE_INTEGER
  );
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function latestDate(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  return (
    [...values].sort(
      (left, right) => Date.parse(right) - Date.parse(left),
    )[0] ?? null
  );
}
