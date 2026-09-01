"use client";

import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import {
  getAnonymousProgressSnapshot,
  replaceAnonymousProgress,
} from "@/features/progress/storage";
import { synchronizeProgress } from "@/features/progress/sync";

const RETRY_DELAYS_MS = [0, 1_000, 5_000] as const;

export function ProgressSync() {
  const { data: session, isPending } = authClient.useSession();
  const synchronizedUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (isPending || !userId || synchronizedUser.current === userId) return;

    let cancelled = false;
    synchronizedUser.current = userId;

    const synchronize = async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (delay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, delay));
        }
        if (cancelled) return;

        try {
          const merged = await synchronizeProgress(
            getAnonymousProgressSnapshot(),
          );
          if (!cancelled) replaceAnonymousProgress(merged);
          return;
        } catch {
          // A later retry or navigation can recover without blocking the page.
        }
      }

      if (!cancelled) synchronizedUser.current = null;
    };

    void synchronize();
    return () => {
      cancelled = true;
    };
  }, [isPending, session?.user.id]);

  return null;
}
