import "server-only";

import {
  accounts,
  adminAuditLogs,
  backupRuns,
  deletionEvents,
  stageProgress,
  users,
} from "@newsorder/db/schema";
import {
  createBackupPayload,
  encryptBackup,
  type BackupTables,
} from "@newsorder/db/restore";
import { del, list, put } from "@vercel/blob";
import { eq, lt, sql } from "drizzle-orm";

import { getDatabase } from "@/server/db";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

const RETENTION_MILLISECONDS = 30 * 24 * 60 * 60 * 1_000;

function safeErrorCode(error: unknown) {
  if (error instanceof Error && error.message.includes("32-byte")) {
    return "INVALID_BACKUP_KEY";
  }
  return "BACKUP_FAILED";
}

async function exportTables(): Promise<BackupTables> {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(
      sql`set transaction isolation level repeatable read`,
    );

    const [userRows, accountRows, progressRows, deletionRows] =
      await Promise.all([
        transaction.select().from(users),
        transaction
          .select({
            id: accounts.id,
            accountId: accounts.accountId,
            providerId: accounts.providerId,
            userId: accounts.userId,
            createdAt: accounts.createdAt,
            updatedAt: accounts.updatedAt,
          })
          .from(accounts),
        transaction.select().from(stageProgress),
        transaction.select().from(deletionEvents),
      ]);

    return {
      users: userRows,
      accounts: accountRows,
      stageProgress: progressRows,
      deletionEvents: deletionRows,
    };
  });
}

async function pruneExpiredBackups(token: string) {
  const cutoff = Date.now() - RETENTION_MILLISECONDS;
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: "backups/",
      limit: 1_000,
      token,
      ...(cursor ? { cursor } : {}),
    });
    const expired = result.blobs
      .filter((blob) => blob.uploadedAt.valueOf() < cutoff)
      .map((blob) => blob.pathname);
    if (expired.length > 0) await del(expired, { token });
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
}

export async function runUserDataBackup() {
  if (isFixtureRuntime()) return { status: "fixture" as const, rowCounts: {} };
  const env = getServerEnv();
  const started = await getDatabase()
    .insert(backupRuns)
    .values({ status: "running" })
    .returning({ id: backupRuns.id });
  const runId = started[0]!.id;

  try {
    const tables = await exportTables();
    const payload = createBackupPayload(tables, {
      schemaVersion: "1",
      migrationVersion: "0000",
    });
    const encrypted = encryptBackup(payload, env.BACKUP_ENCRYPTION_KEY!);
    const datePrefix = payload.createdAt.slice(0, 10);
    const blobPath = `backups/${datePrefix}/${runId}.json.enc`;
    await put(blobPath, JSON.stringify(encrypted), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
      token: env.BLOB_READ_WRITE_TOKEN!,
    });
    await pruneExpiredBackups(env.BLOB_READ_WRITE_TOKEN!);
    await getDatabase().transaction(async (transaction) => {
      await transaction
        .delete(deletionEvents)
        .where(lt(deletionEvents.expiresAt, new Date()));
      await transaction
        .delete(adminAuditLogs)
        .where(sql`${adminAuditLogs.performedAt} < now() - interval '1 year'`);
    });

    const manifest = {
      schemaVersion: payload.schemaVersion,
      migrationVersion: payload.migrationVersion,
      rowCounts: payload.rowCounts,
      checksum: payload.checksum,
    };
    await getDatabase()
      .update(backupRuns)
      .set({
        status: "succeeded",
        finishedAt: new Date(),
        blobPath,
        manifest,
      })
      .where(eq(backupRuns.id, runId));

    return {
      status: "succeeded" as const,
      runId,
      blobPath,
      rowCounts: payload.rowCounts,
    };
  } catch (error) {
    const errorCode = safeErrorCode(error);
    await getDatabase()
      .update(backupRuns)
      .set({ status: "failed", finishedAt: new Date(), errorCode })
      .where(eq(backupRuns.id, runId));
    return { status: "failed" as const, runId, errorCode, rowCounts: {} };
  }
}
