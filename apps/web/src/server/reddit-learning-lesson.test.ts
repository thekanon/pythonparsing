import type { PublicRedditLearningLesson } from "@/server/queries/reddit-learning";

import {
  createRedditCanonicalLesson,
  firstSentence,
  toPublicRedditLesson,
} from "./reddit-learning-lesson";

const redditLesson: PublicRedditLearningLesson = {
  collectionDate: "2026-08-27",
  community: "Frontend",
  sourceUrl: "https://www.reddit.com/r/Frontend/",
  position: 1,
  total: 2,
  previousTopicId: null,
  nextTopicId: "topic-2",
  topic: {
    id: "topic-1",
    rank: 1,
    koreanTitle: "짧은 학습과 빠른 피드백",
    koreanSummary: "학습 방법을 다룬 토픽입니다.",
    keywords: ["learning"],
    englishTitle: "Short lessons make feedback useful",
    koreanTitleTranslation: "짧은 수업은 피드백을 유용하게 만든다",
    englishPassage:
      "Learners stay focused with one clear goal. Feedback becomes easier to apply.",
    koreanTranslation:
      "학습자는 하나의 분명한 목표로 집중합니다. 피드백을 적용하기도 쉬워집니다.",
    expressions: [],
    wordMeanings: {},
    supportingPostCount: 10,
  },
};

describe("Reddit word-order lesson", () => {
  it("uses the title and only the first passage sentence", () => {
    const lesson = createRedditCanonicalLesson(redditLesson);

    expect(firstSentence("First sentence. Second sentence.")).toBe(
      "First sentence.",
    );
    expect(lesson.excerpt.english).toBe(
      "Learners stay focused with one clear goal.",
    );
    expect(lesson.excerpt.korean).toBe(
      "학습자는 하나의 분명한 목표로 집중합니다.",
    );
    expect(lesson.title.tokens.map((token) => token.text)).toEqual([
      "짧은",
      "수업은",
      "피드백을",
      "유용하게",
      "만든다",
    ]);
    expect(lesson.excerpt.tokens[0]?.id).toBe("reddit-topic-1-excerpt-0");
  });

  it("publishes shuffled tokens without exposing the Korean answer", () => {
    const canonical = createRedditCanonicalLesson(redditLesson);
    const publicLesson = toPublicRedditLesson(canonical);

    expect(publicLesson.source.provider).toBe("Reddit");
    expect(publicLesson.stages).toHaveLength(2);
    expect(publicLesson.stages[0]).not.toHaveProperty("korean");
    expect(publicLesson.stages[0].tokens).toHaveLength(5);
  });
});
