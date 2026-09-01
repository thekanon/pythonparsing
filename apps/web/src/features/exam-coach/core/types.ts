export const OFFICIAL_DOMAIN_IDS = [
  "requirements",
  "data-io",
  "integration",
  "server-programming",
  "interface",
  "screen-design",
  "application-testing",
  "sql",
  "software-security",
  "programming-language",
  "sw-foundation",
  "product-packaging",
] as const;

export const KNOWLEDGE_TYPES = [
  "definition",
  "comparison",
  "procedure",
  "code",
  "sql",
  "case",
  "assessment",
] as const;

export const REVIEW_STATUSES = [
  "draft",
  "reviewed",
  "suspended",
  "retired",
] as const;

export const LEARNING_MODES = [
  "understanding",
  "recall",
  "application",
  "assessment",
] as const;

export const FSRS_RATINGS = ["Again", "Hard", "Good", "Easy"] as const;

export type OfficialDomainId = (typeof OFFICIAL_DOMAIN_IDS)[number];
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type LearningMode = (typeof LEARNING_MODES)[number];
export type FsrsRating = (typeof FSRS_RATINGS)[number];

export interface OfficialScopeSource {
  id: "qnet-information-processing-2026";
  authority: "한국산업인력공단 Q-Net";
  title: string;
  url: string;
  validFrom: "2026-01-01";
  validTo: "2026-12-31";
  checkedAt: "2026-09-02";
  basis: "출제경향 및 2026 출제기준";
}

export interface OfficialObjective {
  id: OfficialDomainId;
  year: number;
  order: number;
  nameKo: string;
  sourceId: OfficialScopeSource["id"];
  detailTopics: readonly string[];
}

export interface ConceptNode {
  id: string;
  domainId: OfficialDomainId;
  title: string;
  prerequisites: readonly string[];
}

export interface AssessmentMetadata {
  setId: string;
  pairId: string;
  form: "baseline" | "followup";
}

export interface DiagnosticAssessmentSet {
  schemaVersion: 1;
  id: string;
  form: AssessmentMetadata["form"];
  estimatedMinutes: number;
  items: readonly ContentItem[];
}

export interface ContentRights {
  source: string;
  license: string;
  notes: string;
}

export interface ContentItem {
  schemaVersion: 1;
  id: string;
  version: number;
  officialYear: number;
  domainId: OfficialDomainId;
  conceptIds: readonly string[];
  prerequisites: readonly string[];
  objective: string;
  knowledgeType: KnowledgeType;
  prompt: string;
  answer: string;
  explanation: string;
  grading: Record<string, readonly string[]>;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  author: string;
  reviewer: string | null;
  reviewStatus: ReviewStatus;
  rights: ContentRights;
  changeReason: string;
  memoryInheritance: "inherit" | "reset" | "undecided";
  assessment?: AssessmentMetadata;
}

export interface LearningEvent {
  eventId: string;
  occurredAt: string;
  learnerId: string;
  contentId: string;
  contentVersion: number;
  cardId: string;
  correct: boolean;
  rating: FsrsRating;
  responseTimeMs: number;
  helpLevel: 0 | 1 | 2 | 3 | 4;
  mode: LearningMode;
  firstSubmission: boolean;
  fsrsVersion: string;
}
