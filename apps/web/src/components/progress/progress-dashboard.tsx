"use client";

import { CheckCircle, ClockCounterClockwise } from "@phosphor-icons/react";
import Link from "next/link";

import { shiftIsoDate, toKstDateString } from "@/server/domain/date";
import { useAnonymousProgress } from "@/features/progress/use-anonymous-progress";

function completedDate(value: string) {
  return toKstDateString(new Date(value));
}

export function ProgressDashboard() {
  const progress = useAnonymousProgress();
  const stages = Object.values(progress.stages);
  const completed = stages.filter((stage) => stage.completedAt !== null);
  const today = toKstDateString();
  const completedDates = completed.map((stage) =>
    completedDate(stage.completedAt!),
  );
  const uniqueDates = new Set(completedDates);
  let streak = 0;
  while (uniqueDates.has(shiftIsoDate(today, -streak))) streak += 1;

  const sevenDays = Array.from({ length: 7 }, (_, index) =>
    shiftIsoDate(today, index - 6),
  );
  const thirtyDays = Array.from({ length: 30 }, (_, index) =>
    shiftIsoDate(today, index - 29),
  );
  const sevenDaySet = new Set(sevenDays);
  const thirtyDaySet = new Set(thirtyDays);
  const lastSeven = completedDates.filter((date) =>
    sevenDaySet.has(date),
  ).length;
  const lastThirty = completedDates.filter((date) =>
    thirtyDaySet.has(date),
  ).length;
  const bestScore = stages.reduce(
    (best, stage) => Math.max(best, stage.bestScore),
    0,
  );
  const helped = completed.filter((stage) => stage.helped).length;

  if (stages.length === 0) {
    return (
      <div className="surface-card grid min-h-80 place-items-center p-8 text-center sm:p-12">
        <div className="max-w-md">
          <ClockCounterClockwise
            aria-hidden="true"
            size={38}
            weight="duotone"
            className="mx-auto text-[var(--accent)]"
          />
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
            아직 기록된 학습이 없습니다.
          </h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            첫 문장을 완성하면 완료 수, 최근 학습량, 최고 점수가 이곳에
            표시됩니다.
          </p>
          <Link href="/today" className="button button-primary mt-6">
            첫 학습 시작
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
      <section
        className="surface-card row-span-2 p-6 sm:p-8"
        aria-labelledby="completed-heading"
      >
        <CheckCircle
          aria-hidden="true"
          size={34}
          weight="duotone"
          className="text-[var(--accent)]"
        />
        <h2
          id="completed-heading"
          className="mt-6 text-sm font-bold text-[var(--ink-soft)]"
        >
          완료한 단계
        </h2>
        <p className="mt-2 font-mono text-6xl font-bold tracking-[-0.07em] sm:text-7xl">
          {completed.length}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-6">
          <div>
            <p className="text-sm text-[var(--ink-soft)]">현재 연속 학습일</p>
            <p className="mt-2 font-mono text-3xl font-bold">{streak}일</p>
          </div>
          <div>
            <p className="text-sm text-[var(--ink-soft)]">최고 위치 점수</p>
            <p className="mt-2 font-mono text-3xl font-bold">{bestScore}점</p>
          </div>
        </div>
      </section>

      <section
        className="surface-card bg-[var(--surface-muted)] p-6"
        aria-labelledby="recent-heading"
      >
        <h2 id="recent-heading" className="font-bold">
          최근 완료량
        </h2>
        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-[var(--ink-soft)]">7일</dt>
            <dd className="mt-1 font-mono text-3xl font-bold">{lastSeven}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--ink-soft)]">30일</dt>
            <dd className="mt-1 font-mono text-3xl font-bold">{lastThirty}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-card p-6" aria-labelledby="help-heading">
        <h2 id="help-heading" className="font-bold">
          도움을 사용한 완료
        </h2>
        <p className="mt-3 font-mono text-3xl font-bold">{helped}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
          정답 보기를 사용한 단계도 완료에 포함하되 별도로 표시합니다.
        </p>
      </section>

      <section
        className="surface-card p-6 md:col-span-2"
        aria-labelledby="week-heading"
      >
        <h2 id="week-heading" className="font-bold">
          최근 7일
        </h2>
        <dl className="mt-5 grid grid-cols-7 gap-2">
          {sevenDays.map((date) => {
            const count = completedDates.filter(
              (completedOn) => completedOn === date,
            ).length;
            return (
              <div
                key={date}
                className="rounded-xl bg-[var(--surface-muted)] px-1 py-3 text-center"
              >
                <dt className="text-[0.68rem] text-[var(--ink-soft)]">
                  {date.slice(5).replace("-", "/")}
                </dt>
                <dd className="mt-2 font-mono text-lg font-bold">{count}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
