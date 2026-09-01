import {
  BOOK_READING_PROGRESS_STORAGE_KEY,
  getBookReadingProgress,
  saveBookReadingProgress,
} from "@/features/books/reading-progress";

describe("book reading progress", () => {
  it("stores only a section location and scroll offset", () => {
    saveBookReadingProgress("daddy-long-legs", "letter-003", 415.6);

    expect(getBookReadingProgress("daddy-long-legs")).toMatchObject({
      sectionSlug: "letter-003",
      scrollY: 416,
    });
    expect(
      localStorage.getItem(BOOK_READING_PROGRESS_STORAGE_KEY),
    ).not.toContain("paragraphs");
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem(
      BOOK_READING_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        "daddy-long-legs": { sectionSlug: "../bad", scrollY: -1 },
      }),
    );

    expect(getBookReadingProgress("daddy-long-legs")).toBeNull();
  });
});
