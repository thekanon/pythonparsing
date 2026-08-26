import {
  fisherYates,
  gradeTokenOrder,
  seededRandom,
  tokenizeKorean,
} from "./tokenize";

describe("Korean tokenization", () => {
  it("normalizes NFC and whitespace while preserving duplicate words as separate tokens", () => {
    const tokens = tokenizeKorean(
      "  가\u1100\u1161   나 나  ",
      (position) => `token-${position}`,
    );
    expect(tokens).toEqual([
      { id: "token-0", position: 0, text: "가가" },
      { id: "token-1", position: 1, text: "나" },
      { id: "token-2", position: 2, text: "나" },
    ]);
  });

  it("returns no tokens for whitespace-only input", () => {
    expect(tokenizeKorean(" \n ")).toEqual([]);
  });
});

describe("Fisher-Yates shuffle", () => {
  it("does not mutate the input and produces a deterministic seeded permutation", () => {
    const input = [1, 2, 3, 4, 5];
    const first = fisherYates(input, seededRandom("lesson:title"));
    const second = fisherYates(input, seededRandom("lesson:title"));
    expect(first).toEqual(second);
    expect(first.toSorted()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("exact token-order grading", () => {
  const canonical = [
    { id: "same-a", position: 0, text: "같은" },
    { id: "same-b", position: 1, text: "같은" },
    { id: "ending", position: 2, text: "말" },
  ];

  it("accepts swapped IDs when duplicate token text remains in the exact sentence order", () => {
    expect(gradeTokenOrder(canonical, ["same-b", "same-a", "ending"])).toEqual({
      complete: true,
      incorrectPositions: [],
      score: 100,
    });
  });

  it("reports exact incorrect positions and score", () => {
    expect(gradeTokenOrder(canonical, ["ending", "same-a", "same-b"])).toEqual({
      complete: false,
      incorrectPositions: [0, 2],
      score: 33,
    });
  });

  it("rejects missing, repeated, or foreign IDs", () => {
    expect(() =>
      gradeTokenOrder(canonical, ["same-a", "same-a", "ending"]),
    ).toThrow(/exactly once/u);
    expect(() =>
      gradeTokenOrder(canonical, ["same-a", "same-b", "foreign"]),
    ).toThrow(/exactly once/u);
  });
});
