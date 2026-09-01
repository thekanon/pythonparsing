import {
  getEnglishStepOrder,
  getEnglishStepSpans,
  grammarOrderMovement,
  grammarQuestionForRole,
  grammarRuleForRole,
} from "@/features/lessons/grammar-reasoning";
import type { PublicGrammarGuideStep } from "@/features/lessons/types";

const steps: PublicGrammarGuideStep[] = [
  {
    role: "전치사 목적어",
    englishPhrase: "of anybody being asylum-sick",
    koreanFunction: "들은 내용",
    instruction: "들은 내용을 서술어 앞에 둡니다.",
    tokenIds: ["content"],
  },
  {
    role: "주어+동사",
    englishPhrase: "I never heard",
    koreanFunction: "중심 서술",
    instruction: "한국어 서술어를 뒤에 둡니다.",
    tokenIds: ["predicate"],
  },
  {
    role: "꼬리질문",
    englishPhrase: "did you",
    koreanFunction: "상대방에게 되묻기",
    instruction: "앞 문장 뒤에 덧붙입니다.",
    tokenIds: ["tag"],
  },
];

describe("grammar reasoning", () => {
  it("distinguishes English source order from natural Korean order", () => {
    const englishOrder = getEnglishStepOrder(
      "I never heard of anybody being asylum-sick, did you?",
      steps,
    );

    expect(englishOrder).toEqual([1, 0, 2]);
    expect(grammarOrderMovement(0, englishOrder)).toBe("앞으로 이동");
    expect(grammarOrderMovement(1, englishOrder)).toBe("뒤로 이동");
    expect(grammarOrderMovement(2, englishOrder)).toBe("자리 유지");
  });

  it("explains roles with learner questions and plain Korean rules", () => {
    expect(grammarQuestionForRole("관계절")).toContain("대상");
    expect(grammarRuleForRole("관계절")).toContain("명사 앞");
    expect(grammarQuestionForRole("목적어")).toContain("무엇");
    expect(grammarRuleForRole("목적어")).toContain("서술어 앞");
  });

  it("marks a smaller component nested inside a larger clause", () => {
    const nestedSteps = [
      { englishPhrase: "She" },
      { englishPhrase: "She pictured" },
      { englishPhrase: "herself" },
    ];
    const english = "She pictured herself in a fur coat.";
    const order = getEnglishStepOrder(english, nestedSteps);
    const spans = getEnglishStepSpans(english, nestedSteps);

    expect(order).toEqual([1, 0, 2]);
    expect(grammarOrderMovement(0, order, spans)).toBe("포함 관계");
    expect(grammarOrderMovement(1, order, spans)).toBe("포함 관계");
  });
});
