import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

import { count, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  accounts,
  deletionEvents,
  lessonRestoreIdentities,
  stageProgress,
  users,
} from "../schema/index";
import { createDatabase } from "../client";
import { decryptBackup } from "./crypto";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputFile = argument("--file");
const supplementalDeletionsFile = argument("--deletions-file");
const databaseUrl = process.env.DATABASE_URL_TARGET;
const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
const deletionHmacKey = process.env.DELETION_EVENT_HMAC_KEY;

if (!inputFile || !databaseUrl || !encryptionKey || !deletionHmacKey) {
  throw new Error(
    "Usage: DATABASE_URL_TARGET=... BACKUP_ENCRYPTION_KEY=... DELETION_EVENT_HMAC_KEY=... pnpm restore -- --file backup.enc [--deletions-file deletion-events.json]",
  );
}

const envelope = JSON.parse(await readFile(inputFile, "utf8")) as unknown;
const payload = decryptBackup(envelope, encryptionKey);
const deletionRowSchema = z.object({
  userIdHmac: z.string().regex(/^[a-f0-9]{64}$/u),
  requestedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});
const supplementalDeletions = supplementalDeletionsFile
  ? z
      .array(deletionRowSchema)
      .parse(JSON.parse(await readFile(supplementalDeletionsFile, "utf8")))
  : [];
const { client, db } = createDatabase(databaseUrl, 1);

function requiredString(row: Record<string, unknown>, key: string): string {
  return z.string().min(1).parse(row[key]);
}

function requiredDate(row: Record<string, unknown>, key: string): Date {
  return z.coerce.date().parse(row[key]);
}

function nullableDate(row: Record<string, unknown>, key: string): Date | null {
  return row[key] === null || row[key] === undefined
    ? null
    : z.coerce.date().parse(row[key]);
}

const userRows: (typeof users.$inferInsert)[] = payload.tables.users.map(
  (row) => ({
    id: requiredString(row, "id"),
    name: requiredString(row, "name"),
    email: z.email().parse(row.email),
    emailVerified: z.boolean().parse(row.emailVerified),
    image: z.string().nullable().parse(row.image),
    createdAt: requiredDate(row, "createdAt"),
    updatedAt: requiredDate(row, "updatedAt"),
    role: requiredString(row, "role"),
    banned: z.boolean().parse(row.banned),
    banReason: z.string().nullable().parse(row.banReason),
    banExpires: nullableDate(row, "banExpires"),
  }),
);

const accountRows: (typeof accounts.$inferInsert)[] =
  payload.tables.accounts.map((row) => ({
    id: requiredString(row, "id"),
    issuer: requiredString(row, "issuer"),
    accountId: requiredString(row, "accountId"),
    providerId: requiredString(row, "providerId"),
    userId: requiredString(row, "userId"),
    createdAt: requiredDate(row, "createdAt"),
    updatedAt: requiredDate(row, "updatedAt"),
  }));

const progressRows: (typeof stageProgress.$inferInsert)[] =
  payload.tables.stageProgress.map((row) => ({
    id: requiredString(row, "id"),
    userId: requiredString(row, "userId"),
    lessonId: z.uuid().parse(row.lessonId),
    stage: z.enum(["title", "excerpt"]).parse(row.stage),
    attempts: z.number().int().min(0).max(10_000).parse(row.attempts),
    bestPositionScore: z
      .number()
      .int()
      .min(0)
      .max(100)
      .parse(row.bestPositionScore),
    completedAt: nullableDate(row, "completedAt"),
    helped: z.boolean().parse(row.helped),
    lastAttemptAt: requiredDate(row, "lastAttemptAt"),
  }));

const lessonIdentityRows: (typeof lessonRestoreIdentities.$inferInsert)[] =
  payload.tables.lessonIdentities.map((row) => ({
    lessonId: z.uuid().parse(row.lessonId),
    learningDate: z.iso.date().parse(row.learningDate),
    ordinal: z.number().int().min(1).max(10).parse(row.ordinal),
    providerKey: requiredString(row, "providerKey"),
    externalIdHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .parse(row.externalIdHash),
    sourceHash: requiredString(row, "sourceHash"),
    restoredAt: requiredDate(row, "restoredAt"),
  }));

const deletionRows: (typeof deletionEvents.$inferInsert)[] =
  payload.tables.deletionEvents.map((row) => deletionRowSchema.parse(row));

try {
  await db.transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: users.id })
      .from(users)
      .limit(1);
    if (existing.length > 0) {
      throw new Error("Restore target must be an empty Neon branch.");
    }

    if (userRows.length > 0) await transaction.insert(users).values(userRows);
    if (accountRows.length > 0)
      await transaction.insert(accounts).values(accountRows);
    if (progressRows.length > 0)
      await transaction.insert(stageProgress).values(progressRows);
    if (lessonIdentityRows.length > 0) {
      await transaction
        .insert(lessonRestoreIdentities)
        .values(lessonIdentityRows);
    }
    if (deletionRows.length > 0)
      await transaction.insert(deletionEvents).values(deletionRows);

    const restoredCounts = await Promise.all([
      transaction.select({ value: count() }).from(users),
      transaction.select({ value: count() }).from(accounts),
      transaction.select({ value: count() }).from(stageProgress),
      transaction.select({ value: count() }).from(lessonRestoreIdentities),
      transaction.select({ value: count() }).from(deletionEvents),
    ]);
    const actualCounts = {
      users: restoredCounts[0][0]?.value ?? 0,
      accounts: restoredCounts[1][0]?.value ?? 0,
      stageProgress: restoredCounts[2][0]?.value ?? 0,
      lessonIdentities: restoredCounts[3][0]?.value ?? 0,
      deletionEvents: restoredCounts[4][0]?.value ?? 0,
    };
    for (const [table, actual] of Object.entries(actualCounts)) {
      if (payload.rowCounts[table] !== actual) {
        throw new Error(`Restore row count mismatch for ${table}.`);
      }
    }

    if (supplementalDeletions.length > 0) {
      await transaction
        .insert(deletionEvents)
        .values(supplementalDeletions)
        .onConflictDoUpdate({
          target: deletionEvents.userIdHmac,
          set: {
            requestedAt: sql`excluded.requested_at`,
            expiresAt: sql`excluded.expires_at`,
          },
        });
    }

    const deletionSet = new Set(
      [...deletionRows, ...supplementalDeletions].map(
        (event) => event.userIdHmac,
      ),
    );
    const restoredUsers = await transaction
      .select({ id: users.id })
      .from(users);
    for (const user of restoredUsers) {
      const digest = createHmac("sha256", deletionHmacKey)
        .update(user.id)
        .digest("hex");
      if (deletionSet.has(digest)) {
        await transaction.delete(users).where(eq(users.id, user.id));
      }
    }
  });

  process.stdout.write(
    `Restored backup ${payload.createdAt} with checksum ${payload.checksum}. Applied ${supplementalDeletions.length} supplemental deletion events. Sessions were not restored.\n`,
  );
} finally {
  await client.end();
}
