"use client";

import { GoogleLogo, SignOut, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  clearAnonymousProgress,
  getAnonymousProgressSnapshot,
  replaceAnonymousProgress,
} from "@/features/progress/storage";
import type { AnonymousProgress } from "@/features/progress/types";

export function AccountPanel() {
  const { data: session, isPending } = authClient.useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const mergeId = useRef<string | null>(null);
  const mergedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user.id || mergedForUser.current === session.user.id) return;
    mergedForUser.current = session.user.id;
    mergeId.current ??= crypto.randomUUID();

    const merge = async () => {
      try {
        const response = await fetch("/api/progress/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyId: mergeId.current,
            progress: getAnonymousProgressSnapshot(),
          }),
        });
        if (!response.ok) throw new Error("MERGE_FAILED");
        replaceAnonymousProgress((await response.json()) as AnonymousProgress);
        setMessage("이 브라우저의 진도를 계정 진도와 합쳤습니다.");
      } catch {
        mergedForUser.current = null;
        setMessage("진도를 동기화하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      }
    };

    void merge();
  }, [session?.user.id]);

  async function signIn() {
    setBusy(true);
    setMessage(null);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/settings",
    });
    if (result.error) {
      setMessage(
        "Google 로그인을 시작하지 못했습니다. 인증 설정을 확인해 주세요.",
      );
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    setMessage("로그아웃했습니다. 브라우저에 저장된 익명 진도는 유지됩니다.");
    setBusy(false);
  }

  async function deleteAccount() {
    if (!deleteConfirmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) throw new Error("DELETE_FAILED");
      clearAnonymousProgress();
      await authClient.signOut();
      setMessage("계정과 이 브라우저의 익명 진도를 삭제했습니다.");
      setDeleteConfirmed(false);
    } catch {
      setMessage("계정을 삭제하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <div className="surface-card p-6" aria-busy="true">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton mt-4 h-11 w-36" />
        <span className="sr-only">로그인 상태를 확인하고 있습니다.</span>
      </div>
    );
  }

  return (
    <section
      className="surface-card p-6 sm:p-8"
      aria-labelledby="account-heading"
    >
      <h2 id="account-heading" className="text-xl font-bold">
        계정과 동기화
      </h2>
      {session ? (
        <>
          <div className="mt-5 rounded-[1rem] bg-[var(--surface-muted)] p-4">
            <p className="font-bold">{session.user.name}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {session.user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="button button-secondary mt-5"
          >
            <SignOut aria-hidden="true" size={18} weight="bold" />
            로그아웃
          </button>

          <div className="mt-8 border-t border-[var(--line)] pt-6">
            <h3 className="font-bold">계정 삭제</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              운영 DB의 계정, OAuth 연결, 진도는 즉시 삭제됩니다. 암호화
              백업에서는 최대 30일 뒤 사라집니다.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] p-3 text-sm leading-6">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(event) => setDeleteConfirmed(event.target.checked)}
                className="mt-1 size-4 accent-[var(--accent)]"
              />
              계정과 현재 브라우저의 익명 진도를 모두 삭제하는 데 동의합니다.
            </label>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busy || !deleteConfirmed}
              className="button mt-4 border border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]"
            >
              <Trash aria-hidden="true" size={18} weight="bold" />
              계정 삭제
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-xl leading-7 text-[var(--ink-soft)]">
            학습 시작에는 로그인이 필요하지 않습니다. Google 로그인은 여러
            기기에서 진도를 이어갈 때만 사용합니다.
          </p>
          <button
            type="button"
            onClick={signIn}
            disabled={busy}
            className="button button-primary mt-6"
          >
            <GoogleLogo aria-hidden="true" size={19} weight="bold" />
            Google로 동기화
          </button>
        </>
      )}
      {message && (
        <p className="mt-5 text-sm leading-6" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

export function FixtureAccountPanel() {
  const [cleared, setCleared] = useState(false);

  return (
    <section
      className="surface-card p-6 sm:p-8"
      aria-labelledby="fixture-account-heading"
    >
      <h2 id="fixture-account-heading" className="text-xl font-bold">
        로컬 익명 모드
      </h2>
      <p className="mt-3 leading-7 text-[var(--ink-soft)]">
        인증 환경변수가 없어 Google 로그인과 서버 동기화가 꺼져 있습니다. 학습
        진도는 이 브라우저에만 저장됩니다.
      </p>
      <button
        type="button"
        className="button button-secondary mt-6"
        onClick={() => {
          clearAnonymousProgress();
          setCleared(true);
        }}
      >
        <Trash aria-hidden="true" size={18} weight="bold" />
        브라우저 진도 삭제
      </button>
      {cleared && (
        <p className="mt-4 text-sm" role="status">
          이 브라우저의 익명 진도를 삭제했습니다.
        </p>
      )}
    </section>
  );
}
