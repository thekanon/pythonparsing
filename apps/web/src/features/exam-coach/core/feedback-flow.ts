import { contentItemSchema, type ContentItem } from "./content-schema";
import { gradeContentResponse, type GradingResult } from "./grading";
import {
  type FsrsRating,
  type LearningEvent,
  validateLearningEvent,
} from "./learning-engine";

export type HelpLevel = 0 | 1 | 2 | 3 | 4;

export interface FirstSubmissionRecord {
  submittedAt: string;
  responseTimeMs: number;
  result: GradingResult;
}

export interface PracticeSession {
  contentId: string;
  contentVersion: number;
  cardId: string;
  firstSubmission: FirstSubmissionRecord | null;
  correctionAttempts: number;
  helpLevel: HelpLevel;
}

export interface CorrectionOutcome {
  session: PracticeSession;
  result: GradingResult;
}

export interface ConceptClueDisclosure {
  level: 1;
  kind: "concept-clue";
  text: string;
}

export interface StructureHintDisclosure {
  level: 2;
  kind: "structure-hint";
  text: string;
}

export interface SpecificHintDisclosure {
  level: 3;
  kind: "specific-hint";
  text: string;
}

export interface SolutionDisclosure {
  level: 4;
  kind: "solution";
  explanation: string;
  answer: string;
}

export type HelpDisclosure =
  | ConceptClueDisclosure
  | StructureHintDisclosure
  | SpecificHintDisclosure
  | SolutionDisclosure;

export interface HelpOutcome {
  session: PracticeSession;
  disclosure: HelpDisclosure;
}

export interface LearningEventContext {
  eventId: string;
  learnerId: string;
  fsrsVersion: string;
  mode: LearningEvent["mode"];
}

export function startPracticeSession(
  content: unknown,
  cardId: string,
): PracticeSession {
  const item = contentItemSchema.parse(content);
  const normalizedCardId = normalizeId(cardId, "cardId");

  return {
    contentId: item.id,
    contentVersion: item.version,
    cardId: normalizedCardId,
    firstSubmission: null,
    correctionAttempts: 0,
    helpLevel: 0,
  };
}

export function submitFirstResponse(
  session: PracticeSession,
  content: unknown,
  submittedResponse: string,
  submittedAt: string,
  responseTimeMs: number,
): PracticeSession {
  const item = parseMatchingContent(session, content);
  if (session.firstSubmission) {
    throw new Error("first submission is already recorded");
  }

  assertDateTime(submittedAt, "submittedAt");
  assertResponseTime(responseTimeMs);

  return {
    ...session,
    firstSubmission: {
      submittedAt,
      responseTimeMs,
      result: gradeContentResponse(item, submittedResponse),
    },
  };
}

export function submitCorrection(
  session: PracticeSession,
  content: unknown,
  submittedResponse: string,
): CorrectionOutcome {
  const item = parseMatchingContent(session, content);
  const firstSubmission = requireFirstSubmission(session);

  if (firstSubmission.result.correct) {
    throw new Error(
      "correction is only available after an incorrect first submission",
    );
  }

  return {
    session: {
      ...session,
      correctionAttempts: session.correctionAttempts + 1,
    },
    result: gradeContentResponse(item, submittedResponse),
  };
}

export function revealNextHelp(
  session: PracticeSession,
  content: unknown,
): HelpOutcome {
  const item = parseMatchingContent(session, content);
  const firstSubmission = requireFirstSubmission(session);

  if (firstSubmission.result.correct) {
    throw new Error(
      "progressive help is only available after an incorrect first submission",
    );
  }
  if (session.helpLevel >= 4) {
    throw new Error("all progressive help has already been revealed");
  }

  const level = (session.helpLevel + 1) as Exclude<HelpLevel, 0>;
  const disclosure = buildHelpDisclosure(item, level);

  return {
    session: { ...session, helpLevel: level },
    disclosure,
  };
}

// prettier-ignore
export function createLearningEventFromSession(
  session: PracticeSession,
  context: LearningEventContext,
  requestedRating: FsrsRating,
): LearningEvent {
  const firstSubmission = requireFirstSubmission(session);
  const forcedAgain =
    !firstSubmission.result.correct || session.helpLevel > 0;

  if (!forcedAgain && requestedRating === "Again") {
    throw new Error("independent correct answers require Hard, Good, or Easy");
  }

  const event: LearningEvent = {
    eventId: context.eventId,
    occurredAt: firstSubmission.submittedAt,
    learnerId: context.learnerId,
    contentId: session.contentId,
    contentVersion: session.contentVersion,
    cardId: session.cardId,
    correct: firstSubmission.result.correct,
    rating: forcedAgain ? "Again" : requestedRating,
    responseTimeMs: firstSubmission.responseTimeMs,
    helpLevel: session.helpLevel,
    mode: context.mode,
    firstSubmission: true,
    fsrsVersion: context.fsrsVersion,
    ...(firstSubmission.result.errorKinds.length > 0
      ? { errorKinds: firstSubmission.result.errorKinds }
      : {}),
  };

  const errors = validateLearningEvent(event);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return event;
}

function buildHelpDisclosure(
  item: ContentItem,
  level: Exclude<HelpLevel, 0>,
): HelpDisclosure {
  if (level === 4) {
    return {
      level,
      kind: "solution",
      explanation: item.explanation,
      answer: item.answer,
    };
  }

  if (!item.hints) {
    throw new Error("content does not provide progressive hints");
  }

  if (level === 1) {
    return {
      level,
      kind: "concept-clue",
      text: item.hints.conceptClue,
    };
  }
  if (level === 2) {
    return {
      level,
      kind: "structure-hint",
      text: item.hints.structureHint,
    };
  }
  return {
    level,
    kind: "specific-hint",
    text: item.hints.specificHint,
  };
}

function parseMatchingContent(
  session: PracticeSession,
  content: unknown,
): ContentItem {
  const item = contentItemSchema.parse(content);
  if (
    item.id !== session.contentId ||
    item.version !== session.contentVersion
  ) {
    throw new Error("content does not match practice session version");
  }
  return item;
}

function requireFirstSubmission(
  session: PracticeSession,
): FirstSubmissionRecord {
  if (!session.firstSubmission) {
    throw new Error("first submission is required before feedback or help");
  }
  return session.firstSubmission;
}

function normalizeId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function assertDateTime(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid date-time`);
  }
}

function assertResponseTime(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("responseTimeMs must be non-negative");
  }
}
