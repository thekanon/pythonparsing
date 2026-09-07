export const C_EXECUTION_STATUSES = [
  "completed",
  "compile-error",
  "runtime-error",
  "wall-time-limit",
  "cpu-limit",
  "memory-limit",
  "output-limit",
  "process-limit",
  "fd-limit",
  "disk-limit",
  "sandbox-unavailable",
  "sandbox-error",
  "source-too-large",
] as const;

export type CExecutionStatus = (typeof C_EXECUTION_STATUSES)[number];

export interface CExecutionResponse {
  ok: boolean;
  status: CExecutionStatus;
  output?: string;
}

export const C_EXECUTION_LIMITS = {
  sourceBytes: 32 * 1024,
  compileWallMs: 2_000,
  runWallMs: 2_000,
  outerWallMs: 5_000,
  cpuSeconds: 2,
  combinedCpuWallMs: 2_000,
  memoryBytes: 128 * 1024 * 1024,
  outputBytes: 64 * 1024,
  processCount: 8,
  fileDescriptors: 32,
  writableFileBytes: 16 * 1024 * 1024,
} as const;

export function isCExecutionResponse(
  value: unknown,
): value is CExecutionResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.ok === "boolean" &&
    typeof record.status === "string" &&
    C_EXECUTION_STATUSES.some((status) => status === record.status) &&
    record.ok === (record.status === "completed") &&
    (record.output === undefined || typeof record.output === "string")
  );
}
