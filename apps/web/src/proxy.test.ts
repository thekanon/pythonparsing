import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("legacy hostname proxy", () => {
  it("redirects the old hostname while preserving the path and query", () => {
    const request = new NextRequest(
      "http://127.0.0.1:3300/books/daddy-long-legs?from=old",
      { headers: { host: "newsorder.doowiki.dev" } },
    );

    const response = proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://sentence.doowiki.dev/books/daddy-long-legs?from=old",
    );
  });

  it("does not redirect the canonical hostname", () => {
    const request = new NextRequest("http://127.0.0.1:3300/today", {
      headers: { host: "sentence.doowiki.dev" },
    });

    expect(proxy(request).status).toBe(200);
  });

  it("keeps the legacy storage bridge available on the old hostname", () => {
    const request = new NextRequest(
      "http://127.0.0.1:3300/legacy-storage-bridge",
      { headers: { host: "newsorder.doowiki.dev" } },
    );

    expect(proxy(request).status).toBe(200);
  });
});
