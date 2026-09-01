import {
  extractEnglishWords,
  normalizeEnglishWord,
  splitEnglishText,
} from "./english-words";

describe("English word helpers", () => {
  it("normalizes supported words without accepting arbitrary text", () => {
    expect(normalizeEnglishWord("Coastal")).toBe("coastal");
    expect(normalizeEnglishWord("low-cost")).toBe("low-cost");
    expect(normalizeEnglishWord("two words")).toBeNull();
  });

  it("extracts and splits words while preserving sentence punctuation", () => {
    expect(extractEnglishWords("New low-cost sensors.")).toEqual([
      "new",
      "low-cost",
      "sensors",
    ]);
    expect(splitEnglishText("New sensors.").join("")).toBe("New sensors.");
  });
});
