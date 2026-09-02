import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  BASELINE_DIAGNOSTIC,
  FOLLOWUP_DIAGNOSTIC,
  appendLocalDiagnosticRun,
  getOrCreateGuestId,
  type DiagnosticRunSummary,
} from "@/features/exam-coach/core";

import { ExamCoachFollowupDiagnostic } from "./exam-coach-followup-diagnostic";

// prettier-ignore
describe("ExamCoachFollowupDiagnostic", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("requires a completed baseline before the followup assessment", async () => {
    render(<ExamCoachFollowupDiagnostic />);

    expect(
      await screen.findByRole("heading", {
        name: "기준선 진단이 먼저 필요합니다.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "종료 동형 진단 시작" }),
    ).toBeNull();
  });

  it("ignores a followup that predates the latest baseline", async () => {
    const learnerId = getOrCreateGuestId(window.localStorage, () => "stale-test");
    appendLocalDiagnosticRun(
      window.localStorage,
      learnerId,
      "baseline-old",
      "2026-08-01T00:00:00.000Z",
      baselineSummary(),
    );
    appendLocalDiagnosticRun(
      window.localStorage,
      learnerId,
      "followup-old",
      "2026-08-15T00:00:00.000Z",
      followupSummary(),
    );
    appendLocalDiagnosticRun(
      window.localStorage,
      learnerId,
      "baseline-new",
      "2026-09-01T00:00:00.000Z",
      baselineSummary(),
    );

    render(<ExamCoachFollowupDiagnostic />);

    expect(
      await screen.findByRole("button", { name: "종료 동형 진단 시작" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "실제 측정 변화" }),
    ).toBeNull();
  });

  it("compares an isomorphic followup without persisting submitted answers", async () => {
    const learnerId = getOrCreateGuestId(
      window.localStorage,
      () => "followup-test",
    );
    appendLocalDiagnosticRun(
      window.localStorage,
      learnerId,
      "baseline-test",
      "2026-09-01T00:00:00.000Z",
      baselineSummary(),
    );

    const user = userEvent.setup();
    render(<ExamCoachFollowupDiagnostic />);

    await user.click(
      await screen.findByRole("button", { name: "종료 동형 진단 시작" }),
    );

    for (const [index, item] of FOLLOWUP_DIAGNOSTIC.items.entries()) {
      await user.type(await screen.findByLabelText("답안"), item.answer);
      await user.click(
        screen.getByRole("button", {
          name:
            index + 1 === FOLLOWUP_DIAGNOSTIC.items.length
              ? "종료 진단 완료"
              : "답안 제출 후 다음",
        }),
      );
    }

    expect(
      await screen.findByRole("heading", { name: "실제 측정 변화" }),
    ).toBeVisible();
    expect(screen.getByText("+100%p")).toBeVisible();
    expect(screen.getAllByText("개선")).toHaveLength(6);

    const persisted = [
      window.localStorage.getItem("exam-coach:v1:learning-events"),
      window.localStorage.getItem("exam-coach:v1:diagnostic-runs"),
    ].join("\n");
    expect(persisted).not.toMatch(
      /"(answer|response|submittedResponse|explanation|prompt)"/u,
    );
    expect(persisted).not.toContain(FOLLOWUP_DIAGNOSTIC.items[0]!.answer);
  });
});

function baselineSummary(): DiagnosticRunSummary {
  return {
    setId: "diagnostic.sql-c.2026",
    form: "baseline",
    expectedItemCount: BASELINE_DIAGNOSTIC.items.length,
    attemptedItemCount: BASELINE_DIAGNOSTIC.items.length,
    correctCount: 0,
    accuracy: 0,
    totalResponseTimeMs: 60_000,
    completed: true,
    pairResults: BASELINE_DIAGNOSTIC.items.map((item) => ({
      pairId: item.assessment!.pairId,
      correct: false,
    })),
  };
}

function followupSummary(): DiagnosticRunSummary {
  return {
    setId: "diagnostic.sql-c.2026",
    form: "followup",
    expectedItemCount: FOLLOWUP_DIAGNOSTIC.items.length,
    attemptedItemCount: FOLLOWUP_DIAGNOSTIC.items.length,
    correctCount: FOLLOWUP_DIAGNOSTIC.items.length,
    accuracy: 1,
    totalResponseTimeMs: 50_000,
    completed: true,
    pairResults: FOLLOWUP_DIAGNOSTIC.items.map((item) => ({
      pairId: item.assessment!.pairId,
      correct: true,
    })),
  };
}
