import { contentItemSchema } from "./content-schema";
// prettier-ignore
import { diagnosticAssessmentSetSchema, type DiagnosticAssessmentSet } from "./diagnostics";
import { gradeContentResponse } from "./grading";
import { type LearningEvent, validateLearningEvent } from "./learning-engine";
import {
  masteryEvidenceForConceptsFromLearningEvent,
  type MasteryEvidence,
} from "./mastery";

export interface DiagnosticAttemptContext {
  eventId: string;
  learnerId: string;
  occurredAt: string;
  responseTimeMs: number;
  fsrsVersion: string;
}

export interface DiagnosticAttemptRecord {
  setId: string;
  pairId: string;
  form: "baseline" | "followup";
  itemId: string;
  contentVersion: number;
  correct: boolean;
  responseTimeMs: number;
  event: LearningEvent;
  evidence: readonly MasteryEvidence[];
}

export interface DiagnosticPairResult {
  pairId: string;
  correct: boolean;
}

export interface DiagnosticRunSummary {
  setId: string;
  form: "baseline" | "followup";
  expectedItemCount: number;
  attemptedItemCount: number;
  correctCount: number;
  accuracy: number | null;
  totalResponseTimeMs: number;
  completed: boolean;
  pairResults: readonly DiagnosticPairResult[];
}

export interface DiagnosticComparison {
  setId: string;
  baselineAccuracy: number;
  followupAccuracy: number;
  accuracyDelta: number;
  pairChanges: readonly {
    pairId: string;
    baselineCorrect: boolean;
    followupCorrect: boolean;
  }[];
}

// prettier-ignore
export function recordDiagnosticAttempt(
  content: unknown,
  submittedResponse: string,
  context: DiagnosticAttemptContext,
): DiagnosticAttemptRecord {
  const item = contentItemSchema.parse(content);
  if (!item.assessment) {
    throw new Error("diagnostic content requires assessment metadata");
  }

  assertContext(context);
  const result = gradeContentResponse(item, submittedResponse);
  const event: LearningEvent = {
    eventId: context.eventId,
    occurredAt: context.occurredAt,
    learnerId: context.learnerId,
    contentId: item.id,
    contentVersion: item.version,
    cardId: `assessment:${item.assessment.setId}:${item.assessment.pairId}`,
    correct: result.correct,
    rating: result.correct ? "Good" : "Again",
    responseTimeMs: context.responseTimeMs,
    helpLevel: 0,
    mode: "assessment",
    firstSubmission: true,
    fsrsVersion: context.fsrsVersion,
  };

  const errors = validateLearningEvent(event);
  if (errors.length > 0) throw new Error(errors.join("; "));

  return {
    setId: item.assessment.setId,
    pairId: item.assessment.pairId,
    form: item.assessment.form,
    itemId: item.id,
    contentVersion: item.version,
    correct: result.correct,
    responseTimeMs: context.responseTimeMs,
    event,
    evidence: masteryEvidenceForConceptsFromLearningEvent(
      event,
      item.conceptIds,
    ),
  };
}

// prettier-ignore
export function summarizeDiagnosticRun(
  setValue: unknown,
  attempts: readonly DiagnosticAttemptRecord[],
): DiagnosticRunSummary {
  const set = diagnosticAssessmentSetSchema.parse(setValue);
  const expectedByPair = new Map(
    set.items.map((item) => [item.assessment?.pairId, item]),
  );
  const seenPairs = new Set<string>();
  const byPair = new Map<string, DiagnosticAttemptRecord>();

  for (const attempt of attempts) {
    const expected = expectedByPair.get(attempt.pairId);
    if (!expected?.assessment) {
      throw new Error(`unknown diagnostic pair: ${attempt.pairId}`);
    }
    if (seenPairs.has(attempt.pairId)) {
      throw new Error(`duplicate diagnostic pair attempt: ${attempt.pairId}`);
    }
    if (
      attempt.setId !== expected.assessment.setId ||
      attempt.form !== set.form ||
      attempt.itemId !== expected.id ||
      attempt.contentVersion !== expected.version
    ) {
      throw new Error(`diagnostic attempt does not match set item: ${attempt.pairId}`);
    }
    if (attempt.event.mode !== "assessment") {
      throw new Error("diagnostic attempts must use assessment events");
    }
    seenPairs.add(attempt.pairId);
    byPair.set(attempt.pairId, attempt);
  }

  const orderedAttempts = set.items
    .map((item) => byPair.get(item.assessment?.pairId ?? ""))
    .filter((attempt): attempt is DiagnosticAttemptRecord => Boolean(attempt));
  const correctCount = orderedAttempts.filter((attempt) => attempt.correct).length;

  return {
    setId: assessmentSetId(set),
    form: set.form,
    expectedItemCount: set.items.length,
    attemptedItemCount: orderedAttempts.length,
    correctCount,
    accuracy:
      orderedAttempts.length === 0 ? null : correctCount / orderedAttempts.length,
    totalResponseTimeMs: orderedAttempts.reduce(
      (total, attempt) => total + attempt.responseTimeMs,
      0,
    ),
    completed: orderedAttempts.length === set.items.length,
    pairResults: orderedAttempts.map((attempt) => ({
      pairId: attempt.pairId,
      correct: attempt.correct,
    })),
  };
}

// prettier-ignore
export function compareDiagnosticRuns(
  baseline: DiagnosticRunSummary,
  followup: DiagnosticRunSummary,
): DiagnosticComparison {
  if (!baseline.completed || !followup.completed) {
    throw new Error("both diagnostic runs must be complete before comparison");
  }
  if (baseline.form !== "baseline" || followup.form !== "followup") {
    throw new Error("baseline and followup forms are required");
  }
  if (baseline.setId !== followup.setId) {
    throw new Error("diagnostic runs must use the same assessment set");
  }
  if (baseline.accuracy === null || followup.accuracy === null) {
    throw new Error("completed diagnostic runs require accuracy");
  }

  const followupByPair = new Map(
    followup.pairResults.map((result) => [result.pairId, result]),
  );
  if (baseline.pairResults.length !== followup.pairResults.length) {
    throw new Error("diagnostic runs must contain the same skill pairs");
  }

  const pairChanges = baseline.pairResults.map((baselineResult) => {
    const followupResult = followupByPair.get(baselineResult.pairId);
    if (!followupResult) {
      throw new Error(`missing followup pair: ${baselineResult.pairId}`);
    }
    return {
      pairId: baselineResult.pairId,
      baselineCorrect: baselineResult.correct,
      followupCorrect: followupResult.correct,
    };
  });

  return {
    setId: baseline.setId,
    baselineAccuracy: baseline.accuracy,
    followupAccuracy: followup.accuracy,
    accuracyDelta: followup.accuracy - baseline.accuracy,
    pairChanges,
  };
}

function assessmentSetId(set: DiagnosticAssessmentSet): string {
  const setId = set.items[0]?.assessment?.setId;
  if (!setId) throw new Error("diagnostic set requires assessment setId");
  return setId;
}

function assertContext(context: DiagnosticAttemptContext): void {
  if (!context.eventId.trim()) throw new Error("eventId is required");
  if (!context.learnerId.trim()) throw new Error("learnerId is required");
  if (!context.fsrsVersion.trim()) throw new Error("fsrsVersion is required");
  if (Number.isNaN(Date.parse(context.occurredAt))) {
    throw new Error("occurredAt must be a valid date-time");
  }
  if (!Number.isFinite(context.responseTimeMs) || context.responseTimeMs < 0) {
    throw new Error("responseTimeMs must be non-negative");
  }
}
