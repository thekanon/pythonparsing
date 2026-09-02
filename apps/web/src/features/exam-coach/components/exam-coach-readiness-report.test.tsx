import { render, screen, within } from "@testing-library/react";

import {
  BASELINE_DIAGNOSTIC,
  appendLocalDiagnosticRun,
  appendLocalLearningEvent,
  getOrCreateGuestId,
  recordDiagnosticAttempt,
  summarizeDiagnosticRun,
  type DiagnosticAttemptRecord,
} from "@/features/exam-coach/core";

import { ExamCoachReadinessReport } from "./exam-coach-readiness-report";

// prettier-ignore
describe("ExamCoachReadinessReport", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows missing measurements without turning them into zero-percent results", async () => {
    render(<ExamCoachReadinessReport />);

    expect(
      await screen.findByRole("heading", { name: "SQL·C 준비도 리포트" }),
    ).toBeVisible();
    expect(screen.getByText("0 / 10")).toBeVisible();
    expect(screen.getAllByText("측정 없음").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("FSRS 연결 후 측정")).toBeVisible();
    expect(screen.getByText(/복습 부채 0건이라고 표시하지 않습니다/u)).toBeVisible();
  });

  it("rebuilds concept evidence from persisted baseline assessment events", async () => {
    const learnerId = getOrCreateGuestId(
      window.localStorage,
      () => "readiness-test",
    );
    const attempts: DiagnosticAttemptRecord[] = [];

    for (const [index, item] of BASELINE_DIAGNOSTIC.items.entries()) {
      const attempt = recordDiagnosticAttempt(item, item.answer, {
        eventId: `baseline-${index + 1}`,
        learnerId,
        occurredAt: `2026-09-02T0${index + 1}:00:00.000Z`,
        responseTimeMs: 1000,
        fsrsVersion: "pending-adapter",
      });
      attempts.push(attempt);
      appendLocalLearningEvent(window.localStorage, learnerId, attempt.event);
    }
    appendLocalDiagnosticRun(
      window.localStorage,
      learnerId,
      "baseline-readiness",
      "2026-09-02T08:00:00.000Z",
      summarizeDiagnosticRun(BASELINE_DIAGNOSTIC, attempts),
    );

    render(<ExamCoachReadinessReport />);

    expect(await screen.findByText("7 / 10")).toBeVisible();
    expect(screen.getByText("6/6")).toBeVisible();

    const sqlRegion = screen.getByRole("region", { name: "SQL 응용 준비도" });
    const cRegion = screen.getByRole("region", { name: "C 언어 준비도" });
    expect(within(sqlRegion).getByText("4 / 5")).toBeVisible();
    expect(within(cRegion).getByText("3 / 5")).toBeVisible();

    const selectCard = screen
      .getByRole("heading", { name: "SELECT와 FROM" })
      .closest("article");
    expect(selectCard).not.toBeNull();
    expect(within(selectCard!).getByText(/진단 근거 1\/1/u)).toBeVisible();

    const rootCard = screen
      .getByRole("heading", { name: "테이블·행·열" })
      .closest("article");
    expect(rootCard).not.toBeNull();
    expect(within(rootCard!).getByText("진단 근거 없음")).toBeVisible();
    expect(screen.getAllByText("측정 없음").length).toBeGreaterThanOrEqual(2);
  });
});
