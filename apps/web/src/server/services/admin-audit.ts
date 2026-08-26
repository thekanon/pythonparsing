import "server-only";

import { createHash } from "node:crypto";

import { adminAuditLogs } from "@newsorder/db/schema";

import { getDatabase } from "@/server/db";

export function auditHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function writeAdminAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  succeeded: boolean;
  before?: unknown;
  after?: unknown;
}) {
  await getDatabase()
    .insert(adminAuditLogs)
    .values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      succeeded: input.succeeded,
      beforeHash: input.before === undefined ? null : auditHash(input.before),
      afterHash: input.after === undefined ? null : auditHash(input.after),
    });
}
