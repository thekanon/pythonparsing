import { getAdminIngestionRuns } from "@/server/queries/admin";

export const instant = false;

export default async function AdminIngestionPage() {
  const runs = await getAdminIngestionRuns();
  return (
    <div>
      <p className="eyebrow">INGESTION</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
        최근 30회 수집
      </h2>
      <p className="mt-3 max-w-2xl leading-7 text-[var(--ink-soft)]">
        오류 코드는 정규화된 값만 보관하며 기사·번역 전문이나 자격증명은 로그에
        남기지 않습니다.
      </p>
      <div className="surface-card mt-7 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
              {[
                "학습일",
                "상태",
                "발견",
                "번역",
                "합격",
                "격리",
                "공개",
                "경고",
              ].map((label) => (
                <th key={label} scope="col" className="px-5 py-4 font-bold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="border-b border-[var(--line)] last:border-0"
              >
                <th scope="row" className="px-5 py-4 font-bold">
                  {run.learningDate}
                </th>
                <td className="px-5 py-4">{run.status}</td>
                <td className="px-5 py-4 tabular-nums">
                  {run.discoveredCount}
                </td>
                <td className="px-5 py-4 tabular-nums">
                  {run.translatedCount}
                </td>
                <td className="px-5 py-4 tabular-nums">{run.approvedCount}</td>
                <td className="px-5 py-4 tabular-nums">
                  {run.quarantinedCount}
                </td>
                <td className="px-5 py-4 tabular-nums">{run.publishedCount}</td>
                <td className="px-5 py-4 font-mono text-xs">
                  {run.warningCode ?? "없음"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
