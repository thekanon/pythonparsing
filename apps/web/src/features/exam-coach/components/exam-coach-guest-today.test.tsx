import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  BASELINE_DIAGNOSTIC,
  LEARNING_CONTENT_CATALOG,
  TS_FSRS_VERSION,
  appendLocalLearningEvent,
  getOrCreateGuestId,
  saveLocalStudySettings,
  type LearningEvent,
} from "@/features/exam-coach/core";

import { ExamCoachGuestToday } from "./exam-coach-guest-today";

// prettier-ignore
describe("ExamCoachGuestToday", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists study settings in the exam coach namespace", async () => {
    const user = userEvent.setup();
    render(<ExamCoachGuestToday />);

    const dateInput = await screen.findByLabelText("시험 예정일");
    await user.type(dateInput, "2026-12-20");
    const minutesInput = screen.getByLabelText("하루 학습 가능 시간(분)");
    await user.clear(minutesInput);
    await user.type(minutesInput, "60");
    await user.click(screen.getByRole("button", { name: "설정 저장" }));

    expect(
      screen.getByText("현재 설정: 2026-12-20까지 하루 60분"),
    ).toBeVisible();
    expect(
      JSON.parse(
        window.localStorage.getItem("exam-coach:v1:settings") ?? "{}",
      ),
    ).toMatchObject({
      examDate: "2026-12-20",
      dailyMinutes: 60,
    });
  });

  it("recomputes the stored-event today plan on mount and window focus", async () => {
    const learnerId = getOrCreateGuestId(window.localStorage, () => "today-test");
    saveLocalStudySettings(window.localStorage, learnerId, {
      examDate: "2026-12-20",
      dailyMinutes: 15,
      updatedAt: "2026-09-04T00:00:00.000Z",
    });
    render(<ExamCoachGuestToday />);

    expect(
      await screen.findByText("현재 시간 예산과 선수지식 조건에 맞는 오늘 항목이 없습니다."),
    ).toBeVisible();
    expect(screen.getByText(/적용 활동은 임의로 만들지 않고 빈 상태/)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "시험일까지 계획" }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: "시험일까지 다음 7일 계획 미리보기" }),
    ).toBeVisible();

    const sql = LEARNING_CONTENT_CATALOG["sql-select-basics"];
    const learningEvent: LearningEvent = {
      eventId: "learn-focus-refresh",
      occurredAt: "2020-01-01T00:00:00.000Z",
      learnerId,
      contentId: sql.id,
      contentVersion: sql.version,
      cardId: sql.id,
      correct: true,
      rating: "Good",
      responseTimeMs: 1000,
      helpLevel: 0,
      mode: "recall",
      firstSubmission: true,
      fsrsVersion: TS_FSRS_VERSION,
    };
    appendLocalLearningEvent(window.localStorage, learnerId, learningEvent);
    window.dispatchEvent(new Event("focus"));

    expect(await screen.findByText(/sql\.select\.001 · 예상 5분/)).toBeVisible();
    expect(screen.getByText("복습")).toBeVisible();
    expect(screen.getByRole("link", { name: "학습 열기" })).toHaveAttribute(
      "href",
      "/exam-coach/learn?unit=sql",
    );
    expect(screen.getByText("1건")).toBeVisible();
    expect(await screen.findByText("1건 · 5분")).toBeVisible();
  });

  it("flags a stored past exam date instead of rendering negative planning numbers", async () => {
    const learnerId = getOrCreateGuestId(window.localStorage, () => "past-plan");
    saveLocalStudySettings(window.localStorage, learnerId, {
      examDate: "2000-01-01",
      dailyMinutes: 45,
      updatedAt: "1999-12-31T00:00:00.000Z",
    });

    render(<ExamCoachGuestToday />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      /시험 예정일 2000-01-01은 현재 날짜 .*보다 이전입니다/,
    );
    expect(screen.queryByText(/-\d+일/)).not.toBeInTheDocument();
  });

  it("shows a clear error for corrupted invalid stored exam dates", async () => {
    const learnerId = getOrCreateGuestId(window.localStorage, () => "invalid-plan");
    window.localStorage.setItem(
      "exam-coach:v1:settings",
      JSON.stringify({
        schemaVersion: 1,
        learnerId,
        examDate: "2026-02-31",
        dailyMinutes: 45,
        updatedAt: "2026-09-01T00:00:00.000Z",
      }),
    );

    render(<ExamCoachGuestToday />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "시험 예정일이 올바른 날짜가 아닙니다. 다시 저장해 주세요.",
    );
  });

  it("completes baseline diagnosis without persisting answer text", async () => {
    const user = userEvent.setup();
    render(<ExamCoachGuestToday />);

    await user.click(
      await screen.findByRole("button", { name: "기준선 진단 시작" }),
    );

    for (const [index, item] of BASELINE_DIAGNOSTIC.items.entries()) {
      await user.type(await screen.findByLabelText("답안"), item.answer);
      await user.click(
        screen.getByRole("button", {
          name:
            index + 1 === BASELINE_DIAGNOSTIC.items.length
              ? "진단 완료"
              : "답안 제출 후 다음",
        }),
      );
    }

    expect(await screen.findByText("6 / 6")).toBeVisible();
    const persisted = [
      window.localStorage.getItem("exam-coach:v1:learning-events"),
      window.localStorage.getItem("exam-coach:v1:diagnostic-runs"),
    ].join("\n");

    expect(persisted).not.toMatch(
      /"(answer|response|submittedResponse|explanation|prompt)"/u,
    );
    expect(persisted).not.toContain(BASELINE_DIAGNOSTIC.items[0]!.answer);
  });
});
