"use client";

import {
  CheckCircle,
  Power,
  ShieldCheck,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  AUTHENTICATION_REQUIRED: "로그인이 필요합니다.",
  FIXTURE_READ_ONLY: "fixture 환경에서는 운영 데이터를 변경할 수 없습니다.",
  VERIFICATION_REJECTED:
    "Gemini 재검수를 통과하지 못했습니다. 번역을 다시 확인해 주세요.",
  DAILY_LESSON_FULL: "해당 날짜에는 이미 10개 레슨이 공개되어 있습니다.",
  CANNOT_DEMOTE_SELF: "현재 로그인한 관리자 계정은 직접 강등할 수 없습니다.",
  LAST_ADMIN_REQUIRED: "최소 한 명의 관리자가 남아 있어야 합니다.",
  REPORT_ALREADY_HANDLED: "이미 처리된 신고입니다.",
};

async function mutate(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      ERROR_MESSAGES[result.error ?? ""] ?? "작업을 완료하지 못했습니다.",
    );
  }
  return result;
}

function StatusMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-sm leading-6" role="status">
      {message}
    </p>
  );
}

export function SourceToggle({
  enabled,
  readOnly = false,
}: {
  enabled: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    const nextEnabled = !enabled;
    if (
      !nextEnabled &&
      !window.confirm("BBC 공개 콘텐츠를 즉시 숨기고 새 수집을 중단할까요?")
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await mutate("/api/admin/source", {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      setMessage(
        nextEnabled
          ? "BBC 공급원을 다시 활성화했습니다."
          : "BBC 공급원을 중단했습니다.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "작업을 완료하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={`button ${enabled ? "button-secondary" : "button-primary"}`}
        onClick={toggle}
        disabled={busy || readOnly}
      >
        <Power aria-hidden="true" size={18} weight="bold" />
        {enabled ? "공급원 즉시 중단" : "공급원 다시 활성화"}
      </button>
      <StatusMessage message={message} />
    </div>
  );
}

export function ReportActions({
  reportId,
  open,
}: {
  reportId: string;
  open: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handle(status: "resolved" | "dismissed") {
    setBusy(true);
    setMessage(null);
    try {
      await mutate(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(
        status === "resolved" ? "해결 처리했습니다." : "기각 처리했습니다.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "작업을 완료하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return <span className="text-sm text-[var(--ink-soft)]">처리 완료</span>;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button button-primary text-sm"
          disabled={busy}
          onClick={() => void handle("resolved")}
        >
          <CheckCircle aria-hidden="true" size={17} weight="bold" />
          해결
        </button>
        <button
          type="button"
          className="button button-secondary text-sm"
          disabled={busy}
          onClick={() => void handle("dismissed")}
        >
          <XCircle aria-hidden="true" size={17} weight="bold" />
          기각
        </button>
      </div>
      <StatusMessage message={message} />
    </div>
  );
}

export function WithdrawRevisionButton({ revisionId }: { revisionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function withdraw() {
    if (
      !window.confirm(
        "영문·한국어 콘텐츠와 토큰을 삭제하고 이 기사를 공개 목록에서 철회할까요? 이 작업은 되돌릴 수 없습니다.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await mutate(`/api/admin/revisions/${revisionId}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
      });
      setMessage("revision을 철회하고 공개 캐시를 갱신했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "철회하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="button border border-[var(--ink)] bg-[var(--ink)] text-sm text-[var(--canvas)]"
        disabled={busy}
        onClick={withdraw}
      >
        <Trash aria-hidden="true" size={17} weight="bold" />
        콘텐츠 철회
      </button>
      <StatusMessage message={message} />
    </div>
  );
}

export function QuarantineReviewForm({
  itemId,
  koreanTitle,
  koreanExcerpt,
}: {
  itemId: string;
  koreanTitle: string;
  koreanExcerpt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("Gemini가 수정된 번역을 재검수하고 있습니다.");
    try {
      await mutate(`/api/admin/quarantine/${itemId}`, {
        method: "POST",
        body: JSON.stringify({
          koreanTitle: form.get("koreanTitle"),
          koreanExcerpt: form.get("koreanExcerpt"),
        }),
      });
      setMessage("재검수를 통과해 새 revision으로 공개했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "재검수하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-bold">
        한국어 제목
        <textarea
          name="koreanTitle"
          defaultValue={koreanTitle}
          required
          rows={2}
          maxLength={500}
          className="mt-2 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 leading-6 font-normal"
        />
      </label>
      <label className="block text-sm font-bold">
        한국어 발췌
        <textarea
          name="koreanExcerpt"
          defaultValue={koreanExcerpt}
          required
          rows={4}
          maxLength={1000}
          className="mt-2 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 leading-6 font-normal"
        />
      </label>
      <button type="submit" className="button button-primary" disabled={busy}>
        <ShieldCheck aria-hidden="true" size={18} weight="bold" />
        수정본 재검수 후 공개
      </button>
      <StatusMessage message={message} />
    </form>
  );
}

export function RoleControl({
  userId,
  role,
  currentUserId,
  readOnly = false,
}: {
  userId: string;
  role: string;
  currentUserId: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = role.split(",").includes("admin");
  const nextRole = isAdmin ? "user" : "admin";

  async function changeRole() {
    if (
      !window.confirm(
        `${isAdmin ? "일반 사용자" : "관리자"} 역할로 변경할까요?`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      await mutate(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      setMessage("역할을 변경했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "역할을 변경하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="button button-secondary text-sm"
        disabled={busy || readOnly || (isAdmin && userId === currentUserId)}
        onClick={changeRole}
      >
        {isAdmin ? "일반 사용자로 변경" : "관리자로 승격"}
      </button>
      <StatusMessage message={message} />
    </div>
  );
}
