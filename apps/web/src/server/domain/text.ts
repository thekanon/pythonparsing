import { decodeHTML } from "entities";

const HTML_TAG_PATTERN = /<[^>]*>/g;
const SENTENCE_END_PATTERN = /[.!?](?:["'”’)]*)/gu;

export function normalizeWhitespace(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function normalizeRssText(value: string): string {
  return normalizeWhitespace(decodeHTML(value.replace(HTML_TAG_PATTERN, " ")));
}

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

function sliceUnicode(value: string, end: number): string {
  return Array.from(value).slice(0, end).join("");
}

export function extractExcerpt(value: string, maxCharacters = 200): string {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 2) {
    throw new Error("maxCharacters must be an integer greater than one.");
  }

  const normalized = normalizeRssText(value);
  if (unicodeLength(normalized) <= maxCharacters) return normalized;

  const window = sliceUnicode(normalized, maxCharacters);
  let completeSentenceEnd = -1;
  for (const match of window.matchAll(SENTENCE_END_PATTERN)) {
    completeSentenceEnd = (match.index ?? 0) + match[0].length;
  }

  if (completeSentenceEnd > 0) {
    return window.slice(0, completeSentenceEnd).trim();
  }

  const withoutEllipsis = sliceUnicode(normalized, maxCharacters - 1);
  const lastWhitespace = withoutEllipsis.search(/\s+\S*$/u);
  const boundaryCut =
    lastWhitespace > 0
      ? withoutEllipsis.slice(0, lastWhitespace)
      : withoutEllipsis;
  return `${boundaryCut.trimEnd()}…`;
}
