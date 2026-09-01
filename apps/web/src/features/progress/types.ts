import { z } from "zod";

export const progressStageSchema = z.object({
  attempts: z.number().int().min(0).max(10_000),
  bestScore: z.number().int().min(0).max(100),
  completedAt: z.iso.datetime().nullable(),
  helped: z.boolean(),
  lastAttemptAt: z.iso.datetime(),
});

export const anonymousProgressSchema = z.object({
  version: z.literal(1),
  stages: z.record(z.string(), progressStageSchema),
});

export type ProgressStage = z.infer<typeof progressStageSchema>;
export type AnonymousProgress = z.infer<typeof anonymousProgressSchema>;

export const MAX_PROGRESS_STAGES_PER_MERGE = 40;

export const EMPTY_ANONYMOUS_PROGRESS: AnonymousProgress = {
  version: 1,
  stages: {},
};

export function progressKey(lessonId: string, stage: "title" | "excerpt") {
  return `${lessonId}:${stage}`;
}
