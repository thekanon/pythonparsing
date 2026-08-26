import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/server/auth";

function unavailable() {
  return Response.json(
    {
      error: "AUTH_NOT_CONFIGURED",
      message: "인증 서비스가 아직 구성되지 않았습니다.",
    },
    { status: 503 },
  );
}

async function dispatch(request: Request, method: "GET" | "POST") {
  try {
    const handlers = toNextJsHandler(getAuth());
    return handlers[method](request);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED")
      return unavailable();
    throw error;
  }
}

export function GET(request: Request) {
  return dispatch(request, "GET");
}

export function POST(request: Request) {
  return dispatch(request, "POST");
}
