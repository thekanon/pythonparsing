export type LessonStage = "title" | "excerpt";

export type CanonicalToken = {
  id: string;
  text: string;
  position: number;
};

export type LessonSource = {
  provider: "BBC" | "Reddit" | "Project Gutenberg" | "fixture";
  label: string;
  url: string;
  publishedAt: string;
  fixture: boolean;
};

export type LessonStageContent = {
  stage: LessonStage;
  english: string;
  korean: string;
  tokens: CanonicalToken[];
};

export type LessonContent = {
  id: string;
  revisionId: string;
  learningDate: string;
  ordinal: number;
  source: LessonSource;
  title: LessonStageContent;
  excerpt: LessonStageContent;
};

export type LessonSummary = {
  id: string;
  revisionId: string;
  learningDate: string;
  ordinal: number;
  englishTitle: string;
  englishExcerpt: string;
  source: LessonSource;
};

export type PublicToken = {
  id: string;
  text: string;
};

export type PublicGrammarGuideStep = {
  role: string;
  englishPhrase: string;
  koreanFunction: string;
  instruction: string;
  tokenIds: string[];
};

export type PublicGrammarGuide = {
  provider: "claude-cli/sonnet" | "codex-cli/gpt-5.6-terra";
  learningMode?: "structure-reasoning";
  structure: string;
  steps: PublicGrammarGuideStep[];
  grammarPoints: Array<{
    expression: string;
    explanation: string;
  }>;
};

export type PublicLessonStage = {
  stage: LessonStage;
  english: string;
  tokens: PublicToken[];
  grammarGuide?: PublicGrammarGuide;
};

export type PublicLesson = {
  id: string;
  revisionId: string;
  learningDate: string;
  ordinal: number;
  source: LessonSource;
  stages: [PublicLessonStage, PublicLessonStage];
};

export type GradeResult = {
  complete: boolean;
  score: number;
  incorrectPositions: number[];
  attemptProof?: string;
  hint?: {
    position: number;
    tokenId: string;
  };
};
