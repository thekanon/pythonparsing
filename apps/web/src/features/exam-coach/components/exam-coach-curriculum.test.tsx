import { render, screen, within } from "@testing-library/react";

import { OFFICIAL_OBJECTIVES_2026 } from "@/features/exam-coach/core";

import { ExamCoachCurriculum } from "./exam-coach-curriculum";

// prettier-ignore
describe("ExamCoachCurriculum", () => {
  it("shows all official domains while limiting the active pilot to SQL and C", () => {
    render(<ExamCoachCurriculum />);

    expect(
      screen.getByRole("heading", { name: "정보처리기사 실기 커리큘럼" }),
    ).toBeVisible();

    const officialScope = screen.getByRole("list", {
      name: "2026 공식 12개 영역",
    });
    for (const objective of OFFICIAL_OBJECTIVES_2026) {
      expect(
        within(officialScope).getByRole("heading", {
          name: objective.nameKo,
        }),
      ).toBeVisible();
    }

    expect(screen.getAllByText("현재 개인 검증 범위")).toHaveLength(2);
    expect(screen.getAllByText("향후 확장")).toHaveLength(10);
    expect(screen.getByText("2 / 12")).toBeVisible();
    expect(screen.getByText("10개")).toBeVisible();
  });

  it("shows prerequisite learning order separately from official scope order", () => {
    render(<ExamCoachCurriculum />);

    const sqlPath = screen.getByRole("region", { name: "SQL 응용 학습 경로" });
    const cPath = screen.getByRole("region", { name: "C 언어 학습 경로" });
    expect(sqlPath).toBeVisible();
    expect(cPath).toBeVisible();
    expect(within(sqlPath).getAllByText("선수지식: SELECT와 FROM")).toHaveLength(2);
    expect(within(cPath).getByText("선수지식: 배열")).toBeVisible();
    expect(
      screen.getByText(/아래 순서는 공식 영역의 번호가 아니라/u),
    ).toBeVisible();
  });
});
