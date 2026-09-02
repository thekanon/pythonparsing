import type { DiagnosticRunSummary } from "./diagnostic-results";
import type { StorageLike } from "./local-store";

export const EXAM_COACH_PROFILE_STORAGE_KEYS = {
  settings: "exam-coach:v1:settings",
  diagnosticRuns: "exam-coach:v1:diagnostic-runs",
} as const;

export interface StudySettingsInput {
  examDate: string;
  dailyMinutes: number;
  updatedAt: string;
}

export interface LocalStudySettings extends StudySettingsInput {
  schemaVersion: 1;
  learnerId: string;
}

export interface LocalDiagnosticRun {
  schemaVersion: 1;
  runId: string;
  learnerId: string;
  completedAt: string;
  summary: DiagnosticRunSummary;
}

interface PersistedDiagnosticRuns {
  schemaVersion: 1;
  learnerId: string;
  runs: readonly LocalDiagnosticRun[];
}

export function saveLocalStudySettings(
  storage: StorageLike,
  learnerId: string,
  input: StudySettingsInput,
): LocalStudySettings {
  const settings = validateSettings({
    schemaVersion: 1,
    learnerId: normalizeId(learnerId, "learnerId"),
    ...input,
  });

  storage.setItem(
    EXAM_COACH_PROFILE_STORAGE_KEYS.settings,
    JSON.stringify(settings),
  );
  return settings;
}

export function loadLocalStudySettings(
  storage: StorageLike,
  learnerId: string,
): LocalStudySettings | null {
  const normalizedLearnerId = normalizeId(learnerId, "learnerId");
  const raw = storage.getItem(EXAM_COACH_PROFILE_STORAGE_KEYS.settings);
  if (!raw) return null;

  const parsed = parseJson(raw, "stored study settings");
  const settings = validateSettings(parsed);
  if (settings.learnerId !== normalizedLearnerId) {
    throw new Error("stored study settings belong to a different learner");
  }
  return settings;
}

export function appendLocalDiagnosticRun(
  storage: StorageLike,
  learnerId: string,
  runId: string,
  completedAt: string,
  summary: DiagnosticRunSummary,
): readonly LocalDiagnosticRun[] {
  const normalizedLearnerId = normalizeId(learnerId, "learnerId");
  const run: LocalDiagnosticRun = {
    schemaVersion: 1,
    runId: normalizeId(runId, "runId"),
    learnerId: normalizedLearnerId,
    completedAt: validateDateTime(completedAt, "completedAt"),
    summary: validateDiagnosticSummary(summary),
  };

  const existing = loadLocalDiagnosticRuns(storage, normalizedLearnerId);
  const duplicate = existing.find((item) => item.runId === run.runId);
  if (duplicate) {
    if (!sameRun(duplicate, run)) {
      throw new Error("duplicate diagnostic runId has conflicting payload");
    }
    return existing;
  }

  const runs = [...existing, run].sort(compareRuns);
  const envelope: PersistedDiagnosticRuns = {
    schemaVersion: 1,
    learnerId: normalizedLearnerId,
    runs,
  };
  storage.setItem(
    EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns,
    JSON.stringify(envelope),
  );
  return runs;
}

export function loadLocalDiagnosticRuns(
  storage: StorageLike,
  learnerId: string,
): readonly LocalDiagnosticRun[] {
  const normalizedLearnerId = normalizeId(learnerId, "learnerId");
  const raw = storage.getItem(EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns);
  if (!raw) return [];

  const parsed = parseJson(raw, "stored diagnostic runs");
  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    throw new Error("stored diagnostic runs use an unsupported schema");
  }
  if (parsed.learnerId !== normalizedLearnerId) {
    throw new Error("stored diagnostic runs belong to a different learner");
  }
  if (!Array.isArray(parsed.runs)) {
    throw new Error("stored diagnostic runs must contain a runs array");
  }

  const byId = new Map<string, LocalDiagnosticRun>();
  for (const value of parsed.runs) {
    const run = validateRun(value);
    if (run.learnerId !== normalizedLearnerId) {
      throw new Error(
        "stored diagnostic run learnerId does not match guest learner",
      );
    }

    const existing = byId.get(run.runId);
    if (existing && !sameRun(existing, run)) {
      throw new Error("duplicate diagnostic runId has conflicting payload");
    }
    byId.set(run.runId, existing ?? run);
  }
  return [...byId.values()].sort(compareRuns);
}

export function resetLocalProfileData(storage: StorageLike): void {
  storage.removeItem(EXAM_COACH_PROFILE_STORAGE_KEYS.settings);
  storage.removeItem(EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns);
}

function validateSettings(value: unknown): LocalStudySettings {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("study settings use an unsupported schema");
  }

  const learnerId = requireString(value.learnerId, "learnerId");
  const examDate = validateExamDate(requireString(value.examDate, "examDate"));
  const dailyMinutes = requirePositiveInteger(
    value.dailyMinutes,
    "dailyMinutes",
  );
  const updatedAt = validateDateTime(
    requireString(value.updatedAt, "updatedAt"),
    "updatedAt",
  );

  return {
    schemaVersion: 1,
    learnerId,
    examDate,
    dailyMinutes,
    updatedAt,
  };
}

function validateRun(value: unknown): LocalDiagnosticRun {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("stored diagnostic run uses an unsupported schema");
  }

  return {
    schemaVersion: 1,
    runId: requireString(value.runId, "runId"),
    learnerId: requireString(value.learnerId, "learnerId"),
    completedAt: validateDateTime(
      requireString(value.completedAt, "completedAt"),
      "completedAt",
    ),
    summary: validateDiagnosticSummary(value.summary),
  };
}

function validateDiagnosticSummary(value: unknown): DiagnosticRunSummary {
  if (!isRecord(value)) {
    throw new Error("diagnostic summary must be an object");
  }

  const form = value.form;
  if (form !== "baseline" && form !== "followup") {
    throw new Error("diagnostic summary form is invalid");
  }

  const expectedItemCount = requirePositiveInteger(
    value.expectedItemCount,
    "expectedItemCount",
  );
  const attemptedItemCount = requirePositiveInteger(
    value.attemptedItemCount,
    "attemptedItemCount",
  );
  const correctCount = requireNonNegativeInteger(
    value.correctCount,
    "correctCount",
  );
  const totalResponseTimeMs = requireNonNegativeNumber(
    value.totalResponseTimeMs,
    "totalResponseTimeMs",
  );

  if (value.completed !== true) {
    throw new Error("only completed diagnostic runs can be persisted");
  }
  if (attemptedItemCount !== expectedItemCount) {
    throw new Error("completed diagnostic run must attempt every item");
  }
  if (correctCount > attemptedItemCount) {
    throw new Error("diagnostic correctCount exceeds attemptedItemCount");
  }
  if (
    typeof value.accuracy !== "number" ||
    !Number.isFinite(value.accuracy) ||
    value.accuracy !== correctCount / attemptedItemCount
  ) {
    throw new Error("diagnostic accuracy does not match counts");
  }
  if (
    !Array.isArray(value.pairResults) ||
    value.pairResults.length !== expectedItemCount
  ) {
    throw new Error("diagnostic pairResults must match expectedItemCount");
  }

  const pairIds = new Set<string>();
  const pairResults = value.pairResults.map((pair) => {
    if (!isRecord(pair) || typeof pair.correct !== "boolean") {
      throw new Error("diagnostic pair result is invalid");
    }
    const pairId = requireString(pair.pairId, "pairId");
    if (pairIds.has(pairId)) {
      throw new Error("diagnostic pairId must be unique");
    }
    pairIds.add(pairId);
    return { pairId, correct: pair.correct };
  });

  if (pairResults.filter((pair) => pair.correct).length !== correctCount) {
    throw new Error("diagnostic pair results do not match correctCount");
  }

  return {
    setId: requireString(value.setId, "setId"),
    form,
    expectedItemCount,
    attemptedItemCount,
    correctCount,
    accuracy: value.accuracy,
    totalResponseTimeMs,
    completed: true,
    pairResults,
  };
}

function validateExamDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error("examDate must use YYYY-MM-DD");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("examDate must be a valid calendar date");
  }
  return value;
}

function validateDateTime(value: string, field: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid date-time`);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  return normalizeId(value, field);
}

function requirePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be non-negative`);
  }
  return value;
}

function normalizeId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function parseJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} are not valid JSON`);
  }
}

function compareRuns(
  left: LocalDiagnosticRun,
  right: LocalDiagnosticRun,
): number {
  const difference =
    Date.parse(left.completedAt) - Date.parse(right.completedAt);
  return difference || left.runId.localeCompare(right.runId);
}

function sameRun(left: LocalDiagnosticRun, right: LocalDiagnosticRun): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
