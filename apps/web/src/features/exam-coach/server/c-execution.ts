import "server-only";

import { Writable } from "node:stream";

import { Sandbox } from "@vercel/sandbox";

import {
  C_EXECUTION_LIMITS,
  type CExecutionResponse,
  type CExecutionStatus,
} from "@/features/exam-coach/core/c-execution";

const DEFAULT_SANDBOX_IMAGE = "vercel/sandbox/universal:latest";
const LEARNER_USERNAME = "examlearner";
const TOOLCHAIN_CHECK_TIMEOUT_MS = 500;
const TOOLCHAIN_CHECK =
  "test -x /usr/bin/cc && test -x /usr/bin/prlimit && test -x /usr/bin/env";

interface SandboxCommandResultLike {
  exitCode: number;
}

interface SandboxUserLike {
  homeDir: string;
  writeFiles(
    files: { path: string; content: string | Uint8Array; mode?: number }[],
    opts?: { signal?: AbortSignal },
  ): Promise<void>;
  runCommand(params: SandboxCommandParams): Promise<SandboxCommandResultLike>;
}

interface SandboxLike {
  runCommand(params: SandboxCommandParams): Promise<SandboxCommandResultLike>;
  createUser(
    username: string,
    opts?: { signal?: AbortSignal },
  ): Promise<SandboxUserLike>;
  stop(): Promise<unknown>;
}

interface SandboxCommandParams {
  cmd: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  sudo?: boolean;
  stdout?: Writable;
  stderr?: Writable;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface SecureSandboxCreateOptions {
  image: string;
  persistent: false;
  networkPolicy: "deny-all";
  timeout: number;
  resources: { vcpus: 1 };
  env: Record<string, never>;
  signal: AbortSignal;
}

export type CSandboxFactory = (
  options: SecureSandboxCreateOptions,
) => Promise<SandboxLike>;

interface LimitedCommandOutcome {
  exitCode: number | null;
  output: string;
  wallTimedOut: boolean;
  outerTimedOut: boolean;
  outputLimited: boolean;
  cpuBudgetTimedOut: boolean;
  transportFailed: boolean;
}

export function buildSecureSandboxCreateOptions(
  signal: AbortSignal,
  image = process.env.EXAM_COACH_C_SANDBOX_IMAGE?.trim() ||
    DEFAULT_SANDBOX_IMAGE,
): SecureSandboxCreateOptions {
  return {
    image,
    persistent: false,
    networkPolicy: "deny-all",
    timeout: C_EXECUTION_LIMITS.outerWallMs,
    resources: { vcpus: 1 },
    env: {},
    signal,
  };
}

export function buildRestrictedCommand(input: {
  command: string;
  args: readonly string[];
  homeDir: string;
  cpuSeconds: number;
}): { cmd: string; args: string[]; cwd: string; sudo: false } {
  const limits = C_EXECUTION_LIMITS;
  const envArgs = [
    "-i",
    `HOME=${input.homeDir}`,
    `TMPDIR=${input.homeDir}`,
    "PATH=/usr/bin:/bin",
  ];

  return {
    cmd: "/usr/bin/prlimit",
    args: [
      `--cpu=${input.cpuSeconds}:${input.cpuSeconds}`,
      `--as=${limits.memoryBytes}:${limits.memoryBytes}`,
      `--nproc=${limits.processCount}:${limits.processCount}`,
      `--nofile=${limits.fileDescriptors}:${limits.fileDescriptors}`,
      `--fsize=${limits.writableFileBytes}:${limits.writableFileBytes}`,
      "--",
      "/usr/bin/env",
      ...envArgs,
      input.command,
      ...input.args,
    ],
    cwd: input.homeDir,
    sudo: false,
  };
}

export async function executeRestrictedC(
  source: string,
  createSandbox: CSandboxFactory = createVercelSandbox,
): Promise<CExecutionResponse> {
  if (Buffer.byteLength(source, "utf8") > C_EXECUTION_LIMITS.sourceBytes) {
    return { ok: false, status: "source-too-large" };
  }

  const outerController = new AbortController();
  let outerTimedOut = false;
  const outerTimer = setTimeout(() => {
    outerTimedOut = true;
    outerController.abort();
  }, C_EXECUTION_LIMITS.outerWallMs);

  let sandbox: SandboxLike | null = null;

  try {
    try {
      sandbox = await createSandbox(
        buildSecureSandboxCreateOptions(outerController.signal),
      );
    } catch {
      return outerTimedOut
        ? { ok: false, status: "wall-time-limit" }
        : { ok: false, status: "sandbox-unavailable" };
    }

    const toolchain = await checkToolchain(sandbox, outerController.signal);
    if (!toolchain) {
      return outerTimedOut
        ? { ok: false, status: "wall-time-limit" }
        : { ok: false, status: "sandbox-unavailable" };
    }

    let learner: SandboxUserLike;
    try {
      learner = await sandbox.createUser(LEARNER_USERNAME, {
        signal: outerController.signal,
      });
      await learner.writeFiles(
        [{ path: "main.c", content: source, mode: 0o600 }],
        { signal: outerController.signal },
      );
    } catch {
      return outerTimedOut
        ? { ok: false, status: "wall-time-limit" }
        : { ok: false, status: "sandbox-error" };
    }

    const output = new BoundedOutput(C_EXECUTION_LIMITS.outputBytes);
    const cpuBudgetController = new AbortController();
    let cpuBudgetTimedOut = false;
    const cpuBudgetTimer = setTimeout(() => {
      cpuBudgetTimedOut = true;
      cpuBudgetController.abort();
    }, C_EXECUTION_LIMITS.combinedCpuWallMs);
    const compile = await runLimitedCommand({
      learner,
      command: "/usr/bin/cc",
      args: [
        "-std=c17",
        "-O0",
        "-fno-diagnostics-color",
        "main.c",
        "-o",
        "program",
      ],
      wallMs: C_EXECUTION_LIMITS.compileWallMs,
      outerSignal: outerController.signal,
      outerTimedOut: () => outerTimedOut,
      cpuBudgetSignal: cpuBudgetController.signal,
      cpuBudgetTimedOut: () => cpuBudgetTimedOut,
      output,
      cpuSeconds: C_EXECUTION_LIMITS.cpuSeconds,
    });
    const compileStatus = classifyLimitedCommand(compile, "compile-error");
    if (compileStatus) {
      clearTimeout(cpuBudgetTimer);
      return responseForStatus(compileStatus, compile.output);
    }

    const run = await runLimitedCommand({
      learner,
      command: "./program",
      args: [],
      wallMs: C_EXECUTION_LIMITS.runWallMs,
      outerSignal: outerController.signal,
      outerTimedOut: () => outerTimedOut,
      cpuBudgetSignal: cpuBudgetController.signal,
      cpuBudgetTimedOut: () => cpuBudgetTimedOut,
      output,
      cpuSeconds: C_EXECUTION_LIMITS.cpuSeconds,
    });
    const runStatus = classifyLimitedCommand(run, "runtime-error");
    if (runStatus) {
      clearTimeout(cpuBudgetTimer);
      return responseForStatus(runStatus, run.output);
    }

    clearTimeout(cpuBudgetTimer);
    return responseForStatus("completed", run.output);
  } finally {
    clearTimeout(outerTimer);
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // Cleanup failures must not expose diagnostics or retain learner source in app logs.
      }
    }
  }
}

async function createVercelSandbox(
  options: SecureSandboxCreateOptions,
): Promise<SandboxLike> {
  return Sandbox.create({
    image: options.image,
    persistent: options.persistent,
    networkPolicy: options.networkPolicy,
    timeout: options.timeout,
    resources: options.resources,
    env: options.env,
    signal: options.signal,
  });
}

async function checkToolchain(
  sandbox: SandboxLike,
  signal: AbortSignal,
): Promise<boolean> {
  try {
    const result = await sandbox.runCommand({
      cmd: "/bin/sh",
      args: ["-lc", TOOLCHAIN_CHECK],
      sudo: false,
      timeoutMs: TOOLCHAIN_CHECK_TIMEOUT_MS,
      signal,
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

async function runLimitedCommand(input: {
  learner: SandboxUserLike;
  command: string;
  args: readonly string[];
  wallMs: number;
  outerSignal: AbortSignal;
  outerTimedOut: () => boolean;
  cpuBudgetSignal: AbortSignal;
  cpuBudgetTimedOut: () => boolean;
  output: BoundedOutput;
  cpuSeconds: number;
}): Promise<LimitedCommandOutcome> {
  let wallTimedOut = false;
  const wallController = new AbortController();
  const wallTimer = setTimeout(() => {
    wallTimedOut = true;
    wallController.abort();
  }, input.wallMs);
  const signal = AbortSignal.any([
    input.outerSignal,
    wallController.signal,
    input.cpuBudgetSignal,
    input.output.signal,
  ]);
  const restricted = buildRestrictedCommand({
    command: input.command,
    args: input.args,
    homeDir: input.learner.homeDir,
    cpuSeconds: input.cpuSeconds,
  });

  try {
    const result = await input.learner.runCommand({
      ...restricted,
      stdout: input.output.createSink(),
      stderr: input.output.createSink(),
      signal,
      timeoutMs: input.wallMs,
    });
    return {
      exitCode: result.exitCode,
      output: input.output.text(),
      wallTimedOut,
      outerTimedOut: input.outerTimedOut(),
      outputLimited: input.output.exceeded,
      cpuBudgetTimedOut: input.cpuBudgetTimedOut(),
      transportFailed: false,
    };
  } catch {
    return {
      exitCode: null,
      output: input.output.text(),
      wallTimedOut,
      outerTimedOut: input.outerTimedOut(),
      outputLimited: input.output.exceeded,
      cpuBudgetTimedOut: input.cpuBudgetTimedOut(),
      transportFailed: true,
    };
  } finally {
    clearTimeout(wallTimer);
  }
}

function classifyLimitedCommand(
  outcome: LimitedCommandOutcome,
  fallback: "compile-error" | "runtime-error",
): CExecutionStatus | null {
  if (outcome.outputLimited) return "output-limit";
  if (outcome.outerTimedOut || outcome.wallTimedOut) return "wall-time-limit";
  if (outcome.cpuBudgetTimedOut) return "cpu-limit";

  const resourceLimit = classifyResourceLimit(outcome.exitCode, outcome.output);
  if (resourceLimit) return resourceLimit;
  if (outcome.transportFailed) return "sandbox-error";
  if (outcome.exitCode !== 0) return fallback;
  return null;
}

function classifyResourceLimit(
  exitCode: number | null,
  output: string,
): CExecutionStatus | null {
  const normalized = output.toLocaleLowerCase();

  if (exitCode === 152 || normalized.includes("cpu time limit exceeded")) {
    return "cpu-limit";
  }
  if (
    exitCode === 153 ||
    normalized.includes("file size limit exceeded") ||
    normalized.includes("no space left on device")
  ) {
    return "disk-limit";
  }
  if (
    exitCode === 137 ||
    normalized.includes("cannot allocate memory") ||
    normalized.includes("out of memory") ||
    normalized.includes("memory exhausted") ||
    normalized.includes("virtual memory exhausted")
  ) {
    return "memory-limit";
  }
  if (
    normalized.includes("too many open files") ||
    normalized.includes("error 24")
  ) {
    return "fd-limit";
  }
  if (
    normalized.includes("cannot fork") ||
    normalized.includes("resource temporarily unavailable") ||
    normalized.includes("fork: retry")
  ) {
    return "process-limit";
  }
  return null;
}

function responseForStatus(
  status: CExecutionStatus,
  output: string,
): CExecutionResponse {
  const safeOutput = truncateUtf8(output, C_EXECUTION_LIMITS.outputBytes);
  return {
    ok: status === "completed",
    status,
    ...(safeOutput ? { output: safeOutput } : {}),
  };
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;

  const characters: string[] = [];
  let byteLength = 0;
  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (byteLength + characterBytes > maxBytes) break;
    characters.push(character);
    byteLength += characterBytes;
  }
  return characters.join("");
}

class BoundedOutput {
  private readonly chunks: Buffer[] = [];
  private byteLength = 0;
  private readonly controller = new AbortController();
  exceeded = false;

  constructor(private readonly maxBytes: number) {}

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  createSink(): Writable {
    return new Writable({
      write: (chunk: Buffer | string, encoding, callback) => {
        const bytes = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk, encoding as BufferEncoding);
        const remaining = Math.max(0, this.maxBytes - this.byteLength);
        if (remaining > 0) {
          const kept = bytes.subarray(0, remaining);
          this.chunks.push(Buffer.from(kept));
          this.byteLength += kept.byteLength;
        }
        if (bytes.byteLength > remaining && !this.exceeded) {
          this.exceeded = true;
          this.controller.abort();
        }
        callback();
      },
    });
  }

  text(): string {
    return truncateUtf8(
      Buffer.concat(this.chunks, this.byteLength).toString("utf8"),
      this.maxBytes,
    );
  }
}
