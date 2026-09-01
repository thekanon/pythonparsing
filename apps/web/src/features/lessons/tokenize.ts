import type { CanonicalToken, GradeResult } from "./types";

export type RandomSource = () => number;
export type TokenIdFactory = (position: number, text: string) => string;

export function normalizeKoreanAnswer(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function tokenizeKorean(
  value: string,
  createId: TokenIdFactory = () => crypto.randomUUID(),
): CanonicalToken[] {
  const normalized = normalizeKoreanAnswer(value);
  if (!normalized) return [];

  return normalized.split(" ").map((text, position) => ({
    id: createId(position, text),
    position,
    text,
  }));
}

export function fisherYates<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex]!,
      shuffled[index]!,
    ];
  }

  return shuffled;
}

export function seededRandom(seedValue: string): RandomSource {
  let seed = 2166136261;
  for (const character of seedValue) {
    seed ^= character.codePointAt(0) ?? 0;
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let result = seed;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function gradeTokenOrder(
  canonicalTokens: readonly CanonicalToken[],
  submittedTokenIds: readonly string[],
): GradeResult {
  const expectedIds = new Set(canonicalTokens.map((token) => token.id));
  const uniqueSubmittedIds = new Set(submittedTokenIds);

  if (
    submittedTokenIds.length !== canonicalTokens.length ||
    uniqueSubmittedIds.size !== submittedTokenIds.length ||
    submittedTokenIds.some((id) => !expectedIds.has(id))
  ) {
    throw new Error(
      "Submitted tokens must contain each lesson token exactly once.",
    );
  }

  const tokenById = new Map(
    canonicalTokens.map((token) => [token.id, token.text]),
  );
  const expectedText = canonicalTokens
    .toSorted((left, right) => left.position - right.position)
    .map((token) => token.text);
  const submittedText = submittedTokenIds.map((id) => tokenById.get(id)!);
  const incorrectPositions: number[] = [];

  expectedText.forEach((text, position) => {
    if (submittedText[position] !== text) incorrectPositions.push(position);
  });

  const matches = expectedText.length - incorrectPositions.length;
  const score =
    expectedText.length === 0
      ? 0
      : Math.round((matches / expectedText.length) * 100);

  return {
    complete: incorrectPositions.length === 0,
    incorrectPositions,
    score,
  };
}

export function createTokenOrderHint(
  canonicalTokens: readonly CanonicalToken[],
  submittedTokenIds: readonly string[],
  incorrectPositions: readonly number[],
) {
  const position = incorrectPositions[0];
  if (position === undefined) return null;
  const orderedTokens = canonicalTokens.toSorted(
    (left, right) => left.position - right.position,
  );
  const expectedText = orderedTokens[position]?.text;
  if (!expectedText) return null;
  const incorrectSet = new Set(incorrectPositions);
  const token =
    orderedTokens.find(
      (candidate) =>
        candidate.text === expectedText &&
        incorrectSet.has(submittedTokenIds.indexOf(candidate.id)),
    ) ?? orderedTokens[position];
  return token ? { position, tokenId: token.id } : null;
}
