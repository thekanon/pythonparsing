import {
  listLearningContent,
  listReviewedLearningContent,
} from "./content-catalog";
import type { ContentItem } from "./content-schema";
import { resolveTsFsrsAdapter } from "./fsrs-adapter";
import type { LearningEvent, MemoryState } from "./learning-engine";
import {
  rebuildMemoryStateFromEvents,
  type FsrsAdapterResolver,
} from "./memory-replay";

const DAY_MS = 86_400_000;
const PREVIEW_DAY_COUNT = 7;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export interface BuildExamDatePlanInput {
  events: readonly LearningEvent[];
  now: string;
  examDate: string;
  dailyMinutes: number;
  settingsUpdatedAt: string;
  timeZoneOffsetMinutes?: number;
  content?: readonly ContentItem[];
  resolveAdapter?: FsrsAdapterResolver;
}

export interface ExamDatePlanPreviewDay {
  date: string;
  label: string;
  reviewMinutes: number;
  newLearningMinutes: number;
  debtRecoveryMinutes: number;
  remainingDueDebtMinutes: number;
  totalMinutes: number;
  recoveryNote: string;
}

export interface ReadyExamDatePlan {
  status: "ready";
  currentDate: string;
  examDate: string;
  daysRemaining: number;
  totalAvailableMinutes: number;
  reviewedContentCount: number;
  studiedReviewedContentCount: number;
  reviewedCoveragePercent: number | null;
  remainingNewContentCount: number;
  remainingNewConceptCount: number;
  remainingNewMinutes: number;
  dueReviewDebtCount: number;
  dueReviewDebtMinutes: number;
  reviewBudgetMinutes: number;
  newLearningBudgetMinutes: number;
  reviewBudgetPercent: number;
  missedStudyDays: number;
  evidenceWindowDays: number;
  preview: readonly ExamDatePlanPreviewDay[];
}

export interface UnavailableExamDatePlan {
  status: "invalid-exam-date" | "past-exam-date";
  currentDate: string;
  examDate: string;
  message: string;
}

export type ExamDatePlan = ReadyExamDatePlan | UnavailableExamDatePlan;

export function buildExamDatePlan(input: BuildExamDatePlanInput): ExamDatePlan {
  const nowTimestamp = parseDateTime(input.now, "now");
  const settingsUpdatedAtTimestamp = parseDateTime(
    input.settingsUpdatedAt,
    "settingsUpdatedAt",
  );
  assertPositiveInteger(input.dailyMinutes, "dailyMinutes");

  const timeZoneOffsetMinutes = input.timeZoneOffsetMinutes ?? 0;
  assertTimeZoneOffset(timeZoneOffsetMinutes);
  const currentDate = dateKeyForTimestamp(nowTimestamp, timeZoneOffsetMinutes);

  if (!isValidDateKey(input.examDate)) {
    return {
      status: "invalid-exam-date",
      currentDate,
      examDate: input.examDate,
      message: "시험 예정일이 올바른 달력 날짜가 아닙니다.",
    };
  }

  const daysRemaining = differenceInCalendarDays(currentDate, input.examDate);
  if (daysRemaining < 0) {
    return {
      status: "past-exam-date",
      currentDate,
      examDate: input.examDate,
      message: `시험 예정일 ${input.examDate}은 현재 날짜 ${currentDate}보다 이전입니다.`,
    };
  }

  const content = input.content ?? listLearningContent();
  const reviewed = listReviewedLearningContent(content);
  const resolveAdapter = input.resolveAdapter ?? resolveTsFsrsAdapter;
  const memoryByCardId = new Map<string, MemoryState | null>();

  for (const item of reviewed) {
    memoryByCardId.set(
      item.id,
      rebuildMemoryStateFromEvents(input.events, item.id, resolveAdapter),
    );
  }

  const studiedReviewed = reviewed.filter((item) =>
    Boolean(memoryByCardId.get(item.id)),
  );
  const remainingNew = reviewed.filter((item) => !memoryByCardId.get(item.id));
  const remainingNewConceptCount = new Set(
    remainingNew.flatMap((item) => item.conceptIds),
  ).size;
  const dueReviewDebt = reviewed.filter((item) => {
    const memory = memoryByCardId.get(item.id);
    return Boolean(memory && Date.parse(memory.dueAt) <= nowTimestamp);
  });
  const dueReviewDebtMinutes = sumEstimatedMinutes(dueReviewDebt);
  const totalAvailableMinutes = daysRemaining * input.dailyMinutes;
  const remainingNewMinutes = sumEstimatedMinutes(remainingNew);
  const reviewShare = reviewShareForDaysRemaining(daysRemaining);
  const hasReviewEvidence = studiedReviewed.length > 0;
  const reviewBudgetMinutes = calculateReviewBudget({
    totalAvailableMinutes,
    dueReviewDebtMinutes,
    remainingNewContentCount: remainingNew.length,
    hasReviewEvidence,
    reviewShare,
  });
  const newLearningBudgetMinutes = Math.max(
    0,
    totalAvailableMinutes - reviewBudgetMinutes,
  );
  const reviewBudgetPercent =
    totalAvailableMinutes === 0
      ? 0
      : Math.round((reviewBudgetMinutes / totalAvailableMinutes) * 100);
  const missedEvidence = calculateMissedStudyEvidence({
    events: input.events,
    currentDate,
    settingsUpdatedAtTimestamp,
    timeZoneOffsetMinutes,
  });

  return {
    status: "ready",
    currentDate,
    examDate: input.examDate,
    daysRemaining,
    totalAvailableMinutes,
    reviewedContentCount: reviewed.length,
    studiedReviewedContentCount: studiedReviewed.length,
    reviewedCoveragePercent:
      reviewed.length === 0
        ? null
        : Math.round((studiedReviewed.length / reviewed.length) * 100),
    remainingNewContentCount: remainingNew.length,
    remainingNewConceptCount,
    remainingNewMinutes,
    dueReviewDebtCount: dueReviewDebt.length,
    dueReviewDebtMinutes,
    reviewBudgetMinutes,
    newLearningBudgetMinutes,
    reviewBudgetPercent,
    missedStudyDays: missedEvidence.missedStudyDays,
    evidenceWindowDays: missedEvidence.evidenceWindowDays,
    preview: buildPreview({
      currentDate,
      daysRemaining,
      dailyMinutes: input.dailyMinutes,
      reviewShare,
      reviewBudgetMinutes,
      newLearningBudgetMinutes,
      dueReviewDebtMinutes,
      remainingNewMinutes,
      hasReviewEvidence,
      missedStudyDays: missedEvidence.missedStudyDays,
    }),
  };
}

interface ReviewBudgetInput {
  totalAvailableMinutes: number;
  dueReviewDebtMinutes: number;
  remainingNewContentCount: number;
  hasReviewEvidence: boolean;
  reviewShare: number;
}

function calculateReviewBudget(input: ReviewBudgetInput): number {
  if (input.totalAvailableMinutes === 0) return 0;
  if (!input.hasReviewEvidence) return 0;
  if (input.remainingNewContentCount === 0) return input.totalAvailableMinutes;

  const policyBudget = Math.ceil(
    input.totalAvailableMinutes * input.reviewShare,
  );
  return Math.min(
    input.totalAvailableMinutes,
    Math.max(policyBudget, input.dueReviewDebtMinutes),
  );
}

interface BuildPreviewInput {
  currentDate: string;
  daysRemaining: number;
  dailyMinutes: number;
  reviewShare: number;
  reviewBudgetMinutes: number;
  newLearningBudgetMinutes: number;
  dueReviewDebtMinutes: number;
  remainingNewMinutes: number;
  hasReviewEvidence: boolean;
  missedStudyDays: number;
}

function buildPreview(
  input: BuildPreviewInput,
): readonly ExamDatePlanPreviewDay[] {
  const previewDays = Math.min(PREVIEW_DAY_COUNT, input.daysRemaining);
  const result: ExamDatePlanPreviewDay[] = [];
  let reviewBudgetRemaining = input.reviewBudgetMinutes;
  let newLearningBudgetRemaining = input.newLearningBudgetMinutes;
  let dueDebtRemaining = input.dueReviewDebtMinutes;
  let newWorkRemaining = input.remainingNewMinutes;

  for (let index = 0; index < previewDays; index += 1) {
    const date = addCalendarDays(input.currentDate, index);
    const debtBeforeDay = dueDebtRemaining;
    let reviewMinutes = 0;
    let debtRecoveryMinutes = 0;

    if (reviewBudgetRemaining > 0 && input.hasReviewEvidence) {
      if (dueDebtRemaining > 0) {
        debtRecoveryMinutes = Math.min(
          input.dailyMinutes,
          dueDebtRemaining,
          reviewBudgetRemaining,
        );
        reviewMinutes = debtRecoveryMinutes;
        dueDebtRemaining -= debtRecoveryMinutes;
      }

      if (dueDebtRemaining === 0 && reviewMinutes < input.dailyMinutes) {
        const policyTarget = Math.ceil(input.dailyMinutes * input.reviewShare);
        reviewMinutes = Math.max(
          reviewMinutes,
          Math.min(policyTarget, input.dailyMinutes, reviewBudgetRemaining),
        );
      }
    }

    reviewMinutes = Math.min(reviewMinutes, reviewBudgetRemaining);
    reviewBudgetRemaining -= reviewMinutes;

    let newLearningMinutes = 0;
    if (dueDebtRemaining === 0 && newWorkRemaining > 0) {
      newLearningMinutes = Math.min(
        input.dailyMinutes - reviewMinutes,
        newLearningBudgetRemaining,
        newWorkRemaining,
      );
      newLearningBudgetRemaining -= newLearningMinutes;
      newWorkRemaining -= newLearningMinutes;
    }

    if (
      dueDebtRemaining === 0 &&
      newWorkRemaining === 0 &&
      reviewBudgetRemaining > 0 &&
      reviewMinutes + newLearningMinutes < input.dailyMinutes
    ) {
      const extraReviewMinutes = Math.min(
        input.dailyMinutes - reviewMinutes - newLearningMinutes,
        reviewBudgetRemaining,
      );
      reviewMinutes += extraReviewMinutes;
      reviewBudgetRemaining -= extraReviewMinutes;
    }

    const totalMinutes = reviewMinutes + newLearningMinutes;
    result.push({
      date,
      label: dateLabel(date),
      reviewMinutes,
      newLearningMinutes,
      debtRecoveryMinutes,
      remainingDueDebtMinutes: dueDebtRemaining,
      totalMinutes,
      recoveryNote: recoveryNote({
        debtBeforeDay,
        debtRecoveryMinutes,
        dueDebtRemaining,
        missedStudyDays: input.missedStudyDays,
      }),
    });
  }

  return result;
}

interface MissedStudyEvidenceInput {
  events: readonly LearningEvent[];
  currentDate: string;
  settingsUpdatedAtTimestamp: number;
  timeZoneOffsetMinutes: number;
}

function calculateMissedStudyEvidence(input: MissedStudyEvidenceInput): {
  missedStudyDays: number;
  evidenceWindowDays: number;
} {
  const settingsDate = dateKeyForTimestamp(
    input.settingsUpdatedAtTimestamp,
    input.timeZoneOffsetMinutes,
  );
  const evidenceWindowDays = Math.max(
    0,
    differenceInCalendarDays(settingsDate, input.currentDate),
  );
  if (evidenceWindowDays === 0) {
    return { missedStudyDays: 0, evidenceWindowDays: 0 };
  }

  const activeDates = new Set<string>();
  for (const event of input.events) {
    if (event.mode === "assessment") continue;
    const occurredAt = Date.parse(event.occurredAt);
    if (Number.isNaN(occurredAt)) continue;
    const activityDate = dateKeyForTimestamp(
      occurredAt,
      input.timeZoneOffsetMinutes,
    );
    if (activityDate >= settingsDate && activityDate < input.currentDate) {
      activeDates.add(activityDate);
    }
  }

  return {
    missedStudyDays: Math.max(0, evidenceWindowDays - activeDates.size),
    evidenceWindowDays,
  };
}

function recoveryNote(input: {
  debtBeforeDay: number;
  debtRecoveryMinutes: number;
  dueDebtRemaining: number;
  missedStudyDays: number;
}): string {
  if (input.debtBeforeDay > 0 && input.dueDebtRemaining > 0) {
    return `복습 부채 ${input.dueDebtRemaining}분을 다음 날로 이월`;
  }
  if (input.debtRecoveryMinutes > 0) {
    return input.missedStudyDays > 0
      ? `미수행 추정 ${input.missedStudyDays}일 · 현재 복습 부채 우선 회복`
      : "현재 복습 부채를 우선 회복";
  }
  if (input.missedStudyDays > 0) {
    return `로컬 기록 기준 미수행 추정 ${input.missedStudyDays}일 · 신규 학습을 일일 상한 안에서 분산`;
  }
  return "일일 상한 안에서 복습·신규 예산 배분";
}

function reviewShareForDaysRemaining(daysRemaining: number): number {
  if (daysRemaining <= 3) return 0.8;
  if (daysRemaining <= 7) return 0.7;
  if (daysRemaining <= 14) return 0.55;
  return 0.4;
}

function sumEstimatedMinutes(content: readonly ContentItem[]): number {
  return content.reduce((sum, item) => sum + item.estimatedMinutes, 0);
}

function dateLabel(dateKey: string): string {
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`);
  const date = new Date(timestamp);
  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} (${weekday})`;
}

function dateKeyForTimestamp(
  timestamp: number,
  timeZoneOffsetMinutes: number,
): string {
  return new Date(timestamp + timeZoneOffsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
}

function differenceInCalendarDays(fromDate: string, toDate: string): number {
  return Math.round(
    (dateKeyTimestamp(toDate) - dateKeyTimestamp(fromDate)) / DAY_MS,
  );
}

function addCalendarDays(dateKey: string, days: number): string {
  return new Date(dateKeyTimestamp(dateKey) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function dateKeyTimestamp(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const timestamp = dateKeyTimestamp(value);
  return (
    !Number.isNaN(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

function parseDateTime(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${field} must be a valid date-time`);
  }
  return timestamp;
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
}

function assertTimeZoneOffset(value: number): void {
  if (!Number.isInteger(value) || value < -840 || value > 840) {
    throw new Error(
      "timeZoneOffsetMinutes must be an integer between -840 and 840",
    );
  }
}
