import { useState } from "react";

import {
  recordDiagnosticAttempt,
  summarizeDiagnosticRun,
  type DiagnosticAttemptRecord,
  type DiagnosticRunSummary,
} from "../core/diagnostic-results";
import type { DiagnosticAssessmentSet } from "../core/diagnostics";
import { appendLocalDiagnosticRun } from "../core/local-profile";
import { appendLocalLearningEvent } from "../core/local-store";

interface PendingSubmission {
  attempt: DiagnosticAttemptRecord;
  completedAt: string;
  summary: DiagnosticRunSummary;
}

interface DiagnosticSession {
  index: number;
  attempts: readonly DiagnosticAttemptRecord[];
  response: string;
  startedAt: number;
  runId: string;
  pending?: PendingSubmission;
}

export function useDiagnosticSession(
  set: DiagnosticAssessmentSet,
  fsrsVersion: string,
) {
  const [session, setSession] = useState<DiagnosticSession | null>(null);

  function start() {
    setSession({
      index: 0,
      attempts: [],
      response: "",
      startedAt: performance.now(),
      runId: `${set.form}-${crypto.randomUUID()}`,
    });
  }

  function setResponse(response: string) {
    setSession((current) =>
      current && !current.pending ? { ...current, response } : current,
    );
  }

  function submit(learnerId: string) {
    if (!session) return null;
    const item = set.items[session.index];
    if (!item) throw new Error("평가 문항을 불러오지 못했습니다.");

    let pending = session.pending;
    if (!pending) {
      if (!session.response.trim()) {
        throw new Error("답안을 입력한 뒤 제출해 주세요.");
      }
      const attempt = recordDiagnosticAttempt(item, session.response, {
        eventId: `event-${crypto.randomUUID()}`,
        learnerId,
        occurredAt: new Date().toISOString(),
        responseTimeMs: Math.max(
          0,
          Math.round(performance.now() - session.startedAt),
        ),
        fsrsVersion,
      });
      pending = {
        attempt,
        completedAt: new Date().toISOString(),
        summary: summarizeDiagnosticRun(set, [...session.attempts, attempt]),
      };
      // Keep the original payload for retries across the two storage writes.
      // Only memory holds pending state; raw answers are discarded after grading.
      setSession({ ...session, response: "", pending });
    }

    appendLocalLearningEvent(
      window.localStorage,
      learnerId,
      pending.attempt.event,
    );
    if (pending.summary.completed) {
      const runs = appendLocalDiagnosticRun(
        window.localStorage,
        learnerId,
        session.runId,
        pending.completedAt,
        pending.summary,
      );
      setSession(null);
      return runs;
    }

    setSession({
      index: session.index + 1,
      attempts: [...session.attempts, pending.attempt],
      response: "",
      startedAt: performance.now(),
      runId: session.runId,
    });
    return null;
  }

  return { session, start, setResponse, submit, reset: () => setSession(null) };
}
