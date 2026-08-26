import { extractExcerpt, normalizeRssText, unicodeLength } from "./text";

describe("RSS text normalization", () => {
  it("removes markup, decodes entities, collapses whitespace, and normalizes NFC", () => {
    expect(normalizeRssText("<p>Caf&eacute;   A\u0301</p>")).toBe("Café Á");
  });

  it("counts Unicode code points instead of UTF-16 code units", () => {
    expect(unicodeLength("가😀나")).toBe(3);
  });
});

describe("extractExcerpt", () => {
  it("keeps only complete sentences when a complete sentence fits", () => {
    const source =
      "A short sentence. A much longer second sentence that will not fit.";
    expect(extractExcerpt(source, 30)).toBe("A short sentence.");
  });

  it("falls back to a word boundary and includes an ellipsis within the limit", () => {
    const excerpt = extractExcerpt("one two three four five six", 18);
    expect(excerpt).toBe("one two three…");
    expect(unicodeLength(excerpt)).toBeLessThanOrEqual(18);
  });

  it("hard-cuts a single long word without exceeding the Unicode limit", () => {
    const excerpt = extractExcerpt("abcdefghijk", 6);
    expect(excerpt).toBe("abcde…");
    expect(unicodeLength(excerpt)).toBe(6);
  });
});
