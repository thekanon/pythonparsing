import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WEEKLY_ASSESSMENT } from "@/features/exam-coach/core";

import { ExamCoachWeeklyAssessment } from "./exam-coach-weekly-assessment";

describe("ExamCoachWeeklyAssessment", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("completes all items before showing and privately persisting the summary", async () => {
    const user = userEvent.setup();
    render(<ExamCoachWeeklyAssessment />);

    await user.click(
      await screen.findByRole("button", { name: "주간 미니 테스트 시작" }),
    );

    for (const [index, item] of WEEKLY_ASSESSMENT.items.entries()) {
      expect(
        screen.queryByRole("heading", { name: "최근 주간 결과" }),
      ).toBeNull();
      await user.type(await screen.findByLabelText("답안"), item.answer);
      await user.click(
        screen.getByRole("button", {
          name:
            index + 1 === WEEKLY_ASSESSMENT.items.length
              ? "주간 테스트 완료"
              : "답안 제출 후 다음",
        }),
      );
    }

    expect(
      await screen.findByRole("heading", { name: "최근 주간 결과" }),
    ).toBeVisible();
    expect(screen.getAllByText("10 / 10")).toHaveLength(2);
    expect(
      screen.getByRole("list", { name: "개념별 결과" }).children,
    ).toHaveLength(10);

    const rawEvents = window.localStorage.getItem(
      "exam-coach:v1:learning-events",
    );
    const rawRuns = window.localStorage.getItem(
      "exam-coach:v1:diagnostic-runs",
    );
    expect(rawEvents).not.toBeNull();
    expect(rawRuns).not.toBeNull();
    const events = JSON.parse(rawEvents ?? "{}").events as Array<{
      mode: string;
    }>;
    const runs = JSON.parse(rawRuns ?? "{}").runs as Array<{
      summary: { form: string; conceptResults: unknown[] };
    }>;
    expect(events).toHaveLength(10);
    expect(events.every((event) => event.mode === "assessment")).toBe(true);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.summary.form).toBe("weekly");
    expect(runs[0]?.summary.conceptResults).toHaveLength(10);

    const persisted = `${rawEvents}\n${rawRuns}`;
    expect(persisted).not.toMatch(
      /"(answer|response|submittedResponse|explanation|prompt)"/u,
    );
    expect(persisted).not.toContain(WEEKLY_ASSESSMENT.items[1]!.answer);
  });
});
