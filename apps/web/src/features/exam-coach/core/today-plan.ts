import {
  buildRegularLearningNewQueueCandidates,
  listLearningContent,
  listReviewedLearningContent,
} from "./content-catalog";
import type { ContentItem } from "./content-schema";
import { resolveTsFsrsAdapter } from "./fsrs-adapter";
import {
  C_CONCEPTS,
  SQL_CONCEPTS,
  type LearningEvent,
  type MemoryState,
} from "./learning-engine";
import {
  rebuildMemoryStateFromEvents,
  type FsrsAdapterResolver,
} from "./memory-replay";
import {
  buildTodayQueue,
  type ReviewQueueCandidate,
  type TodayQueue,
  type TodayQueueItem,
} from "./today-queue";

const DEFAULT_IMPORTANCE = 3 as const;
const CONCEPT_TITLE_BY_ID = new Map(
  [...SQL_CONCEPTS, ...C_CONCEPTS].map((concept) => [
    concept.id,
    concept.title,
  ] as const),
);

export interface TodayPlanDisplayItem extends TodayQueueItem {
  conceptTitle: string;
  href: string | null;
}

export interface ActualTodayPlan {
  queue: TodayQueue;
  items: readonly TodayPlanDisplayItem[];
  masteredConceptIds: readonly string[];
}

export interface BuildActualTodayPlanInput {
  events: readonly LearningEvent[];
  now: string;
  dailyMinutes: number;
  content?: readonly ContentItem[];
  resolveAdapter?: FsrsAdapterResolver;
}

export function buildActualTodayPlan(
  input: BuildActualTodayPlanInput,
): ActualTodayPlan {
  const nowTimestamp = Date.parse(input.now);
  if (Number.isNaN(nowTimestamp)) throw new Error("now must be a valid date-time");

  const content = input.content ?? listLearningContent();
  const resolveAdapter = input.resolveAdapter ?? resolveTsFsrsAdapter;
  const reviewed = listReviewedLearningContent(content);
  const memoryByCardId = new Map<string, MemoryState | null>();

  // Rebuild every catalog card from the immutable event log. Draft cards are
  // intentionally kept out of the queue even if historical events exist.
  for (const item of content) {
    memoryByCardId.set(
      item.id,
      rebuildMemoryStateFromEvents(input.events, item.id, resolveAdapter),
    );
  }

  const reviewCandidates: ReviewQueueCandidate[] = reviewed.flatMap((item) => {
    const memory = memoryByCardId.get(item.id) ?? null;
    if (!memory || Date.parse(memory.dueAt) > nowTimestamp) return [];
    const conceptId = item.conceptIds[0];
    if (!conceptId) return [];
    return [
      {
        cardId: item.id,
        conceptId,
        estimatedMinutes: item.estimatedMinutes,
        importance: DEFAULT_IMPORTANCE,
        memoryRisk: 1,
        memory,
      },
    ];
  });

  const newCandidates = buildRegularLearningNewQueueCandidates(reviewed).filter(
    (candidate) => !memoryByCardId.get(candidate.cardId),
  );
  const masteredConceptIds = deriveMasteredConceptIds(input.events, content);

  const queue = buildTodayQueue({
    now: input.now,
    timeBudgetMinutes: input.dailyMinutes,
    reviewCandidates,
    newCandidates,
    applicationCandidates: [],
    masteredConceptIds,
  });
  const reviewedById = new Map(reviewed.map((item) => [item.id, item] as const));

  return {
    queue,
    masteredConceptIds,
    items: queue.items.map((item) => {
      const catalogItem = reviewedById.get(item.cardId);
      return {
        ...item,
        conceptTitle: CONCEPT_TITLE_BY_ID.get(item.conceptId) ?? item.conceptId,
        href: catalogItem ? learningHref(catalogItem) : null,
      };
    }),
  };
}

export function deriveMasteredConceptIds(
  events: readonly LearningEvent[],
  content: readonly ContentItem[] = listLearningContent(),
): readonly string[] {
  const contentById = new Map(content.map((item) => [item.id, item] as const));
  const knownConceptIds = content.flatMap((item) => item.conceptIds);
  const mastered = new Set<string>();

  for (const event of events) {
    if (
      event.mode === "assessment" ||
      !event.firstSubmission ||
      !event.correct ||
      event.helpLevel !== 0 ||
      event.rating === "Again"
    ) {
      continue;
    }

    const item = contentById.get(event.contentId);
    if (
      !item ||
      event.cardId !== item.id ||
      event.contentVersion !== item.version
    ) {
      continue;
    }
    for (const conceptId of item.conceptIds) mastered.add(conceptId);
  }

  return knownConceptIds.filter((conceptId) => mastered.has(conceptId));
}

function learningHref(item: ContentItem): string {
  return item.domainId === "sql"
    ? "/exam-coach/learn?unit=sql"
    : "/exam-coach/learn?unit=c";
}
