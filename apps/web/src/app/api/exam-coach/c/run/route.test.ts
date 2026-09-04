import { describe, expect, it } from "vitest";

import { C_EXECUTION_LIMITS } from "@/features/exam-coach/core/c-execution";

import { POST } from "./route";

describe("POST /api/exam-coach/c/run", () => {
  it("rejects C source over 32 KiB before sandbox creation", async () => {
    const response = await POST(
      new Request("http://localhost/api/exam-coach/c/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "a".repeat(C_EXECUTION_LIMITS.sourceBytes + 1),
        }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: "source-too-large",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("stops reading an oversized JSON request body before parsing", async () => {
    const response = await POST(
      new Request("http://localhost/api/exam-coach/c/run", {
        method: "POST",
        body: "x".repeat(C_EXECUTION_LIMITS.sourceBytes * 8 + 1),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: "source-too-large",
    });
  });

  it("returns a safe error shape for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/exam-coach/c/run", {
        method: "POST",
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: "sandbox-error",
    });
  });
});
