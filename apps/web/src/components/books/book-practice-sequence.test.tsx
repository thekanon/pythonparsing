import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { replaceAnonymousProgress } from "@/features/progress/storage";
import { progressKey } from "@/features/progress/types";
import type { PublicBookPracticeSentence } from "@/server/book-practice";

import { BookPracticeSequence } from "./book-practice-sequence";

const sentences: PublicBookPracticeSentence[] = [
  {
    id: "book:chapter-01:sentence-0001",
    position: 1,
    english: "First sentence.",
    tokens: [{ id: "first-token", text: "첫 문장" }],
  },
  {
    id: "book:chapter-01:sentence-0002",
    position: 2,
    english: "Second sentence.",
    tokens: [{ id: "second-token", text: "둘째 문장" }],
  },
  {
    id: "book:chapter-01:sentence-0003",
    position: 3,
    english: "Third sentence.",
    tokens: [{ id: "third-token", text: "셋째 문장" }],
  },
];

describe("BookPracticeSequence", () => {
  it("shows completion states and filters to sentences that need review", async () => {
    const now = "2026-08-31T00:00:00.000Z";
    replaceAnonymousProgress({
      version: 1,
      stages: {
        [progressKey(`book-practice:${sentences[0]!.id}`, "excerpt")]: {
          attempts: 1,
          bestScore: 100,
          completedAt: now,
          helped: false,
          lastAttemptAt: now,
        },
        [progressKey(`book-practice:${sentences[1]!.id}`, "excerpt")]: {
          attempts: 1,
          bestScore: 50,
          completedAt: null,
          helped: false,
          lastAttemptAt: now,
        },
        [progressKey(`book-practice:${sentences[2]!.id}`, "excerpt")]: {
          attempts: 2,
          bestScore: 100,
          completedAt: now,
          helped: false,
          lastAttemptAt: now,
        },
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response(null, { status: 204 })),
    );
    const user = userEvent.setup();

    render(
      <BookPracticeSequence
        bookSlug="book"
        bookTitle="Book"
        sourceUrl="https://example.com/book"
        sectionSlug="chapter-01"
        sectionPosition={1}
        sectionTotal={1}
        sentences={sentences}
      />,
    );

    expect(screen.getByText("완료 2/3, 복습 대상 2개")).toBeVisible();
    expect(
      screen.getByRole("option", { name: /1 \/ 3 \(완료\)/u }),
    ).toBeVisible();
    expect(
      screen.getByRole("option", { name: /2 \/ 3 \(오답\)/u }),
    ).toBeVisible();
    expect(
      screen.getByRole("option", { name: /3 \/ 3 \(완료, 복습 권장\)/u }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "오답만 복습 2" }));

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.queryByRole("option", { name: /1 \/ 3/u })).toBeNull();
    expect(screen.getByText("복습 1/2")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "전체 문장 보기" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
