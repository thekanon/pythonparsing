import {
  createBookPracticeTokens,
  findBookPracticeSentence,
  getBookPracticeSectionParams,
  getBookPracticeText,
  toPublicBookPracticeSentence,
} from "@/server/book-practice";

describe("whole-book sentence practice", () => {
  it("contains every reader section and more than 7,900 sentences", () => {
    const daddy = getBookPracticeText("daddy-long-legs");
    const oz = getBookPracticeText("the-wonderful-wizard-of-oz");
    const alice = getBookPracticeText("alice-in-wonderland");
    const jekyll = getBookPracticeText("dr-jekyll-and-mr-hyde");

    expect(daddy?.scope).toBe("all");
    expect(daddy?.sections).toHaveLength(89);
    expect(oz?.scope).toBe("all");
    expect(oz?.sections).toHaveLength(25);
    expect(alice?.scope).toBe("all");
    expect(alice?.sections).toHaveLength(12);
    expect(jekyll?.scope).toBe("all");
    expect(jekyll?.sections).toHaveLength(10);
    expect(
      (daddy?.sentenceCount ?? 0) +
        (oz?.sentenceCount ?? 0) +
        (alice?.sentenceCount ?? 0) +
        (jekyll?.sentenceCount ?? 0),
    ).toBeGreaterThan(7_900);
    expect(getBookPracticeSectionParams()).toHaveLength(136);
  });

  it("has a Korean translation and unique id for every sentence", () => {
    const texts = [
      getBookPracticeText("daddy-long-legs"),
      getBookPracticeText("the-wonderful-wizard-of-oz"),
      getBookPracticeText("alice-in-wonderland"),
      getBookPracticeText("dr-jekyll-and-mr-hyde"),
    ];
    const ids = new Set<string>();

    for (const text of texts) {
      expect(text).not.toBeNull();
      for (const section of text!.sections) {
        expect(section.sentences).toHaveLength(section.sentenceCount);
        for (const sentence of section.sentences) {
          expect(sentence.korean).toMatch(/[가-힣]/u);
          expect(ids.has(sentence.id)).toBe(false);
          ids.add(sentence.id);
        }
      }
    }
  });

  it("uses the reviewed opening translation when it matches a curated passage", () => {
    const sentence = findBookPracticeSentence(
      "daddy-long-legs:blue-wednesday:sentence-0001",
    );
    const tokens = createBookPracticeTokens(
      "daddy-long-legs:blue-wednesday:sentence-0001",
    );

    expect(sentence?.korean).toContain("매달 첫 번째 수요일");
    expect(tokens?.map((token) => token.text).join(" ")).toBe(sentence?.korean);
  });

  it("uses the reviewed Alice translation for a corrected machine translation", () => {
    const sentence = findBookPracticeSentence(
      "alice-in-wonderland:chapter-01:sentence-0083",
    );

    expect(sentence?.korean).toContain("케이크를 다 먹었다");
  });

  it("uses the reviewed Jekyll and Hyde translation", () => {
    const sentence = findBookPracticeSentence(
      "dr-jekyll-and-mr-hyde:chapter-01:sentence-0032",
    );

    expect(sentence?.korean).toContain("직접 보면 끔찍한 광경");
  });

  it("keeps every word in long translations as an individual block", () => {
    const sentence = findBookPracticeSentence(
      "alice-in-wonderland:chapter-04:sentence-0132",
    );
    const tokens = createBookPracticeTokens(
      "alice-in-wonderland:chapter-04:sentence-0132",
    );

    const wordCount = sentence?.korean.trim().split(/\s+/u).length ?? 0;

    expect(wordCount).toBeGreaterThan(80);
    expect(tokens).toHaveLength(wordCount);
    expect(tokens?.every((token) => !token.text.includes(" "))).toBe(true);
    expect(tokens?.map((token) => token.text).join(" ")).toBe(sentence?.korean);
  });

  it("provides complete CLI grammar guidance for the four processed sections only", () => {
    const daddyOpening = getBookPracticeText("daddy-long-legs")?.sections.find(
      (section) => section.sectionSlug === "blue-wednesday",
    );
    const daddyLetterOne = getBookPracticeText(
      "daddy-long-legs",
    )?.sections.find((section) => section.sectionSlug === "letter-001");
    const daddyLetterTwo = getBookPracticeText(
      "daddy-long-legs",
    )?.sections.find((section) => section.sectionSlug === "letter-002");
    const daddyNextSection = getBookPracticeText(
      "daddy-long-legs",
    )?.sections.find((section) => section.sectionSlug === "letter-003");
    const chapterOne = getBookPracticeText(
      "dr-jekyll-and-mr-hyde",
    )?.sections.find((section) => section.sectionSlug === "chapter-01");
    const chapterTwo = getBookPracticeText(
      "dr-jekyll-and-mr-hyde",
    )?.sections.find((section) => section.sectionSlug === "chapter-02");

    const guidedSections = [
      daddyOpening,
      daddyLetterOne,
      daddyLetterTwo,
      chapterOne,
    ];
    expect(daddyOpening?.sentences).toHaveLength(119);
    expect(daddyLetterOne?.sentences).toHaveLength(47);
    expect(daddyLetterTwo?.sentences).toHaveLength(37);
    expect(chapterOne?.sentences).toHaveLength(120);
    for (const source of guidedSections.flatMap(
      (section) => section?.sentences ?? [],
    )) {
      const sentence = toPublicBookPracticeSentence(source);
      const guide = sentence.grammarGuide;

      expect(["claude-cli/sonnet", "codex-cli/gpt-5.6-terra"]).toContain(
        guide?.provider,
      );
      expect(guide?.steps.length).toBeGreaterThan(0);
      expect(guide?.steps.length).toBeLessThanOrEqual(7);
      const guidedTokenIds =
        guide?.steps.flatMap((step) => step.tokenIds) ?? [];
      expect(guidedTokenIds).toHaveLength(sentence.tokens.length);
      expect(new Set(guidedTokenIds)).toEqual(
        new Set(sentence.tokens.map((token) => token.id)),
      );
    }

    for (const source of [daddyLetterOne, daddyLetterTwo].flatMap(
      (section) => section?.sentences ?? [],
    )) {
      expect(toPublicBookPracticeSentence(source).grammarGuide?.provider).toBe(
        "claude-cli/sonnet",
      );
      expect(
        toPublicBookPracticeSentence(source).grammarGuide?.learningMode,
      ).toBeUndefined();
    }

    for (const source of daddyOpening?.sentences ?? []) {
      expect(
        toPublicBookPracticeSentence(source).grammarGuide?.learningMode,
      ).toBe("structure-reasoning");
    }

    for (const unprocessedSentence of [
      daddyNextSection?.sentences[0],
      chapterTwo?.sentences[0],
    ]) {
      expect(unprocessedSentence).toBeDefined();
      if (!unprocessedSentence) continue;
      expect(
        toPublicBookPracticeSentence(unprocessedSentence).grammarGuide,
      ).toBeUndefined();
    }
  });
});
