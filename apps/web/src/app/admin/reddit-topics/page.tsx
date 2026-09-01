import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { getAdminRedditTopicRuns } from "@/server/queries/admin";

export const instant = false;

export default async function AdminRedditTopicsPage() {
  const runs = await getAdminRedditTopicRuns();

  return (
    <section aria-labelledby="reddit-topics-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">DAILY REDDIT DIGEST</p>
          <h2
            id="reddit-topics-heading"
            className="mt-2 text-2xl font-bold tracking-[-0.03em]"
          >
            커뮤니티 주요 토픽
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            Frontend, SideProject, ChatGPT, ObsidianMD의 당일 인기 게시물을 하루
            한 번씩 분석합니다. 사용자명과 게시물 원문은 저장하지 않고 집계된
            토픽만 30일간 보관합니다.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="surface-card mt-7 p-7 sm:p-10">
          <h3 className="text-lg font-bold">아직 수집 기록이 없습니다.</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            수집 환경을 설정하면 다음 예약 실행부터 결과가 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="mt-7 grid gap-6">
          {runs.map((run) => (
            <article key={run.id} className="surface-card overflow-hidden">
              <header className="border-b border-[var(--line)] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs font-bold text-[var(--accent)]">
                      {run.collectionDate}
                    </p>
                    <h3 className="mt-2 text-xl font-bold tracking-[-0.025em]">
                      {run.postTitle ?? "스레드 정보를 불러오지 못했습니다"}
                    </h3>
                  </div>
                  <span className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold">
                    {run.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[var(--ink-soft)]">
                  <span>전체 게시물 {run.availableCommentCount}</span>
                  <span>분석 {run.analyzedCommentCount}</span>
                  <span>토픽 {run.topicCount}</span>
                  <a
                    href={run.threadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)]"
                  >
                    Reddit 원문
                    <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
                  </a>
                </div>
                {run.errorCode && (
                  <p className="mt-4 text-sm font-semibold text-[var(--danger)]">
                    {run.errorCode}
                  </p>
                )}
              </header>

              {run.topics.length > 0 && (
                <ol className="divide-y divide-[var(--line)]">
                  {run.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="grid gap-3 p-5 sm:grid-cols-[3rem_1fr] sm:p-6"
                    >
                      <span className="font-mono text-sm font-bold text-[var(--accent)]">
                        {String(topic.rank).padStart(2, "0")}
                      </span>
                      <div>
                        <h4 className="font-bold">{topic.title}</h4>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
                          {topic.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topic.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold"
                            >
                              {keyword}
                            </span>
                          ))}
                          <span className="px-1 py-1 text-xs font-semibold text-[var(--ink-soft)]">
                            근거 게시물 {topic.supportingCommentCount}개
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
