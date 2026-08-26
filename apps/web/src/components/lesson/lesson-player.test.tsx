import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PublicLesson } from "@/features/lessons/types";

import { LessonPlayer } from "./lesson-player";

const lesson: PublicLesson = {
  id: "2026-08-26-fixture-01",
  revisionId: "fixture-revision",
  learningDate: "2026-08-26",
  ordinal: 1,
  source: {
    provider: "fixture",
    label: "fixture",
    url: "https://example.com",
    publishedAt: "2026-08-26T00:00:00Z",
    fixture: true,
  },
  stages: [
    {
      stage: "title",
      english: "Synthetic title",
      tokens: [
        { id: "one", text: "첫째" },
        { id: "two", text: "둘째" },
      ],
    },
    {
      stage: "excerpt",
      english: "Synthetic excerpt.",
      tokens: [{ id: "excerpt", text: "발췌" }],
    },
  ],
};

describe("LessonPlayer", () => {
  it("supports tap placement, keyboard reordering, and exact submission feedback", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            complete: true,
            score: 100,
            incorrectPositions: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /둘째 어절을 내 문장으로 이동/u }),
    );
    const firstPlaced = screen.getByRole("button", {
      name: /1번째 어절 첫째/u,
    });
    fireEvent.keyDown(firstPlaced, { key: "ArrowRight", altKey: true });

    await user.click(screen.getByRole("button", { name: "순서 확인" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0]?.[1];
    expect(request).toBeDefined();
    if (!request) throw new Error("Expected a request init value.");
    expect(JSON.parse(String(request.body))).toEqual({
      stage: "title",
      tokenIds: ["two", "one"],
    });
    expect(await screen.findByText("정확한 순서입니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /발췌 단계로/u })).toBeEnabled();
  });

  it("marks each misplaced word directly instead of listing position numbers", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            complete: false,
            score: 0,
            incorrectPositions: [0, 1],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /둘째 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));

    expect(
      await screen.findByText("빨간 밑줄로 표시한 어절을 다시 배치해 보세요."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/번째 어절 위치/u)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /오류로 표시됨/u }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: /오류로 표시됨/u })[0],
    ).toHaveAccessibleName(/순서가 맞지 않아 오류로 표시됨/u);
    expect(
      screen
        .getAllByRole("button", { name: /오류로 표시됨/u })[0]
        ?.closest('[data-incorrect="true"]'),
    ).not.toBeNull();
  });
});
