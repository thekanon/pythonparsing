import { describe, expect, it, vi } from "vitest";

import type { SelectedRedditComment } from "@/features/reddit/topics";

import {
  ClaudeCliRedditTopicAdapter,
  ClaudeThenCodexRedditTopicAdapter,
  CodexCliRedditTopicAdapter,
  createSafeCliEnvironment,
  type RedditTopicSummarizer,
} from "./reddit-topics";

const comments: SelectedRedditComment[] = [
  {
    id: "post-1",
    index: 0,
    body: "React state management choices are being discussed.",
    score: 12,
    createdUtc: 1,
  },
];

const summary = {
  topics: [
    {
      title: "상태 관리 선택",
      summary:
        "프론트엔드 상태 관리 도구를 선택하는 기준과 경험을 공유했습니다.",
      keywords: ["React", "상태 관리"],
      englishTitle: "How teams choose state management tools",
      koreanTitleTranslation: "팀이 상태 관리 도구를 선택하는 방법",
      englishPassage:
        "Frontend teams compare state management tools by looking at project size, developer experience, and maintenance costs. A familiar library can speed up early work, while a simpler approach may reduce complexity over time. The best choice depends on the team's actual needs.",
      koreanTranslation:
        "프론트엔드 팀은 프로젝트 규모, 개발자 경험, 유지보수 비용을 살펴보며 상태 관리 도구를 비교합니다. 익숙한 라이브러리는 초기 작업 속도를 높일 수 있지만 더 단순한 접근법은 장기적으로 복잡성을 줄일 수 있습니다. 가장 좋은 선택은 팀의 실제 필요에 달려 있습니다.",
      expressions: [
        { phrase: "speed up", meaning: "속도를 높이다" },
        { phrase: "depend on", meaning: "~에 달려 있다" },
      ],
      vocabulary: [
        { word: "frontend", meaning: "프론트엔드" },
        { word: "teams", meaning: "팀들" },
        { word: "compare", meaning: "비교하다" },
        { word: "state", meaning: "상태" },
        { word: "management", meaning: "관리" },
        { word: "tools", meaning: "도구들" },
        { word: "by", meaning: "~함으로써" },
        { word: "looking", meaning: "살펴보는" },
        { word: "at", meaning: "~을" },
        { word: "project", meaning: "프로젝트" },
      ],
      supportingCommentIndexes: [0],
    },
  ],
};

describe("local Reddit topic CLI adapters", () => {
  it("passes only allowlisted environment values to local CLIs", () => {
    const environment = createSafeCliEnvironment({
      NODE_ENV: "production",
      HOME: "/home/test",
      PATH: "/usr/bin",
      CRON_SECRET: "must-not-leak",
      DATABASE_URL: "must-not-leak",
    });

    expect(environment).toMatchObject({
      NODE_ENV: "production",
      HOME: "/home/test",
      PATH: "/usr/bin",
      CI: "1",
    });
    expect(environment.CRON_SECRET).toBeUndefined();
    expect(environment.DATABASE_URL).toBeUndefined();
  });

  it("runs Claude without tools or session persistence", async () => {
    const runner = vi.fn(async (invocation) => {
      expect(invocation.args).toContain("--safe-mode");
      expect(invocation.args).toContain("--no-session-persistence");
      expect(invocation.args).toContain("--json-schema");
      const toolsIndex = invocation.args.indexOf("--tools");
      expect(invocation.args[toolsIndex + 1]).toBe("");
      expect(invocation.input).toContain("<untrusted_reddit_data>");
      expect(invocation.args.join(" ")).toContain("koreanTitleTranslation");
      return JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
        structured_output: summary,
      });
    });
    const adapter = new ClaudeCliRedditTopicAdapter(
      "claude",
      "sonnet",
      30_000,
      runner,
    );

    await expect(adapter.summarize("r/Frontend", comments)).resolves.toEqual(
      summary,
    );
  });

  it("runs Codex ephemerally in a read-only sandbox", async () => {
    const runner = vi.fn(async (invocation) => {
      expect(invocation.args).toContain("--ephemeral");
      expect(invocation.args).toContain("--ignore-user-config");
      expect(invocation.args).toContain("--ignore-rules");
      expect(invocation.args).toContain("read-only");
      expect(invocation.args).toContain("gpt-5.6-terra");
      expect(invocation.input).toContain(
        "complete, faithful Korean translation of englishTitle",
      );
      return JSON.stringify(summary);
    });
    const adapter = new CodexCliRedditTopicAdapter(
      "codex",
      "gpt-5.6-terra",
      30_000,
      runner,
    );

    await expect(adapter.summarize("r/Frontend", comments)).resolves.toEqual(
      summary,
    );
  });

  it("falls back to Codex only when Claude reports a usage limit", async () => {
    const primary: RedditTopicSummarizer = {
      model: "claude-cli/sonnet",
      summarize: vi.fn().mockRejectedValue(new Error("CLAUDE_CLI_USAGE_LIMIT")),
    };
    const fallback: RedditTopicSummarizer = {
      model: "codex-cli/gpt-5.6-terra",
      summarize: vi.fn().mockResolvedValue(summary),
    };
    const adapter = new ClaudeThenCodexRedditTopicAdapter(primary, fallback);

    await expect(adapter.summarize("r/Frontend", comments)).resolves.toEqual(
      summary,
    );
    expect(fallback.summarize).toHaveBeenCalledOnce();
    expect(adapter.model).toBe("codex-cli/gpt-5.6-terra");
  });

  it("recognizes a successful-exit Claude usage-limit envelope", async () => {
    const primary = new ClaudeCliRedditTopicAdapter(
      "claude",
      "sonnet",
      30_000,
      vi.fn().mockResolvedValue(
        JSON.stringify({
          type: "result",
          subtype: "success",
          is_error: false,
          result: "Usage limit reached. Resets at 3 PM.",
        }),
      ),
    );
    const fallback: RedditTopicSummarizer = {
      model: "codex-cli/gpt-5.6-terra",
      summarize: vi.fn().mockResolvedValue(summary),
    };
    const adapter = new ClaudeThenCodexRedditTopicAdapter(primary, fallback);

    await expect(adapter.summarize("r/Frontend", comments)).resolves.toEqual(
      summary,
    );
    expect(fallback.summarize).toHaveBeenCalledOnce();
  });

  it("does not hide ordinary Claude failures behind the fallback", async () => {
    const primary: RedditTopicSummarizer = {
      model: "claude-cli/sonnet",
      summarize: vi.fn().mockRejectedValue(new Error("CLAUDE_CLI_FAILED")),
    };
    const fallback: RedditTopicSummarizer = {
      model: "codex-cli/gpt-5.6-terra",
      summarize: vi.fn().mockResolvedValue(summary),
    };
    const adapter = new ClaudeThenCodexRedditTopicAdapter(primary, fallback);

    await expect(adapter.summarize("r/Frontend", comments)).rejects.toThrow(
      "CLAUDE_CLI_FAILED",
    );
    expect(fallback.summarize).not.toHaveBeenCalled();
  });
});
