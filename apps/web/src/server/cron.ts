import "server-only";

import { timingSafeEqual } from "node:crypto";

import { getServerEnv } from "./env";

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const candidate = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const candidateBuffer = Buffer.from(candidate);
  return (
    expectedBuffer.length === candidateBuffer.length &&
    timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}
