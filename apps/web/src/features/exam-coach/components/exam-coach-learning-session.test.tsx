import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  LEARNING_CONTENT_CATALOG,
  TS_FSRS_VERSION,
  type LearningEvent,
} from "@/features/exam-coach/core";

import { ExamCoachLearningSession } from "./exam-coach-learning-session";

const sqlSample = LEARNING_CONTENT_CATALOG["sql-select-basics"];

// prettier-ignore
describe("ExamCoachLearningSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps hints, answer, explanation, and grading result hidden before the first submit", async () => {
    render(<ExamCoachLearningSession content={sqlSample} />);

    const submitButton = screen.getByRole("button", { name: "첫 답안 제출" });
    await waitFor(() => expect(submitButton).toBeEnabled());

    expect(screen.getByText(sqlSample.prompt)).toBeVisible();
    expect(screen.getByText(/검수된 SQL 문항에서 묻는 핵심 역할/)).toBeVisible();
    expect(screen.queryByText(sqlSample.objective)).not.toBeInTheDocument();
    expect(screen.queryByText(sqlSample.answer)).not.toBeInTheDocument();
    expect(screen.queryByText(sqlSample.explanation)).not.toBeInTheDocument();
    expect(screen.queryByText(sqlSample.hints!.conceptClue)).not.toBeInTheDocument();
    expect(screen.queryByText(sqlSample.hints!.structureHint)).not.toBeInTheDocument();
    expect(screen.queryByText(sqlSample.hints!.specificHint)).not.toBeInTheDocument();
    expect(screen.queryByText(/첫 제출 정답/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hard" })).not.toBeInTheDocument();
  });

  it("stores an independent correct first submit with the selected recall rating and refreshes FSRS", async () => {
    const user = userEvent.setup();
    render(<ExamCoachLearningSession content={sqlSample} />);

    await waitUntilReady();
    await user.type(screen.getByLabelText("답안"), "SELECT");
    await user.click(screen.getByRole("button", { name: "첫 답안 제출" }));

    expect(screen.getByText(/첫 제출 정답입니다/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Hard" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Good" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Easy" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Again" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Good" }));

    expect(await screen.findByText(/Good 등급으로 학습 이벤트를 저장/)).toBeVisible();
    expect(screen.getByLabelText("FSRS 기억 일정")).toHaveTextContent("다음 복습");

    const event = onlyStoredLearningEvent();
    expect(event).toMatchObject({
      contentId: sqlSample.id,
      contentVersion: sqlSample.version,
      cardId: sqlSample.id,
      correct: true,
      rating: "Good",
      helpLevel: 0,
      mode: "recall",
      firstSubmission: true,
      fsrsVersion: TS_FSRS_VERSION,
    });
    expect(event.responseTimeMs).toBeGreaterThanOrEqual(0);

    const persisted = window.localStorage.getItem("exam-coach:v1:learning-events") ?? "";
    expect(persisted).not.toMatch(
      /"(answer|response|submittedResponse|correctionResponse|explanation|prompt)"/u,
    );
  });

  it("reveals exactly one help step at a time and forces a helped correction to Again", async () => {
    const user = userEvent.setup();
    render(<ExamCoachLearningSession content={sqlSample} />);

    await waitUntilReady();
    await user.type(screen.getByLabelText("답안"), "FROM");
    await user.click(screen.getByRole("button", { name: "첫 답안 제출" }));

    expect(screen.getByText(/첫 제출은 정답이 아닙니다/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Hard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Good" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Easy" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "개념 단서 보기" }));
    expect(screen.getByText(sqlSample.hints!.conceptClue)).toBeVisible();
    expect(screen.queryByText(sqlSample.hints!.structureHint)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "구조 힌트 보기" }));
    expect(screen.getByText(sqlSample.hints!.structureHint)).toBeVisible();
    expect(screen.queryByText(sqlSample.hints!.specificHint)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "구체적 힌트 보기" }));
    expect(screen.getByText(sqlSample.hints!.specificHint)).toBeVisible();
    expect(screen.queryByText(sqlSample.explanation)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "해설·정답 보기" }));
    expect(screen.getByText(sqlSample.explanation)).toBeVisible();
    expect(screen.getByText(`정답: ${sqlSample.answer}`)).toBeVisible();

    await user.type(screen.getByLabelText("교정 답안"), "SELECT");
    await user.click(screen.getByRole("button", { name: "교정 답안 제출" }));

    expect(await screen.findByText(/FSRS 등급은 Again으로 고정/)).toBeVisible();
    const event = onlyStoredLearningEvent();
    expect(event).toMatchObject({
      correct: false,
      rating: "Again",
      helpLevel: 4,
      mode: "recall",
      firstSubmission: true,
    });
    expect(screen.queryByRole("button", { name: "Hard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Good" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Easy" })).not.toBeInTheDocument();
  });

  it("forces an incorrect first submit to Again even when correction succeeds without help", async () => {
    const user = userEvent.setup();
    render(<ExamCoachLearningSession content={sqlSample} />);

    await waitUntilReady();
    await user.type(screen.getByLabelText("답안"), "FROM");
    await user.click(screen.getByRole("button", { name: "첫 답안 제출" }));
    await user.type(screen.getByLabelText("교정 답안"), "SELECT");
    await user.click(screen.getByRole("button", { name: "교정 답안 제출" }));

    const event = onlyStoredLearningEvent();
    expect(event).toMatchObject({
      correct: false,
      rating: "Again",
      helpLevel: 0,
    });
  });

  it("rejects event finalization if the content version changes after a correct first submit", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExamCoachLearningSession content={sqlSample} />);

    await waitUntilReady();
    await user.type(screen.getByLabelText("답안"), "SELECT");
    await user.click(screen.getByRole("button", { name: "첫 답안 제출" }));
    expect(screen.getByRole("button", { name: "Good" })).toBeVisible();

    rerender(<ExamCoachLearningSession content={revisedSqlSample()} />);
    await user.click(screen.getByRole("button", { name: "Good" }));

    expect(
      await screen.findByText(/콘텐츠 버전이 변경되어 제출을 거부했습니다/),
    ).toBeVisible();
    expect(
      window.localStorage.getItem("exam-coach:v1:learning-events"),
    ).toBeNull();
  });

  it("rejects submission if the content version changes during the active session", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExamCoachLearningSession content={sqlSample} />);

    await waitUntilReady();
    rerender(<ExamCoachLearningSession content={revisedSqlSample()} />);

    await user.type(screen.getByLabelText("답안"), "SELECT");
    await user.click(screen.getByRole("button", { name: "첫 답안 제출" }));

    expect(
      await screen.findByText(/콘텐츠 버전이 변경되어 제출을 거부했습니다/),
    ).toBeVisible();
    expect(
      window.localStorage.getItem("exam-coach:v1:learning-events"),
    ).toBeNull();
  });
});

async function waitUntilReady() {
  const submitButton = screen.getByRole("button", { name: "첫 답안 제출" });
  await waitFor(() => expect(submitButton).toBeEnabled());
}

function revisedSqlSample() {
  return {
    ...sqlSample,
    version: sqlSample.version + 1,
    review: sqlSample.review
      ? {
          ...sqlSample.review,
          reviewedVersion: sqlSample.version + 1,
        }
      : undefined,
  };
}

function onlyStoredLearningEvent(): LearningEvent {
  const raw = window.localStorage.getItem("exam-coach:v1:learning-events");
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw ?? "{}") as { events?: LearningEvent[] };
  expect(parsed.events).toHaveLength(1);
  return parsed.events![0]!;
}
