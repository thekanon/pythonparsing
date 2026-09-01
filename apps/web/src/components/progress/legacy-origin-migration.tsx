"use client";

import { useEffect } from "react";

import {
  LEGACY_SITE_ORIGIN,
  LEGACY_STORAGE_MESSAGE_TYPE,
  LEGACY_STORAGE_PREFIX,
  SITE_ORIGIN,
} from "@/lib/site";

const MIGRATION_MARKER = "sentence.legacy-origin-migrated.v1";
const MAX_STORAGE_VALUE_LENGTH = 1_000_000;

type LegacyStorageMessage = {
  type: typeof LEGACY_STORAGE_MESSAGE_TYPE;
  entries: [string, string][];
};

function isLegacyStorageMessage(value: unknown): value is LegacyStorageMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LegacyStorageMessage>;
  return (
    candidate.type === LEGACY_STORAGE_MESSAGE_TYPE &&
    Array.isArray(candidate.entries) &&
    candidate.entries.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        entry[0].startsWith(LEGACY_STORAGE_PREFIX) &&
        typeof entry[1] === "string" &&
        entry[1].length <= MAX_STORAGE_VALUE_LENGTH,
    )
  );
}

export function LegacyOriginMigration() {
  useEffect(() => {
    if (
      window.location.origin !== SITE_ORIGIN ||
      window.localStorage.getItem(MIGRATION_MARKER)
    ) {
      return;
    }

    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.title = "기존 학습 데이터 가져오기";
    frame.referrerPolicy = "no-referrer";
    frame.src = `${LEGACY_SITE_ORIGIN}/legacy-storage-bridge`;

    const cleanUp = () => {
      window.removeEventListener("message", receiveLegacyStorage);
      frame.remove();
    };

    const receiveLegacyStorage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== LEGACY_SITE_ORIGIN ||
        event.source !== frame.contentWindow ||
        !isLegacyStorageMessage(event.data)
      ) {
        return;
      }

      let imported = false;
      for (const [key, value] of event.data.entries) {
        if (window.localStorage.getItem(key) !== null) continue;
        window.localStorage.setItem(key, value);
        imported = true;
      }

      window.localStorage.setItem(MIGRATION_MARKER, "1");
      window.clearTimeout(timeoutId);
      cleanUp();

      if (imported) window.location.reload();
    };

    window.addEventListener("message", receiveLegacyStorage);
    const timeoutId = window.setTimeout(cleanUp, 10_000);
    document.body.appendChild(frame);

    return () => {
      window.clearTimeout(timeoutId);
      cleanUp();
    };
  }, []);

  return null;
}
