import {
  findPublicDomainBookSection,
  getPublicDomainBookSection,
  getPublicDomainBookSectionParams,
  getPublicDomainBookText,
} from "@/server/book-reader";

describe("public-domain book reader", () => {
  it("contains Daddy-Long-Legs from the opening through the final letter", () => {
    const text = getPublicDomainBookText("daddy-long-legs");

    expect(text?.sections).toHaveLength(89);
    expect(text?.totalWords).toBeGreaterThan(37_000);
    expect(text?.sections[0]?.paragraphs[0]).toMatch(
      /^The first Wednesday in every month/u,
    );
    expect(text?.sections.at(-1)?.paragraphs.at(-1)).toContain(
      "first love-letter I ever wrote",
    );
  });

  it("contains the Oz introduction and all 24 chapters", () => {
    const text = getPublicDomainBookText("the-wonderful-wizard-of-oz");

    expect(text?.sections).toHaveLength(25);
    expect(text?.totalWords).toBeGreaterThan(39_000);
    expect(text?.sections[1]?.englishTitle).toBe("The Cyclone");
    expect(text?.sections.at(-1)?.englishTitle).toBe("Home Again");
    expect(text?.sections.at(-1)?.paragraphs.at(-1)).toContain(
      "glad to be at home again",
    );
  });

  it("contains all 12 Alice chapters from the opening to the ending", () => {
    const text = getPublicDomainBookText("alice-in-wonderland");

    expect(text?.sections).toHaveLength(12);
    expect(text?.totalWords).toBeGreaterThan(26_000);
    expect(text?.sections[0]?.englishTitle).toBe("Down the Rabbit-Hole");
    expect(text?.sections[0]?.paragraphs[0]).toMatch(
      /^Alice was beginning to get very tired/u,
    );
    expect(text?.sections.at(-1)?.englishTitle).toBe("Alice’s Evidence");
    expect(text?.sections.at(-1)?.paragraphs.at(-1)).toContain(
      "the happy summer days",
    );
  });

  it("contains all 10 Jekyll and Hyde chapters", () => {
    const text = getPublicDomainBookText("dr-jekyll-and-mr-hyde");

    expect(text?.sections).toHaveLength(10);
    expect(text?.totalWords).toBeGreaterThan(25_000);
    expect(text?.sections[0]?.englishTitle).toBe("Story of the Door");
    expect(text?.sections[0]?.paragraphs[0]).toMatch(
      /^Mr\. Utterson the lawyer was a man/u,
    );
    expect(text?.sections.at(-1)?.englishTitle).toBe(
      "Henry Jekyll’s Full Statement of the Case",
    );
    expect(text?.sections.at(-1)?.paragraphs.at(-1)).toContain(
      "the life of that unhappy Henry Jekyll to an end",
    );
  });

  it("does not expose Project Gutenberg boilerplate as story text", () => {
    const params = getPublicDomainBookSectionParams();

    expect(params).toHaveLength(136);
    for (const { bookSlug, sectionSlug } of params) {
      const view = getPublicDomainBookSection(bookSlug, sectionSlug);
      expect(view).not.toBeNull();
      expect(view?.section.paragraphs.join(" ")).not.toContain(
        "PROJECT GUTENBERG EBOOK",
      );
    }
  });

  it("finds a section by its globally unique id", () => {
    const view = findPublicDomainBookSection(
      "the-wonderful-wizard-of-oz:chapter-24",
    );

    expect(view?.position).toBe(25);
    expect(view?.nextSectionSlug).toBeNull();
    expect(view?.previousSectionSlug).toBe("chapter-23");
  });
});
