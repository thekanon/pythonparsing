"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="page-shell min-h-[100dvh] content-center">
          <h1 className="page-title">페이지를 불러오지 못했습니다.</h1>
          <p className="lede mt-5">
            잠시 뒤 다시 시도해 주세요. 입력한 어절 순서는 저장되지 않았습니다.
          </p>
          <button
            type="button"
            onClick={reset}
            className="button button-primary mt-8"
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
