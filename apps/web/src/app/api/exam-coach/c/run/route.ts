import { C_EXECUTION_LIMITS } from "@/features/exam-coach/core/c-execution";
import { executeRestrictedC } from "@/features/exam-coach/server/c-execution";

const MAX_JSON_BODY_BYTES = C_EXECUTION_LIMITS.sourceBytes * 8;

export async function POST(request: Request): Promise<Response> {
  let rawBody: string | null;
  try {
    rawBody = await readBoundedRequestBody(request, MAX_JSON_BODY_BYTES);
  } catch {
    return jsonResponse({ ok: false, status: "sandbox-error" }, 400);
  }

  if (rawBody === null) {
    return jsonResponse({ ok: false, status: "source-too-large" }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, status: "sandbox-error" }, 400);
  }

  if (!isRecord(payload) || typeof payload.source !== "string") {
    return jsonResponse({ ok: false, status: "sandbox-error" }, 400);
  }

  const result = await executeRestrictedC(payload.source);
  return jsonResponse(result, responseStatus(result.status));
}

async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return null;
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, byteLength).toString("utf8");
}

function responseStatus(status: string): number {
  if (status === "source-too-large") return 413;
  if (status === "sandbox-unavailable") return 503;
  if (status === "sandbox-error") return 502;
  return 200;
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
