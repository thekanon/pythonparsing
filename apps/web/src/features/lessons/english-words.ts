const ENGLISH_WORD_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;
const SINGLE_ENGLISH_WORD_PATTERN = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;

export function normalizeEnglishWord(value: string): string | null {
  const normalized = value.normalize("NFKC").trim().replaceAll("’", "'");
  return SINGLE_ENGLISH_WORD_PATTERN.test(normalized)
    ? normalized.toLowerCase()
    : null;
}

export function extractEnglishWords(value: string): string[] {
  return (value.match(ENGLISH_WORD_PATTERN) ?? []).flatMap((word) => {
    const normalized = normalizeEnglishWord(word);
    return normalized ? [normalized] : [];
  });
}

export function splitEnglishText(value: string): string[] {
  return value.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).filter(Boolean);
}
