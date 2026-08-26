import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import {
  ReportActions,
  WithdrawRevisionButton,
} from "@/components/admin/admin-controls";
import { getAdminReports } from "@/server/queries/admin";

export const instant = false;

export default async function AdminReportsPage() {
  const reports = await getAdminReports();
  return (
    <div>
      <p className="eyebrow">REPORTS</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">번역 신고</h2>
      <p className="mt-3 max-w-3xl leading-7 text-[var(--ink-soft)]">
        신고는 자동 비공개로 이어지지 않습니다. 원문을 확인한 뒤 처리하거나,
        필요한 경우 콘텐츠를 철회하세요.
      </p>
      {reports.length === 0 ? (
        <div className="surface-card mt-7 p-8 text-[var(--ink-soft)]">
          접수된 신고가 없습니다.
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="surface-card p-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                      {report.type}
                    </span>
                    <span className="rounded-full border border-[var(--line)] px-3 py-1">
                      {report.status}
                    </span>
                    <span className="px-1 py-1 text-[var(--ink-soft)]">
                      {new Intl.DateTimeFormat("ko-KR", {
                        timeZone: "Asia/Seoul",
                        dateStyle: "medium",
                      }).format(new Date(report.createdAt))}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">
                    {report.englishTitle ?? "철회된 콘텐츠"}
                  </h3>
                  <a
                    href={report.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--accent)]"
                  >
                    원문 확인 <ArrowSquareOut aria-hidden="true" size={17} />
                  </a>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <ReportActions
                    reportId={report.id}
                    open={report.status === "open"}
                  />
                  {report.status === "open" && (
                    <WithdrawRevisionButton revisionId={report.revisionId} />
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
