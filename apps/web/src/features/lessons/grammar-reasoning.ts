import type { PublicGrammarGuideStep } from "@/features/lessons/types";

function words(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []
  );
}

export type EnglishStepSpan = { start: number; end: number };

function phraseSpan(sentenceWords: string[], phrase: string): EnglishStepSpan {
  const phraseWords = words(phrase);
  if (phraseWords.length === 0) {
    return {
      start: Number.POSITIVE_INFINITY,
      end: Number.POSITIVE_INFINITY,
    };
  }
  const matchedPositions: number[] = [];
  let cursor = 0;

  for (const word of phraseWords) {
    const offset = sentenceWords.slice(cursor).indexOf(word);
    if (offset < 0) break;
    const position = cursor + offset;
    matchedPositions.push(position);
    cursor = position + 1;
  }

  if (matchedPositions.length > 0) {
    return {
      start: matchedPositions[0]!,
      end: matchedPositions.at(-1)!,
    };
  }
  const firstWord = sentenceWords.indexOf(phraseWords[0]!);
  if (firstWord >= 0) return { start: firstWord, end: firstWord };
  return {
    start: Number.POSITIVE_INFINITY,
    end: Number.POSITIVE_INFINITY,
  };
}

export function getEnglishStepSpans(
  english: string,
  steps: readonly Pick<PublicGrammarGuideStep, "englishPhrase">[],
) {
  const sentenceWords = words(english);
  return steps.map((step) => phraseSpan(sentenceWords, step.englishPhrase));
}

export function getEnglishStepOrder(
  english: string,
  steps: readonly Pick<PublicGrammarGuideStep, "englishPhrase">[],
) {
  const spans = getEnglishStepSpans(english, steps);
  return steps
    .map((_, index) => ({
      index,
      ...spans[index]!,
    }))
    .sort(
      (left, right) =>
        left.start - right.start ||
        right.end - left.end ||
        left.index - right.index,
    )
    .map(({ index }) => index);
}

export function grammarQuestionForRole(role: string) {
  if (/호칭|호격/u.test(role)) return "누구를 부르고 있나요?";
  if (/주어|행위자|주제/u.test(role)) return "누가 또는 무엇이 중심인가요?";
  if (/목적|대상|인용|내용/u.test(role)) return "무엇을 또는 누구를 말하나요?";
  if (/보어|상태|평가/u.test(role)) return "주어나 목적어를 어떻게 설명하나요?";
  if (/관계|수식|분사|형용사/u.test(role))
    return "어떤 대상을 더 자세히 설명하나요?";
  if (/시간|조건|이유|양보/u.test(role))
    return "언제 또는 어떤 조건에서 일어나나요?";
  if (/부사|전치사|장소|방식|출처/u.test(role)) {
    return "언제, 어디서, 어떻게를 덧붙이나요?";
  }
  if (/접속|대조|추가/u.test(role)) return "앞뒤 내용을 어떻게 연결하나요?";
  if (/동사|술어|서술|행동/u.test(role))
    return "무엇을 하거나 어떤 상태인가요?";
  if (/절/u.test(role)) return "이 절이 전달하는 중심 내용은 무엇인가요?";
  return "이 어구는 문장에서 어떤 역할을 하나요?";
}

export function grammarRuleForRole(role: string) {
  if (/호칭|호격/u.test(role)) {
    return "부르는 말은 문장 뼈대와 분리해 앞이나 뒤에 자연스럽게 붙입니다.";
  }
  if (/주어|행위자|주제/u.test(role)) {
    return "주어를 먼저 찾으면 누가 행동하고 무엇이 설명되는지 문장 뼈대가 보입니다.";
  }
  if (/목적|대상|인용|내용/u.test(role)) {
    return "영어는 동사 뒤에 대상을 두지만, 한국어는 보통 그 대상을 서술어 앞에 둡니다.";
  }
  if (/보어|상태|평가/u.test(role)) {
    return "보어는 주어나 목적어의 정체·상태를 설명하며 한국어 서술부와 함께 문장을 마무리합니다.";
  }
  if (/관계|수식|분사|형용사/u.test(role)) {
    return "영어의 뒤쪽 수식어도 한국어에서는 꾸미는 명사 앞쪽으로 옮기는 경우가 많습니다.";
  }
  if (/시간|조건|이유|양보/u.test(role)) {
    return "상황을 먼저 알면 중심 사건을 이해하기 쉬워 한국어에서는 주절 앞에 놓는 경우가 많습니다.";
  }
  if (/부사|전치사|장소|방식|출처/u.test(role)) {
    return "부가 정보는 자신이 꾸미는 동작 가까이에 두어 언제·어디서·어떻게를 분명히 합니다.";
  }
  if (/접속|대조|추가/u.test(role)) {
    return "연결 표현은 두 생각의 관계를 먼저 알려 주므로 이어지는 내용의 방향을 결정합니다.";
  }
  if (/동사|술어|서술|행동/u.test(role)) {
    return "영어는 중심 동사를 일찍 말하지만 한국어는 목적어와 보충 설명 뒤에 서술어를 두는 경우가 많습니다.";
  }
  if (/절/u.test(role)) {
    return "절 안에서도 주어와 동사의 관계를 먼저 찾고, 한국어에 맞게 보충 내용을 서술어 앞에 둡니다.";
  }
  return "이 어구가 꾸미거나 설명하는 말 가까이에 놓으면 문장의 의미 관계가 선명해집니다.";
}

export function grammarOrderMovement(
  koreanPosition: number,
  englishOrder: readonly number[],
  spans?: readonly EnglishStepSpan[],
) {
  const span = spans?.[koreanPosition];
  if (
    span &&
    Number.isFinite(span.start) &&
    spans?.some(
      (candidate, index) =>
        index !== koreanPosition &&
        Number.isFinite(candidate.start) &&
        ((candidate.start <= span.start && candidate.end >= span.end) ||
          (span.start <= candidate.start && span.end >= candidate.end)),
    )
  ) {
    return "포함 관계";
  }
  const englishPosition = englishOrder.indexOf(koreanPosition);
  if (englishPosition < 0 || englishPosition === koreanPosition) {
    return "자리 유지";
  }
  return englishPosition > koreanPosition ? "앞으로 이동" : "뒤로 이동";
}
