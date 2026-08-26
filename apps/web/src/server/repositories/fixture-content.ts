import "server-only";

import type {
  LessonContent,
  LessonStage,
  LessonSummary,
} from "@/features/lessons/types";
import { tokenizeKorean } from "@/features/lessons/tokenize";
import { getRecentIsoDates, isIsoDate } from "@/server/domain/date";

type FixtureArticle = {
  englishTitle: string;
  englishExcerpt: string;
  koreanTitle: string;
  koreanExcerpt: string;
};

const FIXTURE_ARTICLES: readonly FixtureArticle[] = [
  {
    englishTitle: "Coastal towns test new flood warning systems",
    englishExcerpt:
      "Residents joined an early morning drill designed to test faster alerts before seasonal storms reach the coast.",
    koreanTitle: "해안 도시들이 새로운 홍수 경보 시스템을 시험한다",
    koreanExcerpt:
      "주민들은 계절성 폭풍이 해안에 도달하기 전 더 빠른 경보를 시험하는 이른 아침 훈련에 참여했다.",
  },
  {
    englishTitle: "City libraries extend evening study hours",
    englishExcerpt:
      "The pilot programme will keep five neighbourhood libraries open later during the autumn exam period.",
    koreanTitle: "도시 도서관들이 저녁 학습 시간을 연장한다",
    koreanExcerpt:
      "시범 프로그램은 가을 시험 기간 동안 다섯 곳의 지역 도서관을 더 늦게까지 운영한다.",
  },
  {
    englishTitle: "Researchers map a quieter route for night trains",
    englishExcerpt:
      "A new timetable aims to reduce noise near homes while keeping overnight freight services on schedule.",
    koreanTitle: "연구진이 야간 열차를 위한 더 조용한 경로를 설계한다",
    koreanExcerpt:
      "새 시간표는 야간 화물 운송 일정을 지키면서 주택가 주변 소음을 줄이는 것을 목표로 한다.",
  },
  {
    englishTitle: "Community kitchens turn surplus food into school meals",
    englishExcerpt:
      "Volunteers are working with local shops to prepare fresh lunches from ingredients that would otherwise go unused.",
    koreanTitle: "공동체 주방이 남는 식재료를 학교 급식으로 바꾼다",
    koreanExcerpt:
      "자원봉사자들은 쓰이지 않을 식재료로 신선한 점심을 준비하기 위해 지역 상점들과 협력하고 있다.",
  },
  {
    englishTitle: "Young musicians restore forgotten folk songs",
    englishExcerpt:
      "Students recorded older residents singing melodies that had not been performed publicly for decades.",
    koreanTitle: "젊은 음악가들이 잊힌 민요를 되살린다",
    koreanExcerpt:
      "학생들은 수십 년 동안 공개적으로 연주되지 않았던 선율을 부르는 노년 주민들을 녹음했다.",
  },
  {
    englishTitle: "Farmers share water data during a dry summer",
    englishExcerpt:
      "Sensors across the valley help growers decide when crops need water and when irrigation can safely wait.",
    koreanTitle: "농부들이 건조한 여름에 물 데이터를 공유한다",
    koreanExcerpt:
      "계곡 전역의 센서는 농작물에 물이 필요한 때와 관개를 미뤄도 되는 때를 재배자들이 판단하도록 돕는다.",
  },
  {
    englishTitle: "Museum opens a repair studio to the public",
    englishExcerpt:
      "Visitors can now watch conservators clean paintings and learn why some marks are deliberately left untouched.",
    koreanTitle: "박물관이 복원 작업실을 대중에게 공개한다",
    koreanExcerpt:
      "방문객들은 이제 보존 전문가들이 그림을 닦는 모습을 보고 일부 흔적을 의도적으로 남기는 이유를 배울 수 있다.",
  },
  {
    englishTitle: "New footpaths reconnect villages across the hills",
    englishExcerpt:
      "Local groups cleared historic walking routes and added signs to make the network easier for visitors to follow.",
    koreanTitle: "새 산책로가 언덕 너머 마을들을 다시 연결한다",
    koreanExcerpt:
      "지역 단체들은 오래된 도보 경로를 정비하고 방문객이 길을 쉽게 찾도록 표지판을 추가했다.",
  },
  {
    englishTitle: "Small theatre brings captioned shows to rural audiences",
    englishExcerpt:
      "A touring company has introduced live captions so more people can follow performances in community halls.",
    koreanTitle: "소규모 극단이 농촌 관객에게 자막 공연을 선보인다",
    koreanExcerpt:
      "순회 극단은 더 많은 사람이 마을 회관 공연을 이해할 수 있도록 실시간 자막을 도입했다.",
  },
  {
    englishTitle: "Students build low-cost sensors for cleaner rivers",
    englishExcerpt:
      "The classroom project measures water quality and sends simple weekly reports to conservation volunteers.",
    koreanTitle: "학생들이 더 깨끗한 강을 위한 저비용 센서를 만든다",
    koreanExcerpt:
      "교실 프로젝트는 수질을 측정하고 보전 활동 자원봉사자들에게 간단한 주간 보고서를 보낸다.",
  },
];

function stageTokens(lessonId: string, stage: LessonStage, korean: string) {
  return tokenizeKorean(
    korean,
    (position) => `${lessonId}-${stage}-${position}`,
  );
}

export function buildFixtureLessons(date: string): LessonContent[] {
  if (!isIsoDate(date)) return [];

  return FIXTURE_ARTICLES.map((article, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    const id = `${date}-fixture-${suffix}`;
    const revisionId = `${id}-revision`;

    return {
      id,
      revisionId,
      learningDate: date,
      ordinal: index + 1,
      source: {
        provider: "fixture",
        label: "개발용 예시 콘텐츠",
        url: "https://www.bbc.com/news",
        publishedAt: `${date}T06:00:00+09:00`,
        fixture: true,
      },
      title: {
        stage: "title",
        english: article.englishTitle,
        korean: article.koreanTitle,
        tokens: stageTokens(id, "title", article.koreanTitle),
      },
      excerpt: {
        stage: "excerpt",
        english: article.englishExcerpt,
        korean: article.koreanExcerpt,
        tokens: stageTokens(id, "excerpt", article.koreanExcerpt),
      },
    };
  });
}

export function listFixtureLessons(date: string): LessonSummary[] {
  return buildFixtureLessons(date).map((lesson) => ({
    id: lesson.id,
    revisionId: lesson.revisionId,
    learningDate: lesson.learningDate,
    ordinal: lesson.ordinal,
    englishTitle: lesson.title.english,
    englishExcerpt: lesson.excerpt.english,
    source: lesson.source,
  }));
}

export function findFixtureLesson(lessonId: string): LessonContent | null {
  const date = lessonId.slice(0, 10);
  return (
    buildFixtureLessons(date).find((lesson) => lesson.id === lessonId) ?? null
  );
}

export function listFixtureArchiveDates(): string[] {
  return getRecentIsoDates(7);
}
