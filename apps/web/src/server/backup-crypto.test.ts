import { randomBytes } from "node:crypto";

import {
  createBackupPayload,
  decryptBackup,
  encryptBackup,
  type BackupTables,
} from "@newsorder/db/restore";

const emptyTables: BackupTables = {
  users: [],
  accounts: [],
  stageProgress: [],
  lessonIdentities: [],
  deletionEvents: [],
};

describe("encrypted logical backups", () => {
  const key = randomBytes(32).toString("base64");

  it("round-trips an AES-256-GCM payload with manifest data", () => {
    const payload = createBackupPayload(emptyTables, {
      schemaVersion: "2",
      migrationVersion: "0002",
      createdAt: new Date("2026-08-26T00:00:00Z"),
    });
    expect(decryptBackup(encryptBackup(payload, key), key)).toEqual(payload);
  });

  it("rejects ciphertext tampering", () => {
    const payload = createBackupPayload(emptyTables, {
      schemaVersion: "2",
      migrationVersion: "0002",
    });
    const envelope = encryptBackup(payload, key);
    const bytes = Buffer.from(envelope.ciphertext, "base64");
    bytes[0] = bytes[0]! ^ 1;
    expect(() =>
      decryptBackup({ ...envelope, ciphertext: bytes.toString("base64") }, key),
    ).toThrow();
  });

  it("rejects a manifest row-count mismatch even when the envelope is authentic", () => {
    const payload = createBackupPayload(emptyTables, {
      schemaVersion: "2",
      migrationVersion: "0002",
    });
    const inconsistent = {
      ...payload,
      rowCounts: { ...payload.rowCounts, users: 1 },
    };
    expect(() => decryptBackup(encryptBackup(inconsistent, key), key)).toThrow(
      /row count mismatch/u,
    );
  });
});
