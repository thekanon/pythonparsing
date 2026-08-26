import { QuarantineReviewForm } from "@/components/admin/admin-controls";
import { getAdminQuarantine } from "@/server/queries/admin";

export const instant = false;

export default async function AdminQuarantinePage() {
  const items = await getAdminQuarantine();
  return (
    <div>
      <p className="eyebrow">QUARANTINE</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
        격리 번역 재검수
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[var(--ink-soft)]">
        수정본은 애플리케이션 규칙과 Gemini의 다섯 가지 기준을 모두 다시
        통과해야 새 immutable revision으로 공개됩니다.
      </p>
      {items.length === 0 ? (
        <div className="surface-card mt-7 p-8 text-[var(--ink-soft)]">
          대기 중인 격리 항목이 없습니다.
        </div>
      ) : (
        <div className="mt-7 space-y-6">
          {items.map((item) => (
            <article key={item.itemId} className="surface-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-mono">
                  {item.errorCode ?? "UNKNOWN"}
                </span>
                <span className="text-[var(--ink-soft)]">
                  재시도 {item.retryCount}/3
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold">
                {item.englishTitle ?? "원문 제목 없음"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
                {item.englishExcerpt ?? "원문 발췌 없음"}
              </p>
              <QuarantineReviewForm
                itemId={item.itemId}
                koreanTitle={item.koreanTitle ?? ""}
                koreanExcerpt={item.koreanExcerpt ?? ""}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
