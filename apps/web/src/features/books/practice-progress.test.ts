import {
  BOOK_PRACTICE_PROGRESS_STORAGE_KEY,
  getBookPracticeProgress,
  saveBookPracticeProgress,
} from "@/features/books/practice-progress";

describe("book practice progress", () => {
  it("stores a section and one-based sentence position", () => {
    saveBookPracticeProgress("daddy-long-legs", "letter-003", 12.4);

    expect(getBookPracticeProgress("daddy-long-legs")).toMatchObject({
      sectionSlug: "letter-003",
      sentencePosition: 12,
    });
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem(
      BOOK_PRACTICE_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        "daddy-long-legs": {
          sectionSlug: "../bad",
          sentencePosition: 0,
          updatedAt: "today",
        },
      }),
    );

    expect(getBookPracticeProgress("daddy-long-legs")).toBeNull();
  });
});
