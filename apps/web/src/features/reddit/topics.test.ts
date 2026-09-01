import {
  materializeTopics,
  parseRedditCommunity,
  parseRedditThreadId,
  selectRedditComments,
} from "./topics";

describe("parseRedditCommunity", () => {
  it("accepts only the configured communities, case-insensitively", () => {
    expect(parseRedditCommunity("frontend")?.slug).toBe("Frontend");
    expect(parseRedditCommunity(" ObsidianMD ")?.url).toBe(
      "https://www.reddit.com/r/ObsidianMD/",
    );
    expect(parseRedditCommunity("all")).toBeNull();
  });
});

describe("Reddit topic processing", () => {
  it("accepts Reddit thread URLs and rejects lookalike hosts", () => {
    expect(
      parseRedditThreadId(
        "https://www.reddit.com/r/webdev/comments/1abcde/a_thread/",
      ),
    ).toBe("1abcde");
    expect(parseRedditThreadId("https://redd.it/1abcde")).toBe("1abcde");
    expect(
      parseRedditThreadId(
        "https://reddit.com.example.com/r/webdev/comments/1abcde/test",
      ),
    ).toBeNull();
  });

  it("selects higher-scored comments without exceeding the text budget", () => {
    const selected = selectRedditComments(
      [
        {
          id: "low",
          body: "A lower scored but valid comment.",
          score: 1,
          createdUtc: 1,
        },
        {
          id: "high",
          body: "A higher scored and useful comment.",
          score: 20,
          createdUtc: 2,
        },
        { id: "deleted", body: "[deleted]", score: 100, createdUtc: 3 },
      ],
      2,
      50,
    );

    expect(selected.map((comment) => comment.id)).toEqual(["high"]);
    expect(selected[0]?.index).toBe(0);
  });

  it("deduplicates evidence and keywords before persistence", () => {
    expect(
      materializeTopics({
        topics: [
          {
            title: "반복 토픽",
            summary: "여러 댓글에서 반복해서 등장한 논의를 요약합니다.",
            keywords: ["반복", "토픽", "반복"],
            englishTitle:
              "Teams compare familiar tools for better project work",
            koreanTitleTranslation:
              "팀이 더 나은 프로젝트 작업을 위해 익숙한 도구를 비교한다",
            englishPassage:
              "Teams compare familiar tools for better project work. Familiar tools help teams compare work and make better project choices. Teams keep project work clear with familiar tools.",
            koreanTranslation:
              "개발자들은 프로젝트가 어려워질 때 익숙한 도구로 돌아가곤 합니다. 공유된 경험은 팀을 더 빠르게 만들 수 있지만 더 나은 선택지를 가릴 수도 있습니다. 논의는 확신과 신중한 평가의 균형에 초점을 맞췄습니다.",
            expressions: [
              { phrase: "return to", meaning: "다시 돌아가다" },
              { phrase: "balance A with B", meaning: "A와 B의 균형을 맞추다" },
            ],
            vocabulary: [
              { word: "teams", meaning: "팀들" },
              { word: "compare", meaning: "비교하다" },
              { word: "familiar", meaning: "익숙한" },
              { word: "tools", meaning: "도구들" },
              { word: "for", meaning: "~을 위한" },
              { word: "better", meaning: "더 나은" },
              { word: "project", meaning: "프로젝트" },
              { word: "work", meaning: "작업" },
              { word: "help", meaning: "돕다" },
              { word: "and", meaning: "그리고" },
              { word: "make", meaning: "만들다" },
              { word: "choices", meaning: "선택들" },
              { word: "keep", meaning: "유지하다" },
              { word: "clear", meaning: "명확한" },
              { word: "with", meaning: "~와 함께" },
            ],
            supportingCommentIndexes: [0, 0, 2],
          },
        ],
      }),
    ).toEqual([
      {
        rank: 1,
        title: "반복 토픽",
        summary: "여러 댓글에서 반복해서 등장한 논의를 요약합니다.",
        keywords: ["반복", "토픽"],
        englishTitle: "Teams compare familiar tools for better project work",
        koreanTitleTranslation:
          "팀이 더 나은 프로젝트 작업을 위해 익숙한 도구를 비교한다",
        englishPassage:
          "Teams compare familiar tools for better project work. Familiar tools help teams compare work and make better project choices. Teams keep project work clear with familiar tools.",
        koreanTranslation:
          "개발자들은 프로젝트가 어려워질 때 익숙한 도구로 돌아가곤 합니다. 공유된 경험은 팀을 더 빠르게 만들 수 있지만 더 나은 선택지를 가릴 수도 있습니다. 논의는 확신과 신중한 평가의 균형에 초점을 맞췄습니다.",
        expressions: [
          { phrase: "return to", meaning: "다시 돌아가다" },
          { phrase: "balance A with B", meaning: "A와 B의 균형을 맞추다" },
        ],
        wordMeanings: {
          teams: "팀들",
          compare: "비교하다",
          familiar: "익숙한",
          tools: "도구들",
          for: "~을 위한",
          better: "더 나은",
          project: "프로젝트",
          work: "작업",
          help: "돕다",
          and: "그리고",
          make: "만들다",
          choices: "선택들",
          keep: "유지하다",
          clear: "명확한",
          with: "~와 함께",
        },
        supportingCommentCount: 2,
      },
    ]);
  });
});
