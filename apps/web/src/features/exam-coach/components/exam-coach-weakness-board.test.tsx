import { render, screen, within } from "@testing-library/react";

import {
  LEARNING_CONTENT_CATALOG,
  type ConceptWeaknessEntry,
  type ContentItem,
  type WeaknessBoard,
} from "@/features/exam-coach/core";

import { WeaknessBoardView } from "./exam-coach-weakness-board";

const NOW = "2026-09-04T10:00:00.000Z";
const sqlSample = LEARNING_CONTENT_CATALOG["sql-select-basics"];

// prettier-ignore
describe("WeaknessBoardView", () => {
  it("renders missing weakness evidence as 측정 없음 instead of a fake zero", () => {
    render(<WeaknessBoardView board={boardWith()} reviewedContent={[]} />);

    const card = conceptCard();
    expect(within(card).getAllByText("측정 없음").length).toBeGreaterThanOrEqual(4);
    expect(within(card).queryByText(/0%/u)).not.toBeInTheDocument();
  });

  it("links the first due card to the exact reviewed learning content", () => {
    render(
      <WeaknessBoardView
        board={boardWith({
          hasEvidence: true,
          latestEvidenceAt: "2026-09-03T08:00:00.000Z",
          dueCardIds: [sqlSample.id],
          signals: [
            {
              kind: "review-debt",
              count: 1,
              latestAt: "2026-09-03T09:00:00.000Z",
            },
          ],
        })}
        reviewedContent={[sqlSample]}
      />,
    );

    expect(screen.getByRole("link", { name: "만기 복습하기" })).toHaveAttribute(
      "href",
      `/exam-coach/learn?content=${sqlSample.id}`,
    );
    expect(screen.getByText(/가장 빠른 만기/u)).toBeVisible();
  });

  it("shows 동형 문제 없음 as neutral text and never links the same card as a variant", () => {
    render(
      <WeaknessBoardView
        board={boardWith({ dueCardIds: [sqlSample.id] })}
        reviewedContent={[sqlSample]}
      />,
    );

    expect(screen.getByText("동형 문제 없음")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByRole("link", { name: /동형/u })).not.toBeInTheDocument();
  });

  it("routes the first prerequisite gap to reviewed prerequisite content when available", () => {
    const prerequisiteContent = reviewedPrerequisiteContent();
    render(
      <WeaknessBoardView
        board={boardWith({ prerequisiteGapConceptIds: ["sql-table-row-column"] })}
        reviewedContent={[prerequisiteContent]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "선행 개념 보기: 테이블·행·열" }),
    ).toHaveAttribute(
      "href",
      `/exam-coach/learn?content=${prerequisiteContent.id}`,
    );
  });

  it("falls back to curriculum when the prerequisite has no reviewed content", () => {
    render(
      <WeaknessBoardView
        board={boardWith({ prerequisiteGapConceptIds: ["sql-table-row-column"] })}
        reviewedContent={[]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "선행 개념 보기: 테이블·행·열" }),
    ).toHaveAttribute("href", "/exam-coach/curriculum");
    expect(
      screen.getByText("해당 개념의 검수 콘텐츠가 아직 없습니다."),
    ).toBeVisible();
  });

  it("shows application content as pending without inventing an application link", () => {
    render(
      <WeaknessBoardView
        board={boardWith({
          hasEvidence: true,
          latestEvidenceAt: "2026-09-03T08:00:00.000Z",
          signals: [
            {
              kind: "application-failure",
              count: 2,
              latestAt: "2026-09-03T08:00:00.000Z",
            },
          ],
        })}
        reviewedContent={[]}
      />,
    );

    expect(screen.getByText("적용 콘텐츠 준비 중")).toBeVisible();
    expect(screen.queryByRole("link", { name: /적용/u })).not.toBeInTheDocument();
  });
});

function boardWith(
  overrides: Partial<ConceptWeaknessEntry> = {},
): WeaknessBoard {
  const entry: ConceptWeaknessEntry = {
    conceptId: "sql-select",
    conceptTitle: "SELECT와 FROM",
    domainId: "sql",
    signals: [],
    hasEvidence: false,
    latestEvidenceAt: null,
    dueCardIds: [],
    prerequisiteGapConceptIds: [],
    ...overrides,
  };

  return {
    generatedAt: NOW,
    conceptCount: 1,
    conceptsWithEvidence: entry.hasEvidence ? 1 : 0,
    entries: [entry],
  };
}

function conceptCard(): HTMLElement {
  const card = screen
    .getByRole("heading", { name: "SELECT와 FROM" })
    .closest("article");
  if (!card) throw new Error("missing SELECT weakness card");
  return card;
}

function reviewedPrerequisiteContent(): ContentItem {
  return {
    ...sqlSample,
    id: "sql.table-row-column.reviewed",
    conceptIds: ["sql-table-row-column"],
    prerequisites: [],
    objective: "테이블·행·열의 역할을 구분한다.",
    prompt: "테이블의 한 가로 묶음을 무엇이라 하는가?",
    answer: "행",
    explanation: "행은 한 레코드에 해당한다.",
    grading: { strategy: "exact", acceptedAnswers: ["행"] },
  };
}
