import { getAdminAuditLogs } from "@/server/queries/admin";

export const instant = false;

export default async function AdminAuditPage() {
  const logs = await getAdminAuditLogs();
  return (
    <div>
      <p className="eyebrow">AUDIT</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
        관리자 감사 로그
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[var(--ink-soft)]">
        변경 본문은 저장하지 않고 이전·이후 값의 SHA-256 hash만 1년 동안
        보관합니다.
      </p>
      <div className="surface-card mt-7 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
              {["시각", "작업", "대상", "결과", "이전 hash", "이후 hash"].map(
                (label) => (
                  <th key={label} scope="col" className="px-5 py-4 font-bold">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-[var(--line)] last:border-0"
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  {new Intl.DateTimeFormat("ko-KR", {
                    timeZone: "Asia/Seoul",
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(log.performedAt))}
                </td>
                <th scope="row" className="px-5 py-4 font-bold">
                  {log.action}
                </th>
                <td className="px-5 py-4 font-mono text-xs">
                  {log.targetType}:{log.targetId.slice(0, 12)}
                </td>
                <td className="px-5 py-4">{log.succeeded ? "성공" : "실패"}</td>
                <td className="px-5 py-4 font-mono text-xs">
                  {log.beforeHash?.slice(0, 12) ?? "없음"}
                </td>
                <td className="px-5 py-4 font-mono text-xs">
                  {log.afterHash?.slice(0, 12) ?? "없음"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
