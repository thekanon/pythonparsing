import { describe, expect, it, vi } from "vitest";

import { C_EXECUTION_LIMITS } from "@/features/exam-coach/core/c-execution";

import {
  buildRestrictedCommand,
  executeRestrictedC,
  type SecureSandboxCreateOptions,
} from "./c-execution";

describe("restricted C execution boundary", () => {
  it("rejects source over 32 KiB before creating a sandbox", async () => {
    const createSandbox = vi.fn();
    const source = "a".repeat(C_EXECUTION_LIMITS.sourceBytes + 1);

    await expect(executeRestrictedC(source, createSandbox)).resolves.toEqual({
      ok: false,
      status: "source-too-large",
    });
    expect(createSandbox).not.toHaveBeenCalled();
  });

  it("classifies sandbox creation failure as sandbox-unavailable", async () => {
    const createSandbox = vi.fn(async () => {
      throw new Error("credentials unavailable");
    });

    await expect(
      executeRestrictedC("int main(void){return 0;}", createSandbox),
    ).resolves.toEqual({
      ok: false,
      status: "sandbox-unavailable",
    });
  });

  it("creates a disposable deny-all sandbox and runs learner code under restricted non-root commands", async () => {
    const harness = successfulHarness("hello\n");

    const result = await executeRestrictedC(
      '#include <stdio.h>\nint main(void){puts("hello");return 0;}',
      harness.createSandbox,
    );

    expect(result).toEqual({
      ok: true,
      status: "completed",
      output: "hello\n",
    });
    expect(harness.options).toMatchObject({
      persistent: false,
      networkPolicy: "deny-all",
      timeout: C_EXECUTION_LIMITS.outerWallMs,
      resources: { vcpus: 1 },
      env: {},
    });
    expect(harness.createUser).toHaveBeenCalledWith("examlearner", {
      signal: expect.any(AbortSignal),
    });
    expect(harness.writeFiles).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          path: "main.c",
          mode: 0o600,
        }),
      ],
      { signal: expect.any(AbortSignal) },
    );
    expect(harness.learnerCommands).toHaveLength(2);

    for (const command of harness.learnerCommands) {
      expect(command).toMatchObject({
        cmd: "/usr/bin/prlimit",
        cwd: "/home/examlearner",
        sudo: false,
      });
      expect(command.args).toEqual(
        expect.arrayContaining([
          `--cpu=${C_EXECUTION_LIMITS.cpuSeconds}:${C_EXECUTION_LIMITS.cpuSeconds}`,
          `--as=${C_EXECUTION_LIMITS.memoryBytes}:${C_EXECUTION_LIMITS.memoryBytes}`,
          `--nproc=${C_EXECUTION_LIMITS.processCount}:${C_EXECUTION_LIMITS.processCount}`,
          `--nofile=${C_EXECUTION_LIMITS.fileDescriptors}:${C_EXECUTION_LIMITS.fileDescriptors}`,
          `--fsize=${C_EXECUTION_LIMITS.writableFileBytes}:${C_EXECUTION_LIMITS.writableFileBytes}`,
          "/usr/bin/env",
          "-i",
        ]),
      );
    }
    expect(harness.stop).toHaveBeenCalledTimes(1);
  });

  it("caps combined command output and classifies output-limit", async () => {
    const harness = successfulHarness(
      "가".repeat(Math.ceil(C_EXECUTION_LIMITS.outputBytes / 3) + 100),
    );

    const result = await executeRestrictedC(
      "int main(void){return 0;}",
      harness.createSandbox,
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("output-limit");
    expect(Buffer.byteLength(result.output ?? "", "utf8")).toBeLessThanOrEqual(
      C_EXECUTION_LIMITS.outputBytes,
    );
    expect(harness.stop).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["cpu-limit", { runExitCode: 152 }],
    ["memory-limit", { runExitCode: 137 }],
    ["disk-limit", { runExitCode: 153 }],
    ["fd-limit", { runExitCode: 1, runOutput: "Too many open files" }],
    [
      "process-limit",
      { runExitCode: 1, runOutput: "Resource temporarily unavailable" },
    ],
  ] as const)(
    "classifies %s without changing the safe response shape",
    async (status, plan) => {
      const harness = executionHarness(plan);

      const result = await executeRestrictedC(
        "int main(void){return 0;}",
        harness.createSandbox,
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(status);
      expect(
        Object.keys(result).every((key) =>
          ["ok", "status", "output"].includes(key),
        ),
      ).toBe(true);
      expect(harness.stop).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps ordinary compiler and runtime failures distinct from resource limits", async () => {
    const compileFailure = executionHarness({
      compileExitCode: 1,
      compileOutput: "compile diagnostic",
    });
    const runtimeFailure = executionHarness({
      runExitCode: 1,
      runOutput: "runtime diagnostic",
    });

    await expect(
      executeRestrictedC(
        "int main(void){return 0;}",
        compileFailure.createSandbox,
      ),
    ).resolves.toMatchObject({ ok: false, status: "compile-error" });
    await expect(
      executeRestrictedC(
        "int main(void){return 1;}",
        runtimeFailure.createSandbox,
      ),
    ).resolves.toMatchObject({ ok: false, status: "runtime-error" });
  });

  it("builds deterministic process-level limits without sudo", () => {
    const command = buildRestrictedCommand({
      command: "./program",
      args: [],
      homeDir: "/home/examlearner",
      cpuSeconds: C_EXECUTION_LIMITS.cpuSeconds,
    });

    expect(command.sudo).toBe(false);
    expect(command.args).toContain("PATH=/usr/bin:/bin");
    expect(command.args).toContain("HOME=/home/examlearner");
    expect(command.args).toContain("TMPDIR=/home/examlearner");
    expect(command.args.at(-1)).toBe("./program");
  });
});

function successfulHarness(runOutput: string) {
  return executionHarness({ runOutput });
}

function executionHarness(
  plan: {
    compileExitCode?: number;
    compileOutput?: string;
    runExitCode?: number;
    runOutput?: string;
  } = {},
) {
  let options: SecureSandboxCreateOptions | null = null;
  const learnerCommands: Array<{
    cmd: string;
    args?: string[];
    cwd?: string;
    sudo?: boolean;
  }> = [];
  const writeFiles = vi.fn(async () => undefined);
  const stop = vi.fn(async () => undefined);
  const createUser = vi.fn(async () => ({
    homeDir: "/home/examlearner",
    writeFiles,
    runCommand: vi.fn(async (command) => {
      learnerCommands.push(command);
      const isCompile = learnerCommands.length === 1;
      const output = isCompile ? plan.compileOutput : plan.runOutput;
      if (output) command.stderr?.write(output);
      return {
        exitCode: isCompile
          ? (plan.compileExitCode ?? 0)
          : (plan.runExitCode ?? 0),
      };
    }),
  }));
  const sandbox = {
    runCommand: vi.fn(async () => ({ exitCode: 0 })),
    createUser,
    stop,
  };
  const createSandbox = vi.fn(async (input: SecureSandboxCreateOptions) => {
    options = input;
    return sandbox as never;
  });

  return {
    createSandbox,
    createUser,
    writeFiles,
    stop,
    learnerCommands,
    get options() {
      return options;
    },
  };
}
