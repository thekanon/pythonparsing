import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PublicLesson } from "@/features/lessons/types";
import {
  getAnonymousProgressSnapshot,
  replaceAnonymousProgress,
} from "@/features/progress/storage";
import { progressKey } from "@/features/progress/types";

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
  it("shows the lesson guide only on the first visit", async () => {
    const firstRender = render(<LessonPlayer lesson={lesson} />);

    expect(
      await screen.findByText(/영단어를 더블클릭하면 한국어 뜻/u),
    ).toBeInTheDocument();

    firstRender.unmount();
    render(<LessonPlayer lesson={lesson} />);

    expect(
      screen.queryByText(/영단어를 더블클릭하면 한국어 뜻/u),
    ).not.toBeInTheDocument();
  });

  it("shows a Korean meaning when an English word is double-clicked", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ word: "synthetic", meaning: "합성의" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    await user.dblClick(
      screen.getByRole("button", { name: "Synthetic 뜻 보기" }),
    );

    expect(await screen.findByText("합성의")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/word-meaning?lessonId=2026-08-26-fixture-01&stage=title&word=synthetic&source=lesson",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

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

  it("places one correct block when the learner uses a staged hint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        complete: false,
        score: 0,
        incorrectPositions: [0, 1],
        attemptProof: "proof",
        hint: { position: 0, tokenId: "one" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    await user.click(
      screen.getByRole("button", { name: /둘째 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));
    await user.click(
      await screen.findByRole("button", { name: "다음 블록 힌트" }),
    );

    expect(
      screen.getByRole("button", { name: /1번째 어절 첫째/u }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/빨간 밑줄/u)).not.toBeInTheDocument();
  });

  it("guides the interpretation order without merging word blocks", async () => {
    const guidedLesson: PublicLesson = {
      ...lesson,
      stages: [
        {
          ...lesson.stages[0],
          grammarGuide: {
            provider: "claude-cli/sonnet",
            structure: "주어 + 목적어 + 동사",
            steps: [
              {
                role: "주어",
                englishPhrase: "Synthetic",
                koreanFunction: "행동의 주체를 나타냅니다.",
                instruction: "누가 행동하는지 먼저 찾으세요.",
                tokenIds: ["one"],
              },
              {
                role: "서술어",
                englishPhrase: "title",
                koreanFunction: "주어의 상태를 설명합니다.",
                instruction: "한국어에서는 서술어가 뒤에 옵니다.",
                tokenIds: ["two"],
              },
            ],
            grammarPoints: [
              {
                expression: "Synthetic title",
                explanation: "명사가 다른 명사를 꾸미는 구조입니다.",
              },
            ],
          },
        },
        lesson.stages[1],
      ],
    };
    const user = userEvent.setup();
    render(<LessonPlayer lesson={guidedLesson} />);

    await user.click(screen.getByRole("button", { name: "문장 구조 보기" }));

    expect(
      screen.getByText("전체 구조: 주어 + 목적어 + 동사"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("누가 행동하는지 먼저 찾으세요."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "관련 어절 표시" }));
    expect(
      screen
        .getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u })
        .closest('[data-grammar-guided="true"]'),
    ).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "다음 단계" }));
    expect(
      screen.getByText("한국어에서는 서술어가 뒤에 옵니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "관련 어절 표시" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("finishes the sentence-structure screen before opening word arrangement", async () => {
    const reasoningStage = {
      stage: "excerpt" as const,
      english: "I read books.",
      tokens: [
        { id: "object", text: "책을" },
        { id: "verb", text: "읽어요" },
        { id: "subject", text: "나는" },
      ],
      grammarGuide: {
        provider: "claude-cli/sonnet" as const,
        learningMode: "structure-reasoning" as const,
        structure: "주어 + 동사 + 목적어",
        steps: [
          {
            role: "주어",
            englishPhrase: "I",
            koreanFunction: "행동의 주체",
            instruction: "누가 읽는지 먼저 찾습니다.",
            tokenIds: ["subject"],
          },
          {
            role: "목적어",
            englishPhrase: "books",
            koreanFunction: "읽는 대상",
            instruction: "한국어에서는 읽는 대상을 서술어 앞에 둡니다.",
            tokenIds: ["object"],
          },
          {
            role: "동사",
            englishPhrase: "read",
            koreanFunction: "중심 행동",
            instruction: "영어보다 뒤로 옮겨 문장을 마무리합니다.",
            tokenIds: ["verb"],
          },
        ],
        grammarPoints: [],
      },
    };
    const reasoningLesson: PublicLesson = {
      ...lesson,
      id: "daddy-long-legs:blue-wednesday:sentence-test",
      stages: [reasoningStage, reasoningStage],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        Response.json({
          complete: true,
          score: 100,
          incorrectPositions: [],
        }),
      ),
    );
    const user = userEvent.setup();
    render(
      <LessonPlayer
        lesson={reasoningLesson}
        contentKind="book-practice"
        singleStage
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "영어 어구를 알맞은 문장 성분에 넣어보세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1단계 · 영문 문장 구조")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "내 문장" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "문장 구조 퍼즐" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "단어 배열 시작" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "read 어구 선택" }));
    await user.click(
      screen.getByRole("button", { name: "목적어 자리. 비어 있음" }),
    );
    expect(screen.getByText(/“read”는 동사 역할입니다/u)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "동사 자리. 비어 있음" }),
    );
    expect(screen.getByText(/동사 자리를 찾았습니다/u)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "정답 구조 보기" }));
    expect(screen.getByText("영어가 말하는 순서")).toBeInTheDocument();
    expect(screen.getByText("자연스러운 한국어 순서")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "왜 이 순서인가요?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("앞으로 이동")).toBeInTheDocument();
    expect(screen.getByText("뒤로 이동")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "한국어 블록 표시" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "단어 배열 시작" }));

    expect(
      screen.queryByRole("heading", {
        name: "영어 어구를 알맞은 문장 성분에 넣어보세요",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "내 문장" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /나는 어절을 내 문장으로 이동/u }),
    ).toBeInTheDocument();
    expect(screen.getByText("2/2")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /책을 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /읽어요 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /나는 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));

    expect(
      getAnonymousProgressSnapshot().stages[
        progressKey(`book-practice:${reasoningLesson.id}`, "excerpt")
      ]?.helped,
    ).toBe(true);
  });

  it("returns a placed block by click or ArrowDown and keeps keyboard focus", async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    expect(
      screen.queryByRole("button", {
        name: "첫째 어절을 후보로 돌려보내기",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /1번째 어절 첫째/u }));
    expect(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    const placed = screen.getByRole("button", { name: /1번째 어절 첫째/u });
    placed.focus();
    await user.keyboard(" ");
    expect(placed).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{ArrowDown}");

    const returned = screen.getByRole("button", {
      name: /첫째 어절을 내 문장으로 이동/u,
    });
    expect(returned).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("button", { name: /둘째 어절을 내 문장으로 이동/u }),
    ).toHaveFocus();
  });

  it("uses Reddit labels, word lookup, grading, and local-only progress keys", async () => {
    const redditLesson: PublicLesson = {
      ...lesson,
      id: "reddit-topic-1",
      source: { ...lesson.source, provider: "Reddit", fixture: false },
    };
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/start")) return new Response(null, { status: 204 });
      if (url.startsWith("/api/word-meaning")) {
        return Response.json({ word: "synthetic", meaning: "합성의" });
      }
      return Response.json({
        complete: true,
        score: 100,
        incorrectPositions: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={redditLesson} contentKind="reddit" />);

    expect(screen.getByText("지문", { exact: true })).toBeInTheDocument();
    await user.dblClick(
      screen.getByRole("button", { name: "Synthetic 뜻 보기" }),
    );
    expect(await screen.findByText("합성의")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/word-meaning?lessonId=reddit-topic-1&stage=title&word=synthetic&source=reddit",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /둘째 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reddit-lessons/reddit-topic-1/grade",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses book labels and the public-domain lesson endpoints", async () => {
    const bookLesson: PublicLesson = {
      ...lesson,
      id: "daddy-long-legs-opening-01",
      source: {
        ...lesson.source,
        provider: "Project Gutenberg",
        fixture: false,
      },
    };
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/start")) return new Response(null, { status: 204 });
      if (url.startsWith("/api/word-meaning")) {
        return Response.json({ word: "synthetic", meaning: "합성의" });
      }
      return Response.json({
        complete: true,
        score: 100,
        incorrectPositions: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={bookLesson} contentKind="book" />);

    expect(screen.getByText("본문", { exact: true })).toBeInTheDocument();
    await user.dblClick(
      screen.getByRole("button", { name: "Synthetic 뜻 보기" }),
    );
    expect(await screen.findByText("합성의")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/word-meaning?lessonId=daddy-long-legs-opening-01&stage=title&word=synthetic&source=book",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await user.click(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    );
    await user.click(
      screen.getByRole("button", { name: /둘째 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/book-lessons/daddy-long-legs-opening-01/grade",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("runs one book sentence stage and advances without a title stage", async () => {
    const next = vi.fn();
    const practiceStage = {
      stage: "excerpt" as const,
      english: "Synthetic sentence.",
      tokens: [{ id: "practice-one", text: "연습" }],
    };
    const practiceLesson: PublicLesson = {
      ...lesson,
      id: "daddy-long-legs-intro-s001",
      stages: [practiceStage, practiceStage],
    };
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        complete: true,
        score: 100,
        incorrectPositions: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <LessonPlayer
        lesson={practiceLesson}
        contentKind="book-practice"
        singleStage
        onNextLesson={next}
        nextLessonLabel="다음 문장"
      />,
    );

    expect(
      screen.queryByRole("button", { name: /1\/2/u }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("영문 본문", { exact: true })).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /연습 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/book-practice/daddy-long-legs-intro-s001/grade",
      expect.objectContaining({ method: "POST" }),
    );
    await user.click(screen.getByRole("button", { name: /다음 문장/u }));
    expect(next).toHaveBeenCalledOnce();
  });

  it("automatically advances after a correct book-practice answer", async () => {
    const next = vi.fn();
    const practiceStage = {
      stage: "excerpt" as const,
      english: "Synthetic sentence.",
      tokens: [{ id: "practice-one", text: "연습" }],
    };
    const practiceLesson: PublicLesson = {
      ...lesson,
      id: "book-sentence-auto",
      stages: [practiceStage, practiceStage],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        Response.json({
          complete: true,
          score: 100,
          incorrectPositions: [],
        }),
      ),
    );
    const user = userEvent.setup();

    render(
      <LessonPlayer
        lesson={practiceLesson}
        contentKind="book-practice"
        singleStage
        autoAdvance
        autoAdvanceDelayMs={1}
        onNextLesson={next}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /연습 어절을 내 문장으로 이동/u }),
    );
    await user.click(screen.getByRole("button", { name: "순서 확인" }));

    expect(await screen.findByText(/다음 문장으로 이동합니다/u)).toBeVisible();
    await waitFor(() => expect(next).toHaveBeenCalledOnce());
  });

  it("lets a learner reopen and replay a completed stage", async () => {
    const completedAt = "2026-08-27T00:00:00.000Z";
    replaceAnonymousProgress({
      version: 1,
      stages: {
        [progressKey(lesson.id, "title")]: {
          attempts: 1,
          bestScore: 100,
          completedAt,
          helped: false,
          lastAttemptAt: completedAt,
        },
      },
    });
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    expect(screen.getByText("완료한 단계입니다.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /2\/2 발췌/u })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "다시 풀기" }));

    expect(screen.queryByText("완료한 단계입니다.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /첫째 어절을 내 문장으로 이동/u }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "순서 확인" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /2\/2 발췌/u }));
    expect(screen.getByText("영문 발췌", { exact: true })).toBeInTheDocument();
  });
});
