import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BASELINE_DIAGNOSTIC,
  FOLLOWUP_DIAGNOSTIC,
} from "../core/diagnostic-sets";
import {
  loadLocalDiagnosticRuns,
  EXAM_COACH_PROFILE_STORAGE_KEYS,
} from "../core/local-profile";
import {
  loadLocalLearningEvents,
  EXAM_COACH_STORAGE_KEYS,
} from "../core/local-store";
import { rebuildMemoryStateFromEvents } from "../core/memory-replay";
import { WEEKLY_ASSESSMENT } from "../core/weekly-assessment";
import { useDiagnosticSession } from "./use-diagnostic-session";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe.each([BASELINE_DIAGNOSTIC, FOLLOWUP_DIAGNOSTIC, WEEKLY_ASSESSMENT])(
  "$form assessment session",
  (set) => {
    it.each(["event", "summary", "summary-after-write"])(
      "retries a failed %s write with the original private payload",
      (failure) => {
        const learnerId = "guest-retry";
        const { result } = renderHook(() =>
          useDiagnosticSession(set, "pending-adapter"),
        );
        act(() => result.current.start());
        const runId = result.current.session!.runId;
        const targetIndex = failure === "event" ? 0 : set.items.length - 1;
        const targetKey =
          failure === "event"
            ? EXAM_COACH_STORAGE_KEYS.learningEvents
            : EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns;
        const originalSetItem = Storage.prototype.setItem;
        let fail = false;
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
          this: Storage,
          key: string,
          value: string,
        ) {
          if (fail && key === targetKey) {
            fail = false;
            if (failure === "summary-after-write") {
              originalSetItem.call(this, key, value);
            }
            throw new Error("storage unavailable");
          }
          originalSetItem.call(this, key, value);
        });

        for (const [index, item] of set.items.entries()) {
          act(() => result.current.setResponse(item.answer));
          if (index === targetIndex) {
            fail = true;
            act(() => {
              expect(() => result.current.submit(learnerId)).toThrow(
                "storage unavailable",
              );
            });
            const pending = result.current.session!.pending!;
            expect(pending.attempt.event.correct).toBe(true);
            expect(result.current.session!.response).toBe("");
            act(() => result.current.setResponse("changed answer"));
            expect(result.current.session!.response).toBe("");
            vi.spyOn(performance, "now").mockReturnValue(999999);
            vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
              throw new Error("retry must not generate a new ID");
            });
            act(() => {
              result.current.submit(learnerId);
            });
            expect(
              loadLocalLearningEvents(window.localStorage, learnerId),
            ).toContainEqual(pending.attempt.event);
            if (failure !== "event") {
              expect(
                loadLocalDiagnosticRuns(window.localStorage, learnerId)[0],
              ).toMatchObject({
                runId,
                completedAt: pending.completedAt,
                summary: pending.summary,
              });
            }
            vi.mocked(crypto.randomUUID).mockRestore();
            vi.mocked(performance.now).mockRestore();
          } else {
            act(() => {
              result.current.submit(learnerId);
            });
          }
          if (index < set.items.length - 1) {
            expect(
              loadLocalDiagnosticRuns(window.localStorage, learnerId),
            ).toEqual([]);
          }
        }

        expect(result.current.session).toBeNull();
        const events = loadLocalLearningEvents(window.localStorage, learnerId);
        const runs = loadLocalDiagnosticRuns(window.localStorage, learnerId);
        expect(events).toHaveLength(set.items.length);
        expect(runs).toHaveLength(1);
        expect(runs[0]!.summary.correctCount).toBe(set.items.length);
        const resolveAdapter = vi.fn(() => {
          throw new Error("assessment must not call FSRS");
        });
        for (const event of events) {
          expect(
            rebuildMemoryStateFromEvents(events, event.cardId, resolveAdapter),
          ).toBeNull();
        }
        expect(resolveAdapter).not.toHaveBeenCalled();
        const raw = [
          window.localStorage.getItem(EXAM_COACH_STORAGE_KEYS.learningEvents),
          window.localStorage.getItem(
            EXAM_COACH_PROFILE_STORAGE_KEYS.diagnosticRuns,
          ),
        ].join("\n");
        expect(raw).not.toMatch(
          /"(answer|response|submittedResponse|explanation|prompt)"/u,
        );
      },
    );

    it("rejects blank answers and clears pending state on reset", () => {
      const { result } = renderHook(() =>
        useDiagnosticSession(set, "pending-adapter"),
      );
      act(() => result.current.start());
      act(() => {
        expect(() => result.current.submit("guest-retry")).toThrow(
          "답안을 입력",
        );
      });
      expect(window.localStorage.length).toBe(0);
      act(() => result.current.reset());
      expect(result.current.session).toBeNull();
    });
  },
);
