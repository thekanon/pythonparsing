"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Lightbulb,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  getEnglishStepOrder,
  getEnglishStepSpans,
  grammarOrderMovement,
  grammarQuestionForRole,
  grammarRuleForRole,
} from "@/features/lessons/grammar-reasoning";
import type { PublicGrammarGuide, PublicToken } from "@/features/lessons/types";

function movementClass(movement: string) {
  if (movement === "자리 유지") {
    return "border-[var(--line)] text-[var(--ink-soft)]";
  }
  return "border-[var(--accent)] text-[var(--accent)]";
}

export function StructureReasoningGuide({
  english,
  guide,
  tokenMap,
  onHelp,
  onHighlightStep,
  onCompleteChange,
}: {
  english: string;
  guide: PublicGrammarGuide;
  tokenMap: ReadonlyMap<string, PublicToken>;
  onHelp: () => void;
  onHighlightStep?: (index: number) => void;
  onCompleteChange?: (complete: boolean) => void;
}) {
  const englishOrder = useMemo(
    () => getEnglishStepOrder(english, guide.steps),
    [english, guide.steps],
  );
  const englishSpans = useMemo(
    () => getEnglishStepSpans(english, guide.steps),
    [english, guide.steps],
  );
  const cardOrder = useMemo(
    () =>
      englishOrder.length > 1 ? [...englishOrder].reverse() : englishOrder,
    [englishOrder],
  );
  const [placements, setPlacements] = useState<Array<number | null>>(() =>
    guide.steps.map(() => null),
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(
    "아래 영어 어구를 선택한 뒤 알맞은 문장 성분 자리를 누르세요.",
  );
  const [structureComplete, setStructureComplete] = useState(false);
  const [reasonStepIndex, setReasonStepIndex] = useState(0);
  const placedSteps = new Set(
    placements.filter((value): value is number => value !== null),
  );
  const reasonStep = guide.steps[reasonStepIndex]!;
  const movements = guide.steps.map((_, index) =>
    grammarOrderMovement(index, englishOrder, englishSpans),
  );
  const hasNestedStructure = movements.includes("포함 관계");

  function roleLabel(stepIndex: number) {
    const role = guide.steps[stepIndex]!.role;
    const matchingSteps = englishOrder.filter(
      (candidate) => guide.steps[candidate]!.role === role,
    );
    if (matchingSteps.length < 2) return role;
    return `${role} ${matchingSteps.indexOf(stepIndex) + 1}`;
  }

  function koreanChunk(stepIndex: number) {
    return guide.steps[stepIndex]!.tokenIds.map(
      (tokenId) => tokenMap.get(tokenId)?.text,
    )
      .filter(Boolean)
      .join(" ");
  }

  function placeSelected(slotPosition: number) {
    const currentPlacement = placements[slotPosition];
    if (currentPlacement != null) {
      const returnedStep = guide.steps[currentPlacement]!;
      setPlacements((current) =>
        current.map((value, index) => (index === slotPosition ? null : value)),
      );
      setStructureComplete(false);
      onCompleteChange?.(false);
      setFeedback(`“${returnedStep.englishPhrase}”을 후보로 돌려보냈습니다.`);
      return;
    }
    if (selectedStep === null) {
      setFeedback("먼저 아래에서 영어 어구 하나를 선택하세요.");
      return;
    }

    const targetStep = englishOrder[slotPosition]!;
    const selected = guide.steps[selectedStep]!;
    const target = guide.steps[targetStep]!;
    if (selectedStep !== targetStep) {
      setFeedback(
        `“${selected.englishPhrase}”는 ${selected.role} 역할입니다. ${grammarRuleForRole(selected.role)}`,
      );
      return;
    }

    const next = placements.map((value, index) =>
      index === slotPosition ? selectedStep : value,
    );
    const complete = next.every((value) => value !== null);
    setPlacements(next);
    setSelectedStep(null);
    setStructureComplete(complete);
    onCompleteChange?.(complete);
    setFeedback(
      complete
        ? "문장 성분을 모두 찾았습니다. 이제 영어와 한국어의 어순 차이를 확인하세요."
        : `맞아요. ${roleLabel(targetStep)} 자리를 찾았습니다. ${grammarRuleForRole(target.role)}`,
    );
  }

  function revealStructure() {
    setPlacements([...englishOrder]);
    setSelectedStep(null);
    setStructureComplete(true);
    onCompleteChange?.(true);
    setFeedback(
      "정답 구조를 표시했습니다. 각 성분이 왜 그 자리에 있는지 아래에서 확인하세요.",
    );
    onHelp();
  }

  function selectReasonStep(index: number) {
    setReasonStepIndex(Math.min(guide.steps.length - 1, Math.max(0, index)));
  }

  return (
    <div className="grid gap-6">
      <section aria-labelledby="structure-puzzle-title">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--accent)]">
              1 · 문장 뼈대 찾기
            </p>
            <h3 id="structure-puzzle-title" className="font-bold">
              영어 어구를 알맞은 문장 성분에 넣어보세요
            </h3>
          </div>
          <p className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-bold">
            {placedSteps.size}/{guide.steps.length}개 찾음
          </p>
        </div>

        <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-[minmax(30rem,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <div className="grid min-w-0 gap-3 lg:sticky lg:top-20">
            <div>
              <p
                id="structure-candidate-title"
                className="text-xs font-bold text-[var(--ink-soft)]"
              >
                먼저 고를 영어 어구
              </p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="group"
                aria-labelledby="structure-candidate-title"
              >
                {cardOrder
                  .filter((stepIndex) => !placedSteps.has(stepIndex))
                  .map((stepIndex) => {
                    const step = guide.steps[stepIndex]!;
                    const selected = selectedStep === stepIndex;
                    return (
                      <button
                        key={`${step.englishPhrase}:${stepIndex}`}
                        type="button"
                        className={`min-h-11 max-w-full rounded-[0.7rem] border px-3 py-2 text-left font-serif text-sm font-bold break-words whitespace-normal transition-colors ${
                          selected
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                            : "border-[var(--line-strong)] bg-[var(--surface-raised)] hover:border-[var(--accent)]"
                        }`}
                        aria-pressed={selected}
                        aria-label={`${step.englishPhrase} 어구 선택`}
                        onClick={() => {
                          setSelectedStep(selected ? null : stepIndex);
                          setFeedback(
                            selected
                              ? "어구 선택을 해제했습니다."
                              : `“${step.englishPhrase}”를 선택했습니다. 알맞은 역할 자리를 누르세요.`,
                          );
                        }}
                      >
                        {step.englishPhrase}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div
              className="rounded-[0.7rem] border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-sm leading-5 text-[var(--ink-soft)]"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {feedback}
            </div>

            {!structureComplete && (
              <button
                type="button"
                className="button button-quiet w-fit text-sm"
                onClick={revealStructure}
              >
                <Eye aria-hidden="true" size={17} weight="bold" />
                정답 구조 보기
              </button>
            )}
          </div>

          <ol
            className="grid min-w-0 gap-2 lg:grid-cols-2"
            aria-label="문장 성분 자리"
          >
            {englishOrder.map((stepIndex, slotPosition) => {
              const step = guide.steps[stepIndex]!;
              const placedStep = placements[slotPosition];
              return (
                <li className="min-w-0" key={`${step.role}:${stepIndex}`}>
                  <button
                    type="button"
                    className={`grid h-full min-h-[4.5rem] w-full content-start gap-1.5 rounded-[0.8rem] border p-2.5 text-left transition-colors ${
                      placedStep == null
                        ? "border-dashed border-[var(--line-strong)] bg-[var(--surface)] hover:border-[var(--accent)]"
                        : "border-[var(--accent)] bg-[var(--surface-raised)]"
                    }`}
                    onClick={() => placeSelected(slotPosition)}
                    aria-label={`${roleLabel(stepIndex)} 자리. ${
                      placedStep == null
                        ? "비어 있음"
                        : `${guide.steps[placedStep]!.englishPhrase} 배치됨. 누르면 후보로 돌아감`
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-bold text-[var(--accent)]">
                        {roleLabel(stepIndex)}
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-[var(--ink-soft)]">
                        {grammarQuestionForRole(step.role)}
                      </span>
                    </span>
                    <span className="font-serif text-sm leading-snug font-bold [overflow-wrap:anywhere] break-words">
                      {placedStep == null
                        ? "여기에 알맞은 어구 놓기"
                        : guide.steps[placedStep]!.englishPhrase}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {structureComplete && (
        <>
          <section
            className="border-t border-[var(--line)] pt-5"
            aria-labelledby="order-comparison-title"
          >
            <p className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--accent)]">
              2 · 어순 바꾸기
            </p>
            <h3 id="order-comparison-title" className="mt-1 font-bold">
              영어가 말한 순서와 한국어로 이해하는 순서를 비교하세요
            </h3>

            <div className="mt-4 grid gap-3">
              <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="text-xs font-bold text-[var(--ink-soft)]">
                  영어가 말하는 순서
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {englishOrder.map((stepIndex, index) => (
                    <span
                      key={`english:${stepIndex}`}
                      className="inline-flex items-center gap-2"
                    >
                      {index > 0 && (
                        <ArrowRight
                          aria-hidden="true"
                          size={15}
                          className="text-[var(--ink-soft)]"
                        />
                      )}
                      <span className="rounded-[0.7rem] border border-[var(--line)] bg-[var(--surface-raised)] px-2.5 py-2 font-serif text-sm font-bold">
                        {guide.steps[stepIndex]!.englishPhrase}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="text-xs font-bold text-[var(--ink-soft)]">
                  영어 순서를 그대로 따라간 한국어 덩어리
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {englishOrder.map((stepIndex, index) => (
                    <span
                      key={`literal:${stepIndex}`}
                      className="inline-flex items-center gap-2"
                    >
                      {index > 0 && (
                        <ArrowRight
                          aria-hidden="true"
                          size={15}
                          className="text-[var(--ink-soft)]"
                        />
                      )}
                      <span className="rounded-[0.7rem] border border-[var(--line)] bg-[var(--surface-raised)] px-2.5 py-2 text-sm font-bold">
                        {koreanChunk(stepIndex)}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
                  영어를 이 순서 그대로 옮기면 한국어가 어색해질 수 있습니다.
                </p>
              </div>

              <div className="rounded-[0.9rem] border border-[var(--accent)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs font-bold text-[var(--accent)]">
                  자연스러운 한국어 순서
                </p>
                <div className="mt-2 grid gap-2">
                  {guide.steps.map((step, index) => {
                    const movement = movements[index]!;
                    return (
                      <button
                        key={`korean:${step.role}:${index}`}
                        type="button"
                        className="grid gap-1 rounded-[0.75rem] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-left sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:gap-3"
                        onClick={() => {
                          selectReasonStep(index);
                          onHighlightStep?.(index);
                        }}
                      >
                        <span className="text-xs font-bold text-[var(--ink-soft)]">
                          {index + 1}. {step.role}
                        </span>
                        <span className="text-sm font-bold">
                          {koreanChunk(index)}
                        </span>
                        <span
                          className={`w-fit rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${movementClass(movement)}`}
                        >
                          {movement}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {hasNestedStructure && (
              <p className="mt-3 text-xs leading-5 text-[var(--ink-soft)]">
                `포함 관계`는 큰 절 안에 주어·동사·수식어 같은 작은 성분이 들어
                있다는 뜻입니다. 앞뒤 이동과는 다른 문장 안의 계층 구조입니다.
              </p>
            )}
          </section>

          <section
            className="border-t border-[var(--line)] pt-5"
            aria-labelledby="order-reason-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--accent)]">
                  3 · 이유 이해하기
                </p>
                <h3 id="order-reason-title" className="mt-1 font-bold">
                  왜 이 순서인가요?
                </h3>
              </div>
              <p className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-bold">
                {reasonStepIndex + 1}/{guide.steps.length}
              </p>
            </div>

            <div className="mt-4 border-l-4 border-[var(--accent)] pl-4">
              <p className="text-xs font-bold text-[var(--ink-soft)]">
                먼저 찾을 것
              </p>
              <p className="mt-1 font-bold">
                {grammarQuestionForRole(reasonStep.role)}
              </p>
              <p className="mt-3 font-serif text-lg font-bold">
                {reasonStep.englishPhrase}
              </p>
              <p className="mt-3 text-sm font-bold">기본 원리</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                {grammarRuleForRole(reasonStep.role)}
              </p>
              <p className="mt-3 text-sm font-bold">이 문장에서는</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                {reasonStep.instruction}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                역할: {reasonStep.koreanFunction}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {onHighlightStep && (
                <button
                  type="button"
                  className="button button-secondary text-sm"
                  onClick={() => onHighlightStep(reasonStepIndex)}
                >
                  <Lightbulb aria-hidden="true" size={17} weight="bold" />
                  한국어 블록 표시
                </button>
              )}
              <button
                type="button"
                className="button button-quiet text-sm"
                disabled={reasonStepIndex === 0}
                onClick={() => selectReasonStep(reasonStepIndex - 1)}
              >
                <ArrowLeft aria-hidden="true" size={16} weight="bold" />
                이전 이유
              </button>
              <button
                type="button"
                className="button button-quiet text-sm"
                disabled={reasonStepIndex === guide.steps.length - 1}
                onClick={() => selectReasonStep(reasonStepIndex + 1)}
              >
                다음 이유
                <ArrowRight aria-hidden="true" size={16} weight="bold" />
              </button>
            </div>

            {guide.grammarPoints.length > 0 && (
              <details className="mt-5 rounded-[0.8rem] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
                <summary className="cursor-pointer font-bold">
                  문법 이름도 확인하기
                </summary>
                <dl className="mt-3 grid gap-3">
                  {guide.grammarPoints.map((point) => (
                    <div key={point.expression}>
                      <dt className="font-mono font-bold">
                        {point.expression}
                      </dt>
                      <dd className="mt-1 leading-6 text-[var(--ink-soft)]">
                        {point.explanation}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </section>

          <div className="flex items-center gap-2 rounded-[0.8rem] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
            <CheckCircle
              aria-hidden="true"
              size={20}
              weight="fill"
              className="shrink-0 text-[var(--accent)]"
            />
            구조를 이해했다면 다음 단계에서 한국어 어절을 직접 배열해 보세요.
          </div>
        </>
      )}
    </div>
  );
}
