import { validateContentItem } from "./engine";
import type { DiagnosticAssessmentSet } from "./types";

export function validateDiagnosticAssessmentSet(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["diagnostic set must be an object"];

  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (typeof value.id !== "string" || value.id.trim() === "") {
    errors.push("id must be a non-empty string");
  }
  if (value.form !== "baseline" && value.form !== "followup") {
    errors.push("form must be baseline or followup");
  }
  if (
    typeof value.estimatedMinutes !== "number" ||
    value.estimatedMinutes <= 0
  ) {
    errors.push("estimatedMinutes must be positive");
  }
  if (!Array.isArray(value.items) || value.items.length === 0) {
    errors.push("items must be a non-empty array");
    return errors;
  }

  const pairIds = new Set<string>();
  const setIds = new Set<string>();

  value.items.forEach((item, index) => {
    for (const error of validateContentItem(item)) {
      errors.push(`items[${index}]: ${error}`);
    }
    if (!isRecord(item)) return;

    const assessment = item.assessment;
    if (!isRecord(assessment)) {
      errors.push(`items[${index}]: assessment metadata is required`);
      return;
    }
    if (assessment.form !== value.form) {
      errors.push(`items[${index}]: assessment form must match set form`);
    }
    if (typeof assessment.setId !== "string" || !assessment.setId.trim()) {
      errors.push(`items[${index}]: assessment setId is required`);
    } else {
      setIds.add(assessment.setId);
    }
    if (typeof assessment.pairId !== "string" || !assessment.pairId.trim()) {
      errors.push(`items[${index}]: assessment pairId is required`);
    } else if (pairIds.has(assessment.pairId)) {
      errors.push(`items[${index}]: assessment pairId must be unique`);
    } else {
      pairIds.add(assessment.pairId);
    }
  });

  if (setIds.size > 1) errors.push("all items must share one assessment setId");
  return errors;
}

export function validateIsomorphicAssessmentSets(
  baseline: DiagnosticAssessmentSet,
  followup: DiagnosticAssessmentSet,
): string[] {
  const errors = [
    ...validateDiagnosticAssessmentSet(baseline).map(
      (error) => `baseline: ${error}`,
    ),
    ...validateDiagnosticAssessmentSet(followup).map(
      (error) => `followup: ${error}`,
    ),
  ];

  if (baseline.form !== "baseline") errors.push("baseline form is required");
  if (followup.form !== "followup") errors.push("followup form is required");
  if (baseline.items.length !== followup.items.length) {
    errors.push("assessment forms must contain the same number of items");
    return errors;
  }

  const followupByPair = new Map(
    followup.items.map((item) => [item.assessment?.pairId, item]),
  );

  for (const baselineItem of baseline.items) {
    const pairId = baselineItem.assessment?.pairId;
    const followupItem = followupByPair.get(pairId);
    if (!pairId || !followupItem) {
      errors.push(`${baselineItem.id}: matching followup pair is required`);
      continue;
    }

    if (baselineItem.assessment?.setId !== followupItem.assessment?.setId) {
      errors.push(`${pairId}: assessment setId must match`);
    }
    if (baselineItem.domainId !== followupItem.domainId) {
      errors.push(`${pairId}: domainId must match`);
    }
    if (!sameStrings(baselineItem.conceptIds, followupItem.conceptIds)) {
      errors.push(`${pairId}: conceptIds must match`);
    }
    if (baselineItem.difficulty !== followupItem.difficulty) {
      errors.push(`${pairId}: difficulty must match`);
    }
    if (baselineItem.estimatedMinutes !== followupItem.estimatedMinutes) {
      errors.push(`${pairId}: estimatedMinutes must match`);
    }
    if (baselineItem.prompt === followupItem.prompt) {
      errors.push(`${pairId}: prompts must differ between forms`);
    }
  }

  return errors;
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return [...left].sort().join("\0") === [...right].sort().join("\0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
