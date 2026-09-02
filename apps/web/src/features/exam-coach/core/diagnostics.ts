import { z } from "zod";

import { contentItemSchema, validateContentItem } from "./content-schema";

export const diagnosticAssessmentSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().trim().min(1),
    form: z.enum(["baseline", "followup"]),
    estimatedMinutes: z.number().int().positive(),
    items: z.array(contentItemSchema).min(1),
  })
  .strict();

export type DiagnosticAssessmentSet = z.infer<
  typeof diagnosticAssessmentSetSchema
>;

export function validateDiagnosticAssessmentSet(value: unknown): string[] {
  const result = diagnosticAssessmentSetSchema.safeParse(value);
  if (!result.success) {
    return result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
  }

  const set = result.data;
  const errors: string[] = [];
  const pairIds = new Set<string>();
  const setIds = new Set<string>();

  set.items.forEach((item, index) => {
    for (const error of validateContentItem(item)) {
      errors.push(`items[${index}]: ${error}`);
    }
    if (!item.assessment) {
      errors.push(`items[${index}]: assessment metadata is required`);
      return;
    }
    if (item.assessment.form !== set.form) {
      errors.push(`items[${index}]: assessment form must match set form`);
    }
    setIds.add(item.assessment.setId);
    if (pairIds.has(item.assessment.pairId)) {
      errors.push(`items[${index}]: assessment pairId must be unique`);
    }
    pairIds.add(item.assessment.pairId);
  });

  if (setIds.size !== 1) {
    errors.push("all items must share one assessment setId");
  }

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
