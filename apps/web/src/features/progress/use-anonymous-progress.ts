"use client";

import { useSyncExternalStore } from "react";

import {
  getAnonymousProgressServerSnapshot,
  getAnonymousProgressSnapshot,
  subscribeToAnonymousProgress,
} from "./storage";

export function useAnonymousProgress() {
  return useSyncExternalStore(
    subscribeToAnonymousProgress,
    getAnonymousProgressSnapshot,
    getAnonymousProgressServerSnapshot,
  );
}
