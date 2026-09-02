import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BASELINE_DIAGNOSTIC } from "@/features/exam-coach/core";

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
