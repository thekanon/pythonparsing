import Link from "next/link";

import { SourceToggle } from "@/components/admin/admin-controls";
import { getAdminOverview } from "@/server/queries/admin";

export const instant = false;

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  const statusItems = [
    {
      label: "격리 대기",
      value: overview.quarantineCount,
      href: "/admin/quarantine",
    },
    {
      label: "열린 신고",
      value: overview.openReportCount,
      href: "/admin/reports",
    },
    {
      label: "최근 공개",
      value: overview.lastRun?.publishedCount ?? 0,
      href: "/admin/ingestion",
    },
  ];

  return (
    <div>
      {overview.fixture && (
        <p className="fixture-banner mb-6">
          fixture 미리보기입니다. NEWSORDER_DEV_ADMIN=true로 화면을 볼 수 있지만
          변경 작업은 비활성화됩니다.
        </p>
      )}
      <section aria-labelledby="status-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">DAILY CONTROL</p>
            <h2
              id="status-heading"
              className="mt-2 text-2xl font-bold tracking-[-0.03em]"
            >
              오늘 운영 상태
            </h2>
          </div>
          <span
            className={`w-fit rounded-full border px-3 py-1 text-sm font-bold ${
              overview.sourceEnabled
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]"
            }`}
          >
            BBC {overview.sourceEnabled ? "활성" : "중단"}
          </span>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-[1.125rem] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {statusItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="bg-[var(--surface-raised)] p-6 no-underline hover:bg-[var(--surface-muted)]"
            >
              <span className="text-sm font-bold text-[var(--ink-soft)]">
                {item.label}
              </span>
              <strong className="mt-3 block text-4xl tracking-[-0.05em]">
                {item.value}
              </strong>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section
          className="surface-card p-6 sm:p-8"
          aria-labelledby="runs-heading"
        >
          <h2 id="runs-heading" className="text-xl font-bold">
            최근 자동 작업
          </h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-[var(--ink-soft)]">
                콘텐츠 수집
              </dt>
              <dd className="mt-1 text-lg font-bold">
                {overview.lastRun?.status ?? "기록 없음"}
              </dd>
              {overview.lastRun && (
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {overview.lastRun.learningDate} ·{" "}
                  {overview.lastRun.publishedCount}건 공개
                </p>
              )}
            </div>
            <div>
              <dt className="text-sm font-bold text-[var(--ink-soft)]">
                사용자 백업
              </dt>
              <dd className="mt-1 text-lg font-bold">
                {overview.lastBackup?.status ?? "기록 없음"}
              </dd>
              {overview.lastBackup?.errorCode && (
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {overview.lastBackup.errorCode}
                </p>
              )}
            </div>
          </dl>
        </section>
        <section
          className="surface-card p-6 sm:p-8"
          aria-labelledby="source-heading"
        >
          <h2 id="source-heading" className="text-xl font-bold">
            비상 공급 중단
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            중단하면 수집을 멈추고 캐시된 BBC 레슨까지 즉시 공개 화면에서
            숨깁니다. 원문 URL과 진도 tombstone은 유지합니다.
          </p>
          <div className="mt-5">
            <SourceToggle
              enabled={overview.sourceEnabled}
              readOnly={overview.fixture}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
