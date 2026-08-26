"use client";

import { Flag } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

const reportTypes = [
  ["inaccurate", "의미가 정확하지 않음"],
  ["unnatural", "한국어가 자연스럽지 않음"],
  ["incomplete", "번역 내용이 빠짐"],
  ["unsafe", "학습에 부적절한 표현"],
] as const;

export function ReportTranslation({
  revisionId,
  fixture,
}: {
  revisionId: string;
  fixture: boolean;
}) {
  const [type, setType] =
    useState<(typeof reportTypes)[number][0]>("inaccurate");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "login" | "error"
  >("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, type }),
      });
      if (response.status === 401) {
        setStatus("login");
        return;
      }
      if (!response.ok && response.status !== 409)
        throw new Error("REPORT_FAILED");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (fixture) {
    return (
      <p className="text-sm text-[var(--ink-soft)]">
        개발용 예시 콘텐츠는 번역 신고를 받지 않습니다.
      </p>
    );
  }

  return (
    <details className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface)] p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold [&::-webkit-details-marker]:hidden">
        <Flag aria-hidden="true" size={18} weight="bold" />
        번역 문제 신고
      </summary>
      <form
        onSubmit={submit}
        className="mt-4 border-t border-[var(--line)] pt-4"
      >
        <fieldset>
          <legend className="text-sm font-bold">문제 유형</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {reportTypes.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm"
              >
                <input
                  type="radio"
                  name="report-type"
                  value={value}
                  checked={type === value}
                  onChange={() => setType(value)}
                  className="size-4 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="button button-secondary mt-4 text-sm"
        >
          {status === "sending"
            ? "보내는 중"
            : status === "sent"
              ? "신고 접수됨"
              : "신고 보내기"}
        </button>
        {status === "login" && (
          <p className="mt-3 text-sm leading-6" role="status">
            신고는 로그인 후 보낼 수 있습니다.{" "}
            <Link href="/settings">로그인하기</Link>
          </p>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm leading-6" role="alert">
            신고를 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
        {status === "sent" && (
          <p
            className="mt-3 text-sm leading-6 text-[var(--ink-soft)]"
            role="status"
          >
            신고가 자동 비공개로 이어지지는 않으며 정해진 처리 시간은 없습니다.
          </p>
        )}
      </form>
    </details>
  );
}
