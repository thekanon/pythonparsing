"use client";

import { ArrowClockwise } from "@phosphor-icons/react";

export default function RedditLearningError({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell">
      <div className="surface-card p-8 sm:p-12" role="alert">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">
          Reddit 영어 학습을 불러오지 못했습니다.
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-[var(--ink-soft)]">
          저장된 학습 자료를 읽는 중 문제가 생겼습니다. 잠시 뒤 다시 시도해
          주세요.
        </p>
        <button
          type="button"
          className="button button-secondary mt-6"
          onClick={reset}
        >
          <ArrowClockwise aria-hidden="true" size={18} weight="bold" />
          다시 시도
        </button>
      </div>
    </div>
  );
}
