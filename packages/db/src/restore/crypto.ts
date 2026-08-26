import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { z } from "zod";

export const backupTablesSchema = z.object({
  users: z.array(z.record(z.string(), z.unknown())),
  accounts: z.array(z.record(z.string(), z.unknown())),
  stageProgress: z.array(z.record(z.string(), z.unknown())),
  deletionEvents: z.array(z.record(z.string(), z.unknown())),
});

export const backupPayloadSchema = z.object({
  version: z.literal(1),
  schemaVersion: z.string().min(1),
  migrationVersion: z.string().min(1),
  createdAt: z.iso.datetime(),
  rowCounts: z.record(z.string(), z.number().int().min(0)),
  checksum: z.string().regex(/^[a-f0-9]{64}$/u),
  tables: backupTablesSchema,
});

export const encryptedBackupSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal("aes-256-gcm"),
  iv: z.string(),
  authTag: z.string(),
  ciphertext: z.string(),
});

export type BackupTables = z.infer<typeof backupTablesSchema>;
export type BackupPayload = z.infer<typeof backupPayloadSchema>;
export type EncryptedBackup = z.infer<typeof encryptedBackupSchema>;

function decodeEncryptionKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return key;
}

function serializedTables(tables: BackupTables) {
  return JSON.stringify(tables);
}

export function checksumTables(tables: BackupTables): string {
  return createHash("sha256").update(serializedTables(tables)).digest("hex");
}

export function createBackupPayload(
  tables: BackupTables,
  options: {
    schemaVersion: string;
    migrationVersion: string;
    createdAt?: Date;
  },
): BackupPayload {
  const rowCounts = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [table, rows.length]),
  );

  return {
    version: 1,
    schemaVersion: options.schemaVersion,
    migrationVersion: options.migrationVersion,
    createdAt: (options.createdAt ?? new Date()).toISOString(),
    rowCounts,
    checksum: checksumTables(tables),
    tables,
  };
}

export function encryptBackup(
  payload: BackupPayload,
  encodedKey: string,
): EncryptedBackup {
  const key = decodeEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptBackup(
  envelopeValue: unknown,
  encodedKey: string,
): BackupPayload {
  const envelope = encryptedBackupSchema.parse(envelopeValue);
  const key = decodeEncryptionKey(encodedKey);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const payload = backupPayloadSchema.parse(JSON.parse(plaintext));

  if (checksumTables(payload.tables) !== payload.checksum) {
    throw new Error("Backup checksum mismatch.");
  }
  for (const [table, rows] of Object.entries(payload.tables)) {
    if (payload.rowCounts[table] !== rows.length) {
      throw new Error(`Backup row count mismatch for ${table}.`);
    }
  }

  return payload;
}
